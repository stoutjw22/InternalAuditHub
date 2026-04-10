from django.urls import path

from .views import (
    AuditEngagementDetailView,
    AuditEngagementListCreateView,
    AuditTaskDetailView,
    AuditTaskListCreateView,
    EngagementAuditorDetailView,
    EngagementAuditorListCreateView,
)

urlpatterns = [
    path("engagements/", AuditEngagementListCreateView.as_view(), name="engagement-list"),
    path("engagements/<uuid:pk>/", AuditEngagementDetailView.as_view(), name="engagement-detail"),
    # Auditors nested under engagement
    path("engagements/<uuid:engagement_pk>/auditors/", EngagementAuditorListCreateView.as_view(), name="engagement-auditor-list"),
    path("engagements/<uuid:engagement_pk>/auditors/<uuid:pk>/", EngagementAuditorDetailView.as_view(), name="engagement-auditor-detail"),
    # Tasks nested under engagement
    path("engagements/<uuid:engagement_pk>/tasks/", AuditTaskListCreateView.as_view(), name="engagement-task-list"),
    path("engagements/<uuid:engagement_pk>/tasks/<uuid:pk>/", AuditTaskDetailView.as_view(), name="engagement-task-detail"),
]
