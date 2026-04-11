from django.db import models
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import ApprovalRequest, Evidence, Finding, RemediationAction
from .serializers import (
    ApprovalRequestSerializer,
    EvidenceSerializer,
    FindingListSerializer,
    FindingSerializer,
    RemediationActionSerializer,
)


class FindingListCreateView(generics.ListCreateAPIView):
    filterset_fields = ["severity", "status", "finding_type", "owner", "engagement"]
    search_fields = ["title", "description", "root_cause"]
    ordering_fields = ["severity", "status", "due_date", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return FindingListSerializer
        return FindingSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        qs = Finding.objects.select_related(
            "engagement", "owner", "identified_by", "control", "risk", "created_by"
        )
        # Scope to engagement if nested route
        if engagement_pk := self.kwargs.get("engagement_pk"):
            qs = qs.filter(engagement_id=engagement_pk)
        # Finding owners only see their own findings
        user = self.request.user
        if not user.is_auditor_or_above:
            qs = qs.filter(owner=user)
        return qs

    def perform_create(self, serializer):
        kwargs = {"created_by": self.request.user}
        if engagement_pk := self.kwargs.get("engagement_pk"):
            from apps.engagements.models import AuditEngagement
            kwargs["engagement"] = AuditEngagement.objects.get(pk=engagement_pk)
        serializer.save(**kwargs)


class FindingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FindingSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAuditorOrAbove()]
        if self.request.method == "DELETE":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return Finding.objects.select_related(
            "engagement", "owner", "identified_by", "control", "risk", "created_by"
        ).prefetch_related("remediation_actions", "evidence_files")


class RemediationActionListView(generics.ListCreateAPIView):
    """Flat list + create — all remediation actions."""

    serializer_class = RemediationActionSerializer
    permission_classes = [IsAuditorOrAbove]
    filterset_fields = ["status", "owner"]
    ordering_fields = ["due_date", "status", "created_at"]
    ordering = ["due_date"]

    def get_queryset(self):
        qs = RemediationAction.objects.select_related(
            "finding", "finding__engagement", "owner", "evidence", "created_by"
        )
        if engagement_pk := self.request.query_params.get("engagement"):
            qs = qs.filter(finding__engagement_id=engagement_pk)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RemediationActionFlatDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Flat PATCH/DELETE for a single remediation action (no finding scope)."""

    serializer_class = RemediationActionSerializer
    permission_classes = [IsAuditorOrAbove]
    queryset = RemediationAction.objects.select_related(
        "finding", "owner", "evidence", "created_by"
    )


class RemediationActionListCreateView(generics.ListCreateAPIView):
    serializer_class = RemediationActionSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return RemediationAction.objects.filter(
            finding_id=self.kwargs["finding_pk"]
        ).select_related("owner", "created_by")

    def perform_create(self, serializer):
        finding = Finding.objects.get(pk=self.kwargs["finding_pk"])
        serializer.save(finding=finding, created_by=self.request.user)


class RemediationActionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RemediationActionSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return RemediationAction.objects.filter(
            finding_id=self.kwargs["finding_pk"]
        ).select_related("owner", "created_by")


class EvidenceListCreateView(generics.ListCreateAPIView):
    serializer_class = EvidenceSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        qs = Evidence.objects.select_related("uploaded_by")
        if finding_pk := self.kwargs.get("finding_pk"):
            qs = qs.filter(finding_id=finding_pk)
        elif engagement_pk := self.kwargs.get("engagement_pk"):
            qs = qs.filter(engagement_id=engagement_pk)
        return qs

    def perform_create(self, serializer):
        kwargs = {"uploaded_by": self.request.user}
        if finding_pk := self.kwargs.get("finding_pk"):
            kwargs["finding"] = Finding.objects.get(pk=finding_pk)
        elif engagement_pk := self.kwargs.get("engagement_pk"):
            from apps.engagements.models import AuditEngagement
            kwargs["engagement"] = AuditEngagement.objects.get(pk=engagement_pk)
        serializer.save(**kwargs)


class EvidenceFlatListCreateView(generics.ListCreateAPIView):
    """Flat list + create for all evidence records."""

    serializer_class = EvidenceSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return Evidence.objects.select_related("uploaded_by", "finding", "engagement")

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class EvidenceDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = EvidenceSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return Evidence.objects.select_related("uploaded_by")

    def destroy(self, request, *args, **kwargs):
        evidence = self.get_object()
        # Only the uploader, auditors, or managers can delete
        if (
            evidence.uploaded_by != request.user
            and not request.user.is_auditor_or_above
        ):
            raise PermissionDenied("You do not have permission to delete this evidence.")
        # Delete the file from storage
        if evidence.file:
            evidence.file.delete(save=False)
        evidence.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ApprovalRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = ApprovalRequestSerializer
    filterset_fields = ["entity_type", "status", "approver"]
    ordering = ["-requested_at"]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        # Managers see all; others see only their own requests
        if user.is_audit_manager_or_above:
            return ApprovalRequest.objects.select_related("requested_by", "approver")
        return ApprovalRequest.objects.filter(
            models.Q(requested_by=user) | models.Q(approver=user)
        ).select_related("requested_by", "approver")


class ApprovalRequestDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ApprovalRequest.objects.select_related("requested_by", "approver")


class ApprovalDecisionView(APIView):
    """
    POST  /api/v1/approvals/<pk>/decision/
    Body: { "decision": "approved" | "rejected", "review_notes": "..." }
    Only the designated approver can act on a request.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            approval = ApprovalRequest.objects.get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if approval.approver != request.user and not request.user.is_audit_manager_or_above:
            raise PermissionDenied("Only the designated approver can act on this request.")

        if approval.status != ApprovalRequest.ApprovalStatus.PENDING:
            return Response(
                {"error": f"Request is already {approval.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = request.data.get("decision")
        if decision not in ("approved", "rejected"):
            return Response(
                {"error": "decision must be 'approved' or 'rejected'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        approval.status = decision
        approval.review_notes = request.data.get("review_notes", "")
        approval.reviewed_at = timezone.now()
        approval.save(update_fields=["status", "review_notes", "reviewed_at"])

        return Response(ApprovalRequestSerializer(approval).data)


