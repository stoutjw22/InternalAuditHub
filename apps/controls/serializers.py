from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import Control, EngagementControl


class ControlSerializer(serializers.ModelSerializer):
    owner_detail = UserListSerializer(source="owner", read_only=True)
    control_type_display = serializers.CharField(source="get_control_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    risk_count = serializers.IntegerField(source="risks.count", read_only=True)

    class Meta:
        model = Control
        fields = (
            "id", "name", "description",
            "control_type", "control_type_display",
            "frequency", "frequency_display",
            "status", "status_display",
            "owner", "owner_detail",
            "business_process",
            "risks", "risk_count",
            "control_reference",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class EngagementControlSerializer(serializers.ModelSerializer):
    control_detail = ControlSerializer(source="control", read_only=True)
    test_result_display = serializers.CharField(source="get_test_result_display", read_only=True)
    effectiveness_display = serializers.CharField(source="get_effectiveness_rating_display", read_only=True)
    tested_by_detail = UserListSerializer(source="tested_by", read_only=True)

    class Meta:
        model = EngagementControl
        fields = (
            "id", "engagement", "control", "control_detail",
            "test_procedure",
            "test_result", "test_result_display",
            "effectiveness_rating", "effectiveness_display",
            "notes",
            "tested_by", "tested_by_detail", "tested_at",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
