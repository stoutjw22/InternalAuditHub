from django.urls import path

from .views import (
    ControlDetailView,
    ControlListCreateView,
    ControlTestPlanListView,
    EngagementControlDetailView,
    EngagementControlFlatDetailView,
    EngagementControlFlatListCreateView,
    EngagementControlListCreateView,
)

urlpatterns = [
    path("controls/", ControlListCreateView.as_view(), name="control-list"),
    path("controls/<uuid:pk>/", ControlDetailView.as_view(), name="control-detail"),
    path("controls/<uuid:pk>/test-plans/", ControlTestPlanListView.as_view(), name="control-test-plans"),
    # Flat engagement-control endpoints (all engagements)
    path("engagement-controls/", EngagementControlFlatListCreateView.as_view(), name="engagement-control-flat-list"),
    path("engagement-controls/<uuid:pk>/", EngagementControlFlatDetailView.as_view(), name="engagement-control-flat-detail"),
    # Engagement-scoped (legacy / nested)
    path("engagements/<uuid:engagement_pk>/controls/", EngagementControlListCreateView.as_view(), name="engagement-control-list"),
    path("engagements/<uuid:engagement_pk>/controls/<uuid:pk>/", EngagementControlDetailView.as_view(), name="engagement-control-detail"),
]
