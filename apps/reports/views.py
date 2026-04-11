from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts import policies
from apps.accounts.permissions import (
    IsAuditManagerOrAbove,
    IsAuditorOrAbove,
    IsReportListAllowed,
    ReportObjectPermission,
)

from .models import AuditReport, AuditReportTemplate
from .serializers import (
    AuditReportListSerializer,
    AuditReportSerializer,
    AuditReportTemplateSerializer,
)


class AuditReportTemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditReportTemplateSerializer
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditReportTemplate.objects.filter(is_active=True).select_related("created_by")


class AuditReportTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditReportTemplateSerializer
    permission_classes = [IsAuditManagerOrAbove]
    queryset = AuditReportTemplate.objects.select_related("created_by")


class AuditReportListCreateView(generics.ListCreateAPIView):
    filterset_fields = ["status", "engagement"]
    search_fields = ["title", "executive_summary"]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AuditReportListSerializer
        return AuditReportSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        # IsReportListAllowed allows all roles except read_only.
        # The queryset further scopes which reports each role can see.
        return [IsReportListAllowed()]

    def get_queryset(self):
        user = self.request.user
        qs = AuditReport.objects.select_related(
            "engagement", "generated_by", "finalized_by", "template"
        )
        if engagement_pk := self.kwargs.get("engagement_pk"):
            qs = qs.filter(engagement_id=engagement_pk)

        # Admins and managers may see all reports.
        if user.is_audit_manager_or_above:
            return qs

        # Authenticated users see:
        #   • All final / archived reports (broad distribution)
        #   • Draft / pending-review reports only if they are on the team
        from apps.engagements.models import EngagementAuditor
        from django.db import models as db_models

        team_engagement_ids = EngagementAuditor.objects.filter(
            auditor=user
        ).values_list("engagement_id", flat=True)
        managed_engagement_ids = AuditReport.objects.filter(
            engagement__audit_manager=user
        ).values_list("engagement_id", flat=True)
        accessible_ids = set(team_engagement_ids) | set(managed_engagement_ids)

        return qs.filter(
            db_models.Q(status__in=[AuditReport.ReportStatus.FINAL, AuditReport.ReportStatus.ARCHIVED])
            | db_models.Q(engagement__in=accessible_ids)
        ).distinct()

    def perform_create(self, serializer):
        kwargs = {"generated_by": self.request.user}
        if engagement_pk := self.kwargs.get("engagement_pk"):
            from apps.engagements.models import AuditEngagement

            kwargs["engagement"] = AuditEngagement.objects.get(pk=engagement_pk)
        serializer.save(**kwargs)


class AuditReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve / update / delete a single report.

    Access control is handled by ReportObjectPermission (object-level):
      GET    → policies.can_read_report()
      PATCH  → policies.can_edit_report()   (Final/Archived → always False)
      DELETE → policies.can_delete_report() (Final/Archived → always False)
    """

    serializer_class = AuditReportSerializer
    permission_classes = [ReportObjectPermission]

    def get_queryset(self):
        return AuditReport.objects.select_related(
            "engagement", "generated_by", "finalized_by", "template"
        )


class FinalizeReportView(APIView):
    """
    POST /api/v1/reports/<pk>/finalize/
    Marks a report as Final and records who finalised it.

    Only the engagement's audit_manager or admin may finalise.
    Uses policies.can_finalize_report() rather than a coarse role check so
    that an audit manager who is NOT assigned to the engagement cannot finalise
    another team's report.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            report = AuditReport.objects.select_related("engagement").get(pk=pk)
        except AuditReport.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not policies.can_finalize_report(request.user, report):
            raise PermissionDenied(
                "Only the engagement's audit manager or an admin may finalise this report."
            )

        if report.status == AuditReport.ReportStatus.FINAL:
            return Response(
                {"detail": "Report is already finalised."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report.status = AuditReport.ReportStatus.FINAL
        report.finalized_by = request.user
        report.finalized_at = timezone.now()
        report.save(update_fields=["status", "finalized_by", "finalized_at"])

        return Response(AuditReportSerializer(report).data)
