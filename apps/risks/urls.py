from django.urls import path

from .views import (
    EngagementRiskDetailView,
    EngagementRiskListCreateView,
    RiskDetailView,
    RiskListCreateView,
)

urlpatterns = [
    path("risks/", RiskListCreateView.as_view(), name="risk-list"),
    path("risks/<uuid:pk>/", RiskDetailView.as_view(), name="risk-detail"),
    # Engagement-scoped risks
    path("engagements/<uuid:engagement_pk>/risks/", EngagementRiskListCreateView.as_view(), name="engagement-risk-list"),
    path("engagements/<uuid:engagement_pk>/risks/<uuid:pk>/", EngagementRiskDetailView.as_view(), name="engagement-risk-detail"),
]
