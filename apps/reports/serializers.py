from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import AuditReport, AuditReportTemplate


class AuditReportTemplateSerializer(serializers.ModelSerializer):
    created_by_detail = UserListSerializer(source="created_by", read_only=True)

    class Meta:
        model = AuditReportTemplate
        fields = (
            "id", "name", "description", "content_template",
            "sharepoint_template_url",
            "is_active", "created_by", "created_by_detail",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class AuditReportListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    generated_by_name = serializers.SerializerMethodField()
    engagement_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditReport
        fields = (
            "id", "engagement", "engagement_name", "title", "status", "status_display",
            "generated_by", "generated_by_name", "finalized_at", "created_at",
        )

    def get_generated_by_name(self, obj) -> str:
        return obj.generated_by.get_full_name() if obj.generated_by else ""

    def get_engagement_name(self, obj) -> str:
        return obj.engagement.name if obj.engagement_id else ""


class AuditReportSerializer(serializers.ModelSerializer):
    generated_by_detail = UserListSerializer(source="generated_by", read_only=True)
    finalized_by_detail = UserListSerializer(source="finalized_by", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AuditReport
        fields = (
            "id", "engagement", "template",
            "title", "executive_summary", "content",
            "status", "status_display",
            "distribution_list",
            "sharepoint_report_url",
            "generated_by", "generated_by_detail",
            "finalized_by", "finalized_by_detail",
            "finalized_at", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "generated_by", "finalized_by", "finalized_at",
            "created_at", "updated_at",
        )

    def create(self, validated_data):
        validated_data["generated_by"] = self.context["request"].user
        return super().create(validated_data)
