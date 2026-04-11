from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import ApplicabilityLogic, Jurisdiction, RequirementOverlay
from .serializers import (
    ApplicabilityLogicSerializer,
    JurisdictionSerializer,
    RequirementOverlaySerializer,
)


class JurisdictionListCreateView(generics.ListCreateAPIView):
    serializer_class = JurisdictionSerializer
    filterset_fields = ["jurisdiction_type", "is_active", "country"]
    search_fields = ["name", "short_name", "regulator_name", "country", "region"]
    ordering_fields = ["name", "jurisdiction_type", "country"]
    ordering = ["jurisdiction_type", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return Jurisdiction.objects.prefetch_related("overlays")


class JurisdictionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JurisdictionSerializer
    queryset = Jurisdiction.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class RequirementOverlayListCreateView(generics.ListCreateAPIView):
    serializer_class = RequirementOverlaySerializer
    filterset_fields = ["jurisdiction", "framework_requirement", "overlay_type", "is_active"]
    search_fields = [
        "overlay_text", "citation_reference",
        "jurisdiction__name", "framework_requirement__requirement_id",
    ]
    ordering_fields = ["jurisdiction", "overlay_type", "effective_date"]
    ordering = ["jurisdiction", "framework_requirement"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return RequirementOverlay.objects.select_related(
            "jurisdiction", "framework_requirement",
            "citation_source", "created_by"
        )


class RequirementOverlayDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RequirementOverlaySerializer
    queryset = RequirementOverlay.objects.select_related(
        "jurisdiction", "framework_requirement", "citation_source"
    )

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class ApplicabilityLogicListCreateView(generics.ListCreateAPIView):
    serializer_class = ApplicabilityLogicSerializer
    filterset_fields = [
        "jurisdiction", "condition_type", "is_applicable",
        "auditable_entity", "framework_requirement",
    ]
    search_fields = ["name", "description", "jurisdiction__name", "rationale"]
    ordering_fields = ["jurisdiction", "name", "effective_date"]
    ordering = ["jurisdiction", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return ApplicabilityLogic.objects.select_related(
            "jurisdiction", "auditable_entity",
            "framework_requirement", "created_by"
        )


class ApplicabilityLogicDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ApplicabilityLogicSerializer
    queryset = ApplicabilityLogic.objects.select_related(
        "jurisdiction", "auditable_entity", "framework_requirement"
    )

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]
