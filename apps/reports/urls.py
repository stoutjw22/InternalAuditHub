from django.urls import path

from .views import (
    AuditReportDetailView,
    AuditReportListCreateView,
    AuditReportTemplateDetailView,
    AuditReportTemplateListCreateView,
    FinalizeReportView,
)

urlpatterns = [
    path("report-templates/", AuditReportTemplateListCreateView.as_view(), name="report-template-list"),
    path("report-templates/<uuid:pk>/", AuditReportTemplateDetailView.as_view(), name="report-template-detail"),
    path("reports/", AuditReportListCreateView.as_view(), name="report-list"),
    path("reports/<uuid:pk>/", AuditReportDetailView.as_view(), name="report-detail"),
    path("reports/<uuid:pk>/finalize/", FinalizeReportView.as_view(), name="report-finalize"),
    path("engagements/<uuid:engagement_pk>/reports/", AuditReportListCreateView.as_view(), name="engagement-report-list"),
]
