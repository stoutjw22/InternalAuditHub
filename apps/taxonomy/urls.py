from django.urls import path

from .views import (
    RiskCategoryDetailView,
    RiskCategoryListCreateView,
    RiskScoringConfigDetailView,
    RiskScoringConfigListCreateView,
    RiskSubcategoryDetailView,
    RiskSubcategoryListCreateView,
)

urlpatterns = [
    path("risk-categories/", RiskCategoryListCreateView.as_view(), name="risk-category-list"),
    path("risk-categories/<uuid:pk>/", RiskCategoryDetailView.as_view(), name="risk-category-detail"),
    path("risk-subcategories/", RiskSubcategoryListCreateView.as_view(), name="risk-subcategory-list"),
    path("risk-subcategories/<uuid:pk>/", RiskSubcategoryDetailView.as_view(), name="risk-subcategory-detail"),
    path("risk-scoring-configs/", RiskScoringConfigListCreateView.as_view(), name="risk-scoring-config-list"),
    path("risk-scoring-configs/<uuid:pk>/", RiskScoringConfigDetailView.as_view(), name="risk-scoring-config-detail"),
]
