from django.urls import path

from .views import (
    ApplicabilityLogicDetailView,
    ApplicabilityLogicListCreateView,
    JurisdictionDetailView,
    JurisdictionListCreateView,
    RequirementOverlayDetailView,
    RequirementOverlayListCreateView,
)

urlpatterns = [
    path("jurisdictions/", JurisdictionListCreateView.as_view(), name="jurisdiction-list"),
    path("jurisdictions/<uuid:pk>/", JurisdictionDetailView.as_view(), name="jurisdiction-detail"),
    path("requirement-overlays/", RequirementOverlayListCreateView.as_view(), name="requirement-overlay-list"),
    path("requirement-overlays/<uuid:pk>/", RequirementOverlayDetailView.as_view(), name="requirement-overlay-detail"),
    path("applicability-rules/", ApplicabilityLogicListCreateView.as_view(), name="applicability-logic-list"),
    path("applicability-rules/<uuid:pk>/", ApplicabilityLogicDetailView.as_view(), name="applicability-logic-detail"),
]
