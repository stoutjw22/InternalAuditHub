from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import (
    CitationSource,
    ControlActivity,
    ControlObjective,
    ControlRequirementMapping,
    Framework,
    FrameworkRequirement,
)
from .serializers import (
    CitationSourceSerializer,
    ControlActivitySerializer,
    ControlObjectiveSerializer,
    ControlRequirementMappingSerializer,
    FrameworkRequirementSerializer,
    FrameworkSerializer,
)


class CitationSourceListCreateView(generics.ListCreateAPIView):
    serializer_class = CitationSourceSerializer
    filterset_fields = ["source_type"]
    search_fields = ["name", "publisher"]
    ordering_fields = ["name", "publication_date"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = CitationSource.objects.all()


class CitationSourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CitationSourceSerializer
    queryset = CitationSource.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class FrameworkListCreateView(generics.ListCreateAPIView):
    serializer_class = FrameworkSerializer
    filterset_fields = ["framework_type", "is_active"]
    search_fields = ["name", "short_name", "version"]
    ordering_fields = ["short_name", "version", "effective_date"]
    ordering = ["short_name", "version"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return Framework.objects.select_related("citation_source", "created_by")


class FrameworkDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FrameworkSerializer
    queryset = Framework.objects.select_related("citation_source", "created_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class FrameworkRequirementListCreateView(generics.ListCreateAPIView):
    serializer_class = FrameworkRequirementSerializer
    filterset_fields = ["framework", "requirement_type", "is_active", "parent"]
    search_fields = ["requirement_id", "title", "description"]
    ordering_fields = ["framework", "requirement_id"]
    ordering = ["framework", "requirement_id"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return FrameworkRequirement.objects.select_related(
            "framework", "parent", "citation_source"
        )


class FrameworkRequirementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FrameworkRequirementSerializer
    queryset = FrameworkRequirement.objects.select_related(
        "framework", "parent", "citation_source"
    )

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class ControlObjectiveListCreateView(generics.ListCreateAPIView):
    serializer_class = ControlObjectiveSerializer
    filterset_fields = ["is_active"]
    search_fields = ["name", "description", "reference_code"]
    ordering_fields = ["reference_code", "name"]
    ordering = ["reference_code", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return ControlObjective.objects.select_related(
            "created_by"
        ).prefetch_related("framework_requirements", "activities")


class ControlObjectiveDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ControlObjectiveSerializer
    queryset = ControlObjective.objects.prefetch_related("framework_requirements")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]


class ControlActivityListCreateView(generics.ListCreateAPIView):
    serializer_class = ControlActivitySerializer
    filterset_fields = ["activity_type", "is_active", "control", "control_objective"]
    search_fields = ["name", "description", "control__name"]
    ordering_fields = ["control__name", "name", "activity_type"]
    ordering = ["control__name", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return ControlActivity.objects.select_related(
            "control", "control_objective", "created_by"
        ).prefetch_related("framework_requirements")


class ControlActivityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ControlActivitySerializer
    queryset = ControlActivity.objects.select_related(
        "control", "control_objective"
    ).prefetch_related("framework_requirements")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]


class ControlRequirementMappingListCreateView(generics.ListCreateAPIView):
    serializer_class = ControlRequirementMappingSerializer
    filterset_fields = ["control", "framework_requirement", "mapping_type"]
    search_fields = ["control__name", "framework_requirement__requirement_id", "notes"]
    ordering_fields = ["control__name", "mapping_type"]
    ordering = ["control__name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return ControlRequirementMapping.objects.select_related(
            "control", "framework_requirement", "created_by"
        )


class ControlRequirementMappingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ControlRequirementMappingSerializer
    queryset = ControlRequirementMapping.objects.select_related(
        "control", "framework_requirement"
    )

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]
