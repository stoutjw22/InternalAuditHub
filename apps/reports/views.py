from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

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
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        qs = AuditReport.objects.select_related(
            "engagement", "generated_by", "finalized_by", "template"
        )
        if engagement_pk := self.kwargs.get("engagement_pk"):
            qs = qs.filter(engagement_id=engagement_pk)
        return qs

    def perform_create(self, serializer):
        kwargs = {"generated_by": self.request.user}
        if engagement_pk := self.kwargs.get("engagement_pk"):
            from apps.engagements.models import AuditEngagement
            kwargs["engagement"] = AuditEngagement.objects.get(pk=engagement_pk)
        serializer.save(**kwargs)


class AuditReportDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditReportSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH"):
            return [IsAuditorOrAbove()]
        if self.request.method == "DELETE":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditReport.objects.select_related(
            "engagement", "generated_by", "finalized_by", "template"
        )


class FinalizeReportView(APIView):
    """
    POST /api/v1/reports/<pk>/finalize/
    Marks a report as Final and records who finalised it.
    Only audit managers and above may finalise.
    """

    permission_classes = [IsAuditManagerOrAbove]

    def post(self, request, pk):
        try:
            report = AuditReport.objects.get(pk=pk)
        except AuditReport.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if report.status == AuditReport.ReportStatus.FINAL:
            return Response({"detail": "Report is already finalised."}, status=status.HTTP_400_BAD_REQUEST)

        report.status = AuditReport.ReportStatus.FINAL
        report.finalized_by = request.user
        report.finalized_at = timezone.now()
        report.save(update_fields=["status", "finalized_by", "finalized_at"])

        return Response(AuditReportSerializer(report).data)
