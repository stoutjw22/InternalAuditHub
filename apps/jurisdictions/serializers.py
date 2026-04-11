from rest_framework import serializers

from .models import ApplicabilityLogic, Jurisdiction, RequirementOverlay


class JurisdictionSerializer(serializers.ModelSerializer):
    jurisdiction_type_display = serializers.CharField(
        source="get_jurisdiction_type_display", read_only=True
    )
    overlay_count = serializers.IntegerField(source="overlays.count", read_only=True)

    class Meta:
        model = Jurisdiction
        fields = (
            "id", "name", "short_name",
            "jurisdiction_type", "jurisdiction_type_display",
            "country", "region", "regulator_name",
            "website_url", "description",
            "is_active", "overlay_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RequirementOverlaySerializer(serializers.ModelSerializer):
    jurisdiction_name = serializers.CharField(source="jurisdiction.name", read_only=True)
    requirement_display = serializers.CharField(
        source="framework_requirement.__str__", read_only=True
    )
    overlay_type_display = serializers.CharField(
        source="get_overlay_type_display", read_only=True
    )

    class Meta:
        model = RequirementOverlay
        fields = (
            "id",
            "jurisdiction", "jurisdiction_name",
            "framework_requirement", "requirement_display",
            "overlay_type", "overlay_type_display",
            "overlay_text",
            "citation_source", "citation_reference",
            "effective_date", "expiry_date",
            "is_active",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ApplicabilityLogicSerializer(serializers.ModelSerializer):
    jurisdiction_name = serializers.CharField(source="jurisdiction.name", read_only=True)
    entity_name = serializers.CharField(
        source="auditable_entity.name", read_only=True, default=""
    )
    requirement_display = serializers.CharField(
        source="framework_requirement.__str__", read_only=True, default=""
    )
    condition_type_display = serializers.CharField(
        source="get_condition_type_display", read_only=True
    )

    class Meta:
        model = ApplicabilityLogic
        fields = (
            "id", "name", "description",
            "jurisdiction", "jurisdiction_name",
            "auditable_entity", "entity_name",
            "framework_requirement", "requirement_display",
            "condition_type", "condition_type_display",
            "condition_config",
            "is_applicable", "rationale",
            "effective_date", "expiry_date",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
