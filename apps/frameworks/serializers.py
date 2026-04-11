from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import (
    CitationSource,
    ControlActivity,
    ControlObjective,
    ControlRequirementMapping,
    Framework,
    FrameworkRequirement,
)


class CitationSourceSerializer(serializers.ModelSerializer):
    source_type_display = serializers.CharField(source="get_source_type_display", read_only=True)

    class Meta:
        model = CitationSource
        fields = (
            "id", "name", "source_type", "source_type_display",
            "publisher", "url", "publication_date", "notes",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class FrameworkSerializer(serializers.ModelSerializer):
    framework_type_display = serializers.CharField(
        source="get_framework_type_display", read_only=True
    )
    citation_source_name = serializers.CharField(
        source="citation_source.name", read_only=True, default=""
    )
    requirement_count = serializers.IntegerField(source="requirements.count", read_only=True)

    class Meta:
        model = Framework
        fields = (
            "id", "name", "short_name", "description",
            "framework_type", "framework_type_display",
            "citation_source", "citation_source_name",
            "version", "effective_date", "expiry_date",
            "is_active", "requirement_count",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class FrameworkRequirementSerializer(serializers.ModelSerializer):
    framework_name = serializers.CharField(source="framework.short_name", read_only=True)
    requirement_type_display = serializers.CharField(
        source="get_requirement_type_display", read_only=True
    )
    parent_requirement_id = serializers.CharField(
        source="parent.requirement_id", read_only=True, default=""
    )
    child_count = serializers.IntegerField(source="children.count", read_only=True)

    class Meta:
        model = FrameworkRequirement
        fields = (
            "id",
            "framework", "framework_name",
            "parent", "parent_requirement_id",
            "requirement_id", "title", "description",
            "requirement_type", "requirement_type_display",
            "citation_source", "citation_text",
            "effective_date", "expiry_date",
            "is_active", "child_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class ControlObjectiveSerializer(serializers.ModelSerializer):
    created_by_detail = UserListSerializer(source="created_by", read_only=True)
    requirement_count = serializers.IntegerField(
        source="framework_requirements.count", read_only=True
    )
    activity_count = serializers.IntegerField(source="activities.count", read_only=True)

    class Meta:
        model = ControlObjective
        fields = (
            "id", "name", "description", "reference_code",
            "framework_requirements",
            "requirement_count", "activity_count",
            "is_active",
            "created_by", "created_by_detail",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ControlActivitySerializer(serializers.ModelSerializer):
    control_name = serializers.CharField(source="control.name", read_only=True)
    objective_name = serializers.CharField(
        source="control_objective.name", read_only=True, default=""
    )
    activity_type_display = serializers.CharField(
        source="get_activity_type_display", read_only=True
    )

    class Meta:
        model = ControlActivity
        fields = (
            "id", "name", "description",
            "control", "control_name",
            "control_objective", "objective_name",
            "activity_type", "activity_type_display",
            "frequency", "procedure_steps",
            "framework_requirements",
            "is_active",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ControlRequirementMappingSerializer(serializers.ModelSerializer):
    control_name = serializers.CharField(source="control.name", read_only=True)
    requirement_display = serializers.CharField(
        source="framework_requirement.__str__", read_only=True
    )
    mapping_type_display = serializers.CharField(
        source="get_mapping_type_display", read_only=True
    )

    class Meta:
        model = ControlRequirementMapping
        fields = (
            "id",
            "control", "control_name",
            "framework_requirement", "requirement_display",
            "mapping_type", "mapping_type_display",
            "notes", "effective_date", "expiry_date",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
