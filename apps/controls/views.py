from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove, IsRiskOwnerOrAbove

from .models import Control, EngagementControl
from .serializers import ControlSerializer, EngagementControlSerializer


class ControlListCreateView(generics.ListCreateAPIView):
    serializer_class = ControlSerializer
    filterset_fields = ["control_type", "status", "owner", "business_process"]
    search_fields = ["name", "description", "control_reference"]
    ordering_fields = ["name", "control_type", "status", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsRiskOwnerOrAbove()]

    def get_queryset(self):
        return Control.objects.select_related(
            "owner", "business_process", "created_by"
        ).prefetch_related("risks")


class ControlDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ControlSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsRiskOwnerOrAbove()]

    def get_queryset(self):
        return Control.objects.select_related(
            "owner", "business_process", "created_by"
        ).prefetch_related("risks")


class EngagementControlListCreateView(generics.ListCreateAPIView):
    serializer_class = EngagementControlSerializer
    permission_classes = [IsAuditorOrAbove]
    filterset_fields = ["test_result", "effectiveness_rating"]

    def get_queryset(self):
        return EngagementControl.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("control", "tested_by", "created_by")

    def perform_create(self, serializer):
        from apps.engagements.models import AuditEngagement

        engagement = AuditEngagement.objects.get(pk=self.kwargs["engagement_pk"])
        serializer.save(engagement=engagement, created_by=self.request.user)


class EngagementControlDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EngagementControlSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return EngagementControl.objects.filter(
            engagement_id=self.kwargs["engagement_pk"]
        ).select_related("control", "tested_by")


class EngagementControlFlatListCreateView(generics.ListCreateAPIView):
    """Flat list of ALL engagement controls across all engagements."""

    serializer_class = EngagementControlSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return EngagementControl.objects.select_related(
            "control", "control__owner", "engagement_risk", "engagement", "created_by"
        ).prefetch_related("control__risks")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EngagementControlFlatDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Flat detail/delete for a single engagement control."""

    serializer_class = EngagementControlSerializer
    permission_classes = [IsAuditorOrAbove]
    queryset = EngagementControl.objects.select_related(
        "control", "control__owner", "engagement_risk", "engagement"
    ).prefetch_related("control__risks")


class ControlTestPlanListView(generics.ListAPIView):
    """Test plans scoped to a specific control."""

    permission_classes = [IsAuditorOrAbove]

    def get_serializer_class(self):
        from apps.testing.serializers import TestPlanSerializer
        return TestPlanSerializer

    def get_queryset(self):
        from apps.testing.models import TestPlan
        return TestPlan.objects.filter(
            control_id=self.kwargs["pk"]
        ).select_related(
            "control", "engagement", "testing_method", "planned_by", "created_by"
        ).prefetch_related("assertion_types")
