from django.urls import path

from .views import (
    ControlDetailView,
    ControlListCreateView,
    EngagementControlDetailView,
    EngagementControlListCreateView,
)

urlpatterns = [
    path("controls/", ControlListCreateView.as_view(), name="control-list"),
    path("controls/<uuid:pk>/", ControlDetailView.as_view(), name="control-detail"),
    path("engagements/<uuid:engagement_pk>/controls/", EngagementControlListCreateView.as_view(), name="engagement-control-list"),
    path("engagements/<uuid:engagement_pk>/controls/<uuid:pk>/", EngagementControlDetailView.as_view(), name="engagement-control-detail"),
]
