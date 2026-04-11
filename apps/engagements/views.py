from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import AuditEngagement, AuditTask, EngagementAuditor
from .serializers import (
    AuditEngagementListSerializer,
    AuditEngagementSerializer,
    AuditTaskSerializer,
    EngagementAuditorSerializer,
)


class AuditEngagementListCreateView(generics.ListCreateAPIView):
    filterset_fields = ["status", "audit_manager", "business_process"]
    search_fields = ["name", "description", "scope"]
    ordering_fields = ["name", "status", "start_date", "created_at"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AuditEngagementListSerializer
        return AuditEngagementSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        user = self.request.user
        qs = AuditEngagement.objects.select_related(
            "audit_manager", "business_process", "business_objective"
        )
        # Non-managers only see engagements they're assigned to
        if not user.is_audit_manager_or_above:
            qs = qs.filter(assigned_auditors__auditor=user)
        return qs.distinct()


class AuditEngagementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditEngagementSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditEngagement.objects.select_related(
            "audit_manager", "business_process", "business_objective", "created_by"
        ).prefetch_related("assigned_auditors__auditor")


class EngagementAuditorListCreateView(generics.ListCreateAPIView):
    serializer_class = EngagementAuditorSerializer
    permission_classes = [IsAuditManagerOrAbove]

    def get_queryset(self):
        return EngagementAuditor.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("auditor")

    def perform_create(self, serializer):
        engagement = AuditEngagement.objects.get(pk=self.kwargs["engagement_pk"])
        serializer.save(
            engagement=engagement,
            assigned_by=self.request.user,
        )


class EngagementAuditorDetailView(generics.DestroyAPIView):
    serializer_class = EngagementAuditorSerializer
    permission_classes = [IsAuditManagerOrAbove]

    def get_queryset(self):
        return EngagementAuditor.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        )


class EngagementAuditorFlatListCreateView(generics.ListCreateAPIView):
    """Flat list of ALL engagement auditors across all engagements."""

    serializer_class = EngagementAuditorSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return EngagementAuditor.objects.select_related("auditor", "engagement")

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class EngagementAuditorFlatDetailView(generics.DestroyAPIView):
    """Flat delete for a single engagement auditor."""

    serializer_class = EngagementAuditorSerializer
    permission_classes = [IsAuditManagerOrAbove]
    queryset = EngagementAuditor.objects.select_related("auditor", "engagement")


class AuditTaskListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditTaskSerializer
    filterset_fields = ["status", "priority", "assigned_to"]
    search_fields = ["name", "description"]
    ordering_fields = ["due_date", "priority", "status", "created_at"]
    ordering = ["due_date"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditTask.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("assigned_to", "created_by")

    def perform_create(self, serializer):
        engagement = AuditEngagement.objects.get(pk=self.kwargs["engagement_pk"])
        serializer.save(
            engagement=engagement,
            created_by=self.request.user,
        )


class AuditTaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditTaskSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return AuditTask.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("assigned_to", "created_by")
