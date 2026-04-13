from django.urls import path

from .views import (
    AuditPlanSummaryDetailView,
    AuditPlanSummaryListView,
    AuditPlanYearDetailView,
    AuditPlanYearListCreateView,
    AuditableEntityDetailView,
    AuditableEntityListCreateView,
    BulkImportView,
    ControlEffectivenessScaleDetailView,
    ControlEffectivenessScaleListView,
    ControlRelianceCycleDetailView,
    ControlRelianceCycleListCreateView,
    EntityControlsView,
    EntityPlanYearsView,
    GRCTestingThemeDetailView,
    GRCTestingThemeListCreateView,
    KeyControlAssignmentDetailView,
    KeyControlAssignmentListCreateView,
    MARTestingEngagementDetailView,
    MARTestingEngagementListCreateView,
    RiskScoringConfigDetailView,
    RiskScoringConfigListCreateView,
)

urlpatterns = [
    # Auditable Entities
    path(
        "audit-plan/entities/",
        AuditableEntityListCreateView.as_view(),
        name="audit-plan-entity-list",
    ),
    path(
        "audit-plan/entities/<int:pk>/",
        AuditableEntityDetailView.as_view(),
        name="audit-plan-entity-detail",
    ),
    path(
        "audit-plan/entities/<int:pk>/plan-years/",
        EntityPlanYearsView.as_view(),
        name="audit-plan-entity-plan-years",
    ),
    path(
        "audit-plan/entities/<int:pk>/controls/",
        EntityControlsView.as_view(),
        name="audit-plan-entity-controls",
    ),

    # Plan Years (flat)
    path(
        "audit-plan/plan-years/",
        AuditPlanYearListCreateView.as_view(),
        name="audit-plan-year-list",
    ),
    path(
        "audit-plan/plan-years/<int:pk>/",
        AuditPlanYearDetailView.as_view(),
        name="audit-plan-year-detail",
    ),

    # Risk Scoring Config
    path(
        "audit-plan/risk-scoring/",
        RiskScoringConfigListCreateView.as_view(),
        name="audit-plan-risk-scoring-list",
    ),
    path(
        "audit-plan/risk-scoring/<int:pk>/",
        RiskScoringConfigDetailView.as_view(),
        name="audit-plan-risk-scoring-detail",
    ),

    # Control Effectiveness Scale
    path(
        "audit-plan/control-effectiveness-scale/",
        ControlEffectivenessScaleListView.as_view(),
        name="audit-plan-control-effectiveness-list",
    ),
    path(
        "audit-plan/control-effectiveness-scale/<int:pk>/",
        ControlEffectivenessScaleDetailView.as_view(),
        name="audit-plan-control-effectiveness-detail",
    ),

    # Key Control Assignments
    path(
        "audit-plan/controls/",
        KeyControlAssignmentListCreateView.as_view(),
        name="audit-plan-control-list",
    ),
    path(
        "audit-plan/controls/<int:pk>/",
        KeyControlAssignmentDetailView.as_view(),
        name="audit-plan-control-detail",
    ),

    # Control Reliance Cycles
    path(
        "audit-plan/reliance-cycles/",
        ControlRelianceCycleListCreateView.as_view(),
        name="audit-plan-reliance-cycle-list",
    ),
    path(
        "audit-plan/reliance-cycles/<int:pk>/",
        ControlRelianceCycleDetailView.as_view(),
        name="audit-plan-reliance-cycle-detail",
    ),

    # GRC Testing Themes
    path(
        "audit-plan/grc-themes/",
        GRCTestingThemeListCreateView.as_view(),
        name="audit-plan-grc-theme-list",
    ),
    path(
        "audit-plan/grc-themes/<int:pk>/",
        GRCTestingThemeDetailView.as_view(),
        name="audit-plan-grc-theme-detail",
    ),

    # MAR Testing Engagements (Year 6)
    path(
        "audit-plan/mar-engagements/",
        MARTestingEngagementListCreateView.as_view(),
        name="audit-plan-mar-engagement-list",
    ),
    path(
        "audit-plan/mar-engagements/<int:pk>/",
        MARTestingEngagementDetailView.as_view(),
        name="audit-plan-mar-engagement-detail",
    ),

    # Audit Plan Summary (read-only)
    path(
        "audit-plan/summary/",
        AuditPlanSummaryListView.as_view(),
        name="audit-plan-summary-list",
    ),
    path(
        "audit-plan/summary/<int:pk>/",
        AuditPlanSummaryDetailView.as_view(),
        name="audit-plan-summary-detail",
    ),

    # Bulk Import
    path(
        "audit-plan/import/",
        BulkImportView.as_view(),
        name="audit-plan-import",
    ),
]
