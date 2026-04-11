from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove, IsRiskOwnerOrAbove

from .models import EngagementRisk, Risk
from .serializers import EngagementRiskSerializer, RiskSerializer


class RiskListCreateView(generics.ListCreateAPIView):
    serializer_class = RiskSerializer
    filterset_fields = ["category", "status", "owner", "business_process"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "category", "inherent_likelihood", "inherent_impact", "created_at"]
    ordering = ["-inherent_likelihood", "-inherent_impact"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsRiskOwnerOrAbove()]

    def get_queryset(self):
        return Risk.objects.select_related("owner", "business_process", "business_objective", "created_by")


class RiskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RiskSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsRiskOwnerOrAbove()]

    def get_queryset(self):
        return Risk.objects.select_related("owner", "business_process", "business_objective", "created_by")


class EngagementRiskListCreateView(generics.ListCreateAPIView):
    serializer_class = EngagementRiskSerializer
    permission_classes = [IsAuditorOrAbove]
    filterset_fields = ["is_in_scope"]

    def get_queryset(self):
        return EngagementRisk.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("risk", "created_by")

    def perform_create(self, serializer):
        from apps.engagements.models import AuditEngagement

        engagement = AuditEngagement.objects.get(pk=self.kwargs["engagement_pk"])
        serializer.save(engagement=engagement, created_by=self.request.user)


class EngagementRiskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EngagementRiskSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return EngagementRisk.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("risk")


class EngagementRiskFlatListCreateView(generics.ListCreateAPIView):
    """Flat list of ALL engagement risks across all engagements."""

    serializer_class = EngagementRiskSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return EngagementRisk.objects.select_related(
            "risk", "risk__owner", "objective", "engagement", "created_by"
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EngagementRiskFlatDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Flat detail/delete for a single engagement risk (no engagement scope)."""

    serializer_class = EngagementRiskSerializer
    permission_classes = [IsAuditorOrAbove]
    queryset = EngagementRisk.objects.select_related("risk", "risk__owner", "objective", "engagement")
