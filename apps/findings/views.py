from django.db import models
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import policies
from apps.accounts.models import UserRole
from apps.accounts.permissions import (
    ApprovalObjectPermission,
    FindingObjectPermission,
    IsAuditManagerOrAbove,
    IsAuditorOrAbove,
    IsFindingListAllowed,
)

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
            # Creating a finding requires at least auditor role;
            # engagement-team membership is enforced in perform_create().
            return [IsAuditorOrAbove()]
        # IsFindingListAllowed allows all roles except read_only.
        # The queryset further scopes what each role can actually see.
        return [IsFindingListAllowed()]

    def get_queryset(self):
        user = self.request.user
        qs = Finding.objects.select_related(
            "engagement", "owner", "identified_by", "control", "risk", "created_by"
        )

        # Scope to engagement if accessed via nested route.
        if engagement_pk := self.kwargs.get("engagement_pk"):
            qs = qs.filter(engagement_id=engagement_pk)

        # Admins and managers see every finding.
        if user.is_audit_manager_or_above:
            return qs

        if user.role == UserRole.AUDITOR:
            # Auditors see findings from engagements they are on; draft findings
            # from other engagements are hidden.
            from apps.engagements.models import EngagementAuditor

            team_engagement_ids = EngagementAuditor.objects.filter(
                auditor=user
            ).values_list("engagement_id", flat=True)
            managed_engagement_ids = (
                Finding.objects.filter(engagement__audit_manager=user)
                .values_list("engagement_id", flat=True)
            )
            accessible_ids = set(team_engagement_ids) | set(managed_engagement_ids)

            return qs.filter(
                models.Q(engagement__in=accessible_ids)
                | ~models.Q(status=Finding.FindingStatus.DRAFT)
            ).distinct()

        # All other roles (finding_owner, risk_owner, control_owner, read_only):
        # show only their own non-draft findings.
        return qs.filter(owner=user).exclude(status=Finding.FindingStatus.DRAFT)

    def perform_create(self, serializer):
        user = self.request.user
        engagement_pk = self.kwargs.get("engagement_pk")
        engagement = None
        kwargs = {"created_by": user}

        if engagement_pk:
            from apps.engagements.models import AuditEngagement

            engagement = AuditEngagement.objects.get(pk=engagement_pk)
            kwargs["engagement"] = engagement
        else:
            # Flat create: engagement comes from validated data.
            engagement = serializer.validated_data.get("engagement")

        if engagement and not policies.is_engagement_team_member(user, engagement):
            raise PermissionDenied(
                "You must be a member of the engagement team to create findings."
            )

        serializer.save(**kwargs)


class FindingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve / update / delete a single finding.

    All access control is handled by FindingObjectPermission (object-level):
      GET    → policies.can_read_finding()
      PATCH  → policies.can_write_finding()  or  can_add_management_response()
               (management_response-only PATCHes use the lighter rule)
      DELETE → policies.can_delete_finding()
    """

    serializer_class = FindingSerializer
    permission_classes = [FindingObjectPermission]

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
        # Managers see all; others see only their own requests (as requester or approver).
        if user.is_audit_manager_or_above:
            return ApprovalRequest.objects.select_related("requested_by", "approver")
        return ApprovalRequest.objects.filter(
            models.Q(requested_by=user) | models.Q(approver=user)
        ).select_related("requested_by", "approver")

    def perform_create(self, serializer):
        user = self.request.user
        approver = serializer.validated_data.get("approver")
        # Prevent creating a request where the requester and approver are the same.
        if approver and approver.pk == user.pk:
            raise PermissionDenied(
                "You cannot designate yourself as the approver for your own request."
            )
        serializer.save(requested_by=user)


class ApprovalRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ApprovalRequestSerializer
    permission_classes = [ApprovalObjectPermission]

    def get_queryset(self):
        return ApprovalRequest.objects.select_related("requested_by", "approver")


class ApprovalDecisionView(APIView):
    """
    POST  /api/v1/approvals/<pk>/decision/
    Body: { "decision": "approved" | "rejected", "review_notes": "..." }

    Only the designated approver, an audit manager, or admin may act.
    Self-approval is blocked — the requester cannot approve their own request.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            approval = ApprovalRequest.objects.get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Delegate the access decision to the centralized policy.
        if not policies.can_approve_request(request.user, approval):
            if approval.requested_by_id == request.user.pk:
                raise PermissionDenied(
                    "You cannot approve your own approval request."
                )
            raise PermissionDenied(
                "Only the designated approver can act on this request."
            )

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

        # Explicit hook: log the semantic approve/reject event so auditors see
        # the decision with its entity context, not just a field-diff update.
        try:
            from apps.core import audit as _audit
            _audit.log_approval_decision(
                approval, decision, user=request.user, request=request
            )
        except Exception:
            pass  # audit failure must never break the real response

        return Response(ApprovalRequestSerializer(approval).data)
