"""
Serializers for the 6-Year Integrated Audit Plan app.
"""
from rest_framework import serializers

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


class AuditableEntitySerializer(serializers.ModelSerializer):
    residual_level_display = serializers.CharField(
        source="get_residual_level_display", read_only=True
    )
    domain_display = serializers.CharField(source="get_domain_display", read_only=True)

    class Meta:
        model = AuditableEntity
        fields = (
            "id",
            "au_id",
            "name",
            "domain",
            "domain_display",
            "rank",
            "priority_score",
            "residual_level",
            "residual_level_display",
            "mar_required",
            "primary_clusters",
            "frameworks",
            "risk_count",
            "key_control_ids",
            "agile_scope",
            "estimated_hours",
            "erm_risk_category",
            "risk_appetite_threshold",
            "exceeds_appetite",
            "frequency_override_triggers",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class AuditableEntityListSerializer(serializers.ModelSerializer):
    """Compact serializer for embedding in nested responses."""

    class Meta:
        model = AuditableEntity
        fields = ("id", "au_id", "name", "domain", "priority_score", "residual_level", "mar_required")


class AuditPlanYearSerializer(serializers.ModelSerializer):
    au_detail = AuditableEntityListSerializer(source="au", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    quarter_display = serializers.CharField(source="get_quarter_display", read_only=True)

    class Meta:
        model = AuditPlanYear
        fields = (
            "id",
            "au",
            "au_detail",
            "fiscal_year",
            "planned_year",
            "quarter",
            "quarter_display",
            "status",
            "status_display",
            "is_scheduled",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class AuditPlanRiskScoringConfigSerializer(serializers.ModelSerializer):
    weight_percent = serializers.SerializerMethodField()

    class Meta:
        model = RiskScoringConfig
        fields = (
            "id",
            "factor",
            "weight",
            "weight_percent",
            "score_1_label",
            "score_2_label",
            "score_3_label",
            "score_4_label",
            "score_5_label",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_weight_percent(self, obj) -> str:
        return f"{float(obj.weight) * 100:.0f}%"


class ControlEffectivenessScaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlEffectivenessScale
        fields = (
            "id",
            "score",
            "label",
            "meaning",
            "typical_signal",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class KeyControlAssignmentSerializer(serializers.ModelSerializer):
    assigned_au_detail = AuditableEntityListSerializer(source="assigned_au", read_only=True)
    control_type_display = serializers.CharField(
        source="get_control_type_display", read_only=True
    )
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    control_tier_display = serializers.CharField(
        source="get_control_tier_display", read_only=True
    )

    class Meta:
        model = KeyControlAssignment
        fields = (
            "id",
            "control_id",
            "is_key_control",
            "control_name",
            "framework",
            "layer",
            "grc_domain",
            "grc_theme",
            "sub_area",
            "control_type",
            "control_type_display",
            "category",
            "category_display",
            "frequency",
            "frequency_display",
            "assigned_au",
            "assigned_au_detail",
            "plan_year",
            "control_tier",
            "control_tier_display",
            "baseline_complete",
            "control_effectiveness",
            "reliance_ready",
            "testing_strategy",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ControlRelianceCycleSerializer(serializers.ModelSerializer):
    control_detail = serializers.SerializerMethodField()
    result_display = serializers.CharField(source="get_result_display", read_only=True)

    class Meta:
        model = ControlRelianceCycle
        fields = (
            "id",
            "control",
            "control_detail",
            "cycle_year",
            "result",
            "result_display",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_control_detail(self, obj) -> dict:
        return {
            "id": obj.control.id,
            "control_id": obj.control.control_id,
            "control_name": obj.control.control_name,
            "is_key_control": obj.control.is_key_control,
        }


class GRCTestingThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GRCTestingTheme
        fields = (
            "id",
            "layer",
            "domain",
            "sub_theme_code",
            "sub_theme_name",
            "control_count",
            "control_types",
            "key_evidence",
            "planned_audit_years",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class MARTestingEngagementSerializer(serializers.ModelSerializer):
    test_type_display = serializers.CharField(source="get_test_type_display", read_only=True)

    class Meta:
        model = MARTestingEngagement
        fields = (
            "id",
            "fiscal_year",
            "mar_test_area",
            "control_theme",
            "control_count",
            "au_scope",
            "test_type",
            "test_type_display",
            "sample_size",
            "quarter",
            "assigned_to",
            "estimated_hours",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class AuditPlanSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditPlanSummary
        fields = (
            "id",
            "fiscal_year",
            "planned_audits",
            "mar_required_count",
            "non_mar_count",
            "avg_priority_score",
            "estimated_total_hours",
            "coverage_notes",
            "generated_at",
        )
        read_only_fields = (
            "id",
            "planned_audits",
            "mar_required_count",
            "non_mar_count",
            "avg_priority_score",
            "estimated_total_hours",
            "generated_at",
        )


# ── Nested serializers for entity detail endpoints ────────────────────────────

class AuditPlanYearNestedSerializer(serializers.ModelSerializer):
    """Plan years embedded in an entity response (no au_detail to avoid recursion)."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AuditPlanYear
        fields = (
            "id", "fiscal_year", "planned_year", "quarter", "status",
            "status_display", "is_scheduled",
        )


class KeyControlNestedSerializer(serializers.ModelSerializer):
    """Controls embedded in an entity response."""

    control_tier_display = serializers.CharField(
        source="get_control_tier_display", read_only=True
    )
    reliance_cycles = ControlRelianceCycleSerializer(many=True, read_only=True)

    class Meta:
        model = KeyControlAssignment
        fields = (
            "id", "control_id", "is_key_control", "control_name", "framework",
            "layer", "grc_domain", "control_type", "frequency",
            "control_tier", "control_tier_display",
            "baseline_complete", "control_effectiveness", "reliance_ready",
            "testing_strategy", "reliance_cycles",
        )


class AuditableEntityDetailSerializer(AuditableEntitySerializer):
    """Full entity serializer including plan years and controls."""

    plan_years = AuditPlanYearNestedSerializer(many=True, read_only=True)
    controls = KeyControlNestedSerializer(
        source="assigned_controls", many=True, read_only=True
    )

    class Meta(AuditableEntitySerializer.Meta):
        fields = AuditableEntitySerializer.Meta.fields + ("plan_years", "controls")


# ── Bulk import serializer ─────────────────────────────────────────────────────

class AuditPlanBulkImportSerializer(serializers.Serializer):
    """
    Accepts a JSON payload for bulk-importing entities, controls, and plan years
    in a single atomic transaction.
    """

    entities = AuditableEntitySerializer(many=True, required=False)
    plan_years = AuditPlanYearSerializer(many=True, required=False)
    controls = KeyControlAssignmentSerializer(many=True, required=False)
    grc_themes = GRCTestingThemeSerializer(many=True, required=False)
    mar_engagements = MARTestingEngagementSerializer(many=True, required=False)

# Keep backwards-compatible alias
BulkImportSerializer = AuditPlanBulkImportSerializer
