from django.urls import path

from .views import (
    AuditLogListView,
    BusinessObjectiveDetailView,
    BusinessObjectiveListCreateView,
    BusinessProcessDetailView,
    BusinessProcessListCreateView,
)

urlpatterns = [
    path("business-processes/", BusinessProcessListCreateView.as_view(), name="business-process-list"),
    path("business-processes/<uuid:pk>/", BusinessProcessDetailView.as_view(), name="business-process-detail"),
    path("business-objectives/", BusinessObjectiveListCreateView.as_view(), name="business-objective-list"),
    path("business-objectives/<uuid:pk>/", BusinessObjectiveDetailView.as_view(), name="business-objective-detail"),
    path("audit-logs/", AuditLogListView.as_view(), name="audit-log-list"),
]
