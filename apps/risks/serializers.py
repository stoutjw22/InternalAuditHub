from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import EngagementRisk, Risk


class RiskSerializer(serializers.ModelSerializer):
    inherent_score = serializers.IntegerField(read_only=True)
    residual_score = serializers.IntegerField(read_only=True)
    risk_rating = serializers.CharField(read_only=True)
    owner_detail = UserListSerializer(source="owner", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Risk
        fields = (
            "id", "name", "description",
            "category", "category_display", "status", "status_display",
            "inherent_likelihood", "inherent_impact", "inherent_score",
            "residual_likelihood", "residual_impact", "residual_score",
            "risk_rating",
            "owner", "owner_detail",
            "business_process", "business_objective",
            "treatment_plan",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class EngagementRiskSerializer(serializers.ModelSerializer):
    risk_detail = RiskSerializer(source="risk", read_only=True)
    objective_name = serializers.SerializerMethodField()
    objective_id = serializers.SerializerMethodField()

    class Meta:
        model = EngagementRisk
        fields = (
            "id", "engagement", "risk", "risk_detail",
            "objective", "objective_name", "objective_id",
            "display_name",
            "assessment_notes", "is_in_scope",
            "created_by", "created_at",
        )
        read_only_fields = ("id", "created_by", "created_at")

    def get_objective_name(self, obj) -> str:
        return obj.objective.name if obj.objective else ""

    def get_objective_id(self, obj) -> str:
        return str(obj.objective.id) if obj.objective else ""

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
