from django.urls import path

from .views import (
    EngagementRiskDetailView,
    EngagementRiskFlatDetailView,
    EngagementRiskFlatListCreateView,
    EngagementRiskListCreateView,
    RiskDetailView,
    RiskListCreateView,
)

urlpatterns = [
    path("risks/", RiskListCreateView.as_view(), name="risk-list"),
    path("risks/<uuid:pk>/", RiskDetailView.as_view(), name="risk-detail"),
    # Flat engagement-risk endpoints (all engagements)
    path("engagement-risks/", EngagementRiskFlatListCreateView.as_view(), name="engagement-risk-flat-list"),
    path("engagement-risks/<uuid:pk>/", EngagementRiskFlatDetailView.as_view(), name="engagement-risk-flat-detail"),
    # Engagement-scoped risks (legacy / nested)
    path("engagements/<uuid:engagement_pk>/risks/", EngagementRiskListCreateView.as_view(), name="engagement-risk-list"),
    path("engagements/<uuid:engagement_pk>/risks/<uuid:pk>/", EngagementRiskDetailView.as_view(), name="engagement-risk-detail"),
]
