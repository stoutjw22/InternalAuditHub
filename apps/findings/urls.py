from django.urls import path

from .views import (
    ApprovalDecisionView,
    ApprovalRequestDetailView,
    ApprovalRequestListCreateView,
    EvidenceDetailView,
    EvidenceFlatListCreateView,
    EvidenceListCreateView,
    FindingDetailView,
    FindingListCreateView,
    RemediationActionDetailView,
    RemediationActionFlatDetailView,
    RemediationActionListCreateView,
    RemediationActionListView,
)

urlpatterns = [
    # Findings — top-level and engagement-nested
    path("findings/", FindingListCreateView.as_view(), name="finding-list"),
    path("findings/<uuid:pk>/", FindingDetailView.as_view(), name="finding-detail"),
    path("engagements/<uuid:engagement_pk>/findings/", FindingListCreateView.as_view(), name="engagement-finding-list"),
    # Remediation actions — flat list/create and individual PATCH/DELETE
    path("remediations/", RemediationActionListView.as_view(), name="remediation-flat-list"),
    path("remediations/<uuid:pk>/", RemediationActionFlatDetailView.as_view(), name="remediation-flat-detail"),
    # Remediation actions nested under finding (legacy)
    path("findings/<uuid:finding_pk>/remediations/", RemediationActionListCreateView.as_view(), name="remediation-list"),
    path("findings/<uuid:finding_pk>/remediations/<uuid:pk>/", RemediationActionDetailView.as_view(), name="remediation-detail"),
    # Evidence — flat and nested
    path("evidence/", EvidenceFlatListCreateView.as_view(), name="evidence-flat-list"),
    path("evidence/<uuid:pk>/", EvidenceDetailView.as_view(), name="evidence-flat-detail"),
    path("findings/<uuid:finding_pk>/evidence/", EvidenceListCreateView.as_view(), name="finding-evidence-list"),
    path("findings/<uuid:finding_pk>/evidence/<uuid:pk>/", EvidenceDetailView.as_view(), name="finding-evidence-detail"),
    path("engagements/<uuid:engagement_pk>/evidence/", EvidenceListCreateView.as_view(), name="engagement-evidence-list"),
    # Approvals
    path("approvals/", ApprovalRequestListCreateView.as_view(), name="approval-list"),
    path("approvals/<uuid:pk>/", ApprovalRequestDetailView.as_view(), name="approval-detail"),
    path("approvals/<uuid:pk>/decision/", ApprovalDecisionView.as_view(), name="approval-decision"),
]
