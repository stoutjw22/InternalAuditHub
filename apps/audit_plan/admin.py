from django.contrib import admin

from .models import (
    AuditableEntity,
    AuditPlanSummary,
    AuditPlanYear,
    ControlEffectivenessScale,
    ControlRelianceCycle,
    GRCTestingTheme,
    KeyControlAssignment,
    MARTestingEngagement,
    RiskScoringConfig,
)


@admin.register(AuditableEntity)
class AuditableEntityAdmin(admin.ModelAdmin):
    list_display = (
        "au_id", "name", "domain", "rank", "priority_score",
        "residual_level", "mar_required", "estimated_hours",
    )
    list_filter = ("domain", "residual_level", "mar_required")
    search_fields = ("au_id", "name", "primary_clusters", "frameworks")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("rank", "au_id")


@admin.register(AuditPlanYear)
class AuditPlanYearAdmin(admin.ModelAdmin):
    list_display = ("au", "fiscal_year", "planned_year", "quarter", "status", "is_scheduled")
    list_filter = ("fiscal_year", "status", "is_scheduled", "quarter")
    search_fields = ("au__au_id", "au__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(RiskScoringConfig)
class RiskScoringConfigAdmin(admin.ModelAdmin):
    list_display = ("factor", "weight", "is_active")
    list_filter = ("is_active",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(ControlEffectivenessScale)
class ControlEffectivenessScaleAdmin(admin.ModelAdmin):
    list_display = ("score", "label", "meaning")
    readonly_fields = ("created_at", "updated_at")


@admin.register(KeyControlAssignment)
class KeyControlAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "control_id", "is_key_control", "control_name", "control_tier",
        "assigned_au", "plan_year", "baseline_complete", "reliance_ready",
    )
    list_filter = ("is_key_control", "control_tier", "reliance_ready", "baseline_complete")
    search_fields = ("control_id", "control_name", "framework", "grc_domain")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ControlRelianceCycle)
class ControlRelianceCycleAdmin(admin.ModelAdmin):
    list_display = ("control", "cycle_year", "result")
    list_filter = ("cycle_year", "result")
    search_fields = ("control__control_id", "control__control_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(GRCTestingTheme)
class GRCTestingThemeAdmin(admin.ModelAdmin):
    list_display = (
        "sub_theme_code", "sub_theme_name", "layer", "domain",
        "control_count", "planned_audit_years",
    )
    list_filter = ("layer",)
    search_fields = ("sub_theme_code", "sub_theme_name", "domain")
    readonly_fields = ("created_at", "updated_at")


@admin.register(MARTestingEngagement)
class MARTestingEngagementAdmin(admin.ModelAdmin):
    list_display = (
        "mar_test_area", "fiscal_year", "control_theme", "control_count",
        "test_type", "quarter", "assigned_to", "estimated_hours",
    )
    list_filter = ("fiscal_year", "test_type", "quarter")
    search_fields = ("mar_test_area", "control_theme", "assigned_to")
    readonly_fields = ("created_at", "updated_at")


@admin.register(AuditPlanSummary)
class AuditPlanSummaryAdmin(admin.ModelAdmin):
    list_display = (
        "fiscal_year", "planned_audits", "mar_required_count",
        "non_mar_count", "avg_priority_score", "estimated_total_hours", "generated_at",
    )
    readonly_fields = ("generated_at",)
