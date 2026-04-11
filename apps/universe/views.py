from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import AuditableDomain, AuditableEntity, Subprocess
from .serializers import AuditableDomainSerializer, AuditableEntitySerializer, SubprocessSerializer


class AuditableDomainListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditableDomainSerializer
    filterset_fields = ["is_active", "parent"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditableDomain.objects.select_related(
            "parent", "created_by"
        ).prefetch_related("subdomains", "entities")


class AuditableDomainDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditableDomainSerializer
    queryset = AuditableDomain.objects.select_related("parent", "created_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class AuditableEntityListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditableEntitySerializer
    filterset_fields = ["domain", "entity_type", "inherent_risk_rating", "is_active"]
    search_fields = ["name", "description", "domain__name"]
    ordering_fields = ["name", "inherent_risk_rating", "next_audit_date"]
    ordering = ["domain__name", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditableEntity.objects.select_related(
            "domain", "owner", "created_by"
        )


class AuditableEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditableEntitySerializer
    queryset = AuditableEntity.objects.select_related("domain", "owner", "created_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class SubprocessListCreateView(generics.ListCreateAPIView):
    serializer_class = SubprocessSerializer
    filterset_fields = ["business_process", "auditable_entity", "is_active"]
    search_fields = ["name", "description", "business_process__name"]
    ordering_fields = ["business_process__name", "sequence_order", "name"]
    ordering = ["business_process__name", "sequence_order"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return Subprocess.objects.select_related(
            "business_process", "auditable_entity", "owner", "created_by"
        )


class SubprocessDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubprocessSerializer
    queryset = Subprocess.objects.select_related(
        "business_process", "auditable_entity", "owner", "created_by"
    )

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]
