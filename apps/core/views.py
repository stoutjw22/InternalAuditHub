from rest_framework import generics, permissions

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import AuditLog, BusinessObjective, BusinessProcess
from .serializers import (
    AuditLogSerializer,
    BusinessObjectiveSerializer,
    BusinessProcessSerializer,
)


class BusinessProcessListCreateView(generics.ListCreateAPIView):
    serializer_class = BusinessProcessSerializer
    permission_classes = [IsAuditorOrAbove]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return BusinessProcess.objects.select_related("owner", "created_by").filter(
            is_active=True
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return super().get_permissions()


class BusinessProcessDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BusinessProcessSerializer
    permission_classes = [IsAuditorOrAbove]
    queryset = BusinessProcess.objects.select_related("owner", "created_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return super().get_permissions()


class BusinessObjectiveListCreateView(generics.ListCreateAPIView):
    serializer_class = BusinessObjectiveSerializer
    permission_classes = [IsAuditorOrAbove]
    filterset_fields = ["business_process"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return BusinessObjective.objects.select_related(
            "business_process", "owner", "created_by"
        )

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return super().get_permissions()


class BusinessObjectiveDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BusinessObjectiveSerializer
    permission_classes = [IsAuditorOrAbove]
    queryset = BusinessObjective.objects.select_related("business_process", "owner", "created_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return super().get_permissions()


class AuditLogListView(generics.ListAPIView):
    """Read-only audit trail. Restricted to audit managers and admins."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditManagerOrAbove]
    filterset_fields = ["action", "entity_type", "user"]
    search_fields = ["entity_name", "entity_type"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        return AuditLog.objects.select_related("user")
