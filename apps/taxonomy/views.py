from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import RiskCategory, RiskScoringConfig, RiskSubcategory
from .serializers import RiskCategorySerializer, RiskScoringConfigSerializer, RiskSubcategorySerializer


class RiskCategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = RiskCategorySerializer
    filterset_fields = ["is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return RiskCategory.objects.prefetch_related("subcategories")


class RiskCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RiskCategorySerializer
    queryset = RiskCategory.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class RiskSubcategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = RiskSubcategorySerializer
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "category__name"]
    ordering = ["category__name", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return RiskSubcategory.objects.select_related("category")


class RiskSubcategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RiskSubcategorySerializer
    queryset = RiskSubcategory.objects.select_related("category")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class RiskScoringConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = RiskScoringConfigSerializer
    filterset_fields = ["scoring_method", "is_default", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "is_default"]
    ordering = ["-is_default", "name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return RiskScoringConfig.objects.select_related("created_by")


class RiskScoringConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RiskScoringConfigSerializer
    queryset = RiskScoringConfig.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]
