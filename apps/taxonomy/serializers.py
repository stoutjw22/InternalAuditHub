from rest_framework import serializers

from .models import RiskCategory, RiskScoringConfig, RiskSubcategory


class RiskCategorySerializer(serializers.ModelSerializer):
    subcategory_count = serializers.IntegerField(source="subcategories.count", read_only=True)

    class Meta:
        model = RiskCategory
        fields = (
            "id", "name", "description", "is_active",
            "subcategory_count", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RiskSubcategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = RiskSubcategory
        fields = (
            "id", "category", "category_name", "name", "description",
            "is_active", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RiskScoringConfigSerializer(serializers.ModelSerializer):
    scoring_method_display = serializers.CharField(
        source="get_scoring_method_display", read_only=True
    )

    class Meta:
        model = RiskScoringConfig
        fields = (
            "id", "name", "description",
            "scoring_method", "scoring_method_display",
            "likelihood_scale", "impact_scale",
            "critical_threshold", "high_threshold", "medium_threshold",
            "likelihood_weight", "impact_weight",
            "scoring_matrix",
            "is_default", "is_active",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
