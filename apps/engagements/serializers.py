from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import AuditEngagement, AuditTask, EngagementAuditor


class EngagementAuditorSerializer(serializers.ModelSerializer):
    auditor_detail = UserListSerializer(source="auditor", read_only=True)

    class Meta:
        model = EngagementAuditor
        fields = ("id", "auditor", "auditor_detail", "role_note", "assigned_at")
        read_only_fields = ("id", "assigned_at")


class AuditEngagementListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    audit_manager_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AuditEngagement
        fields = (
            "id", "name", "status", "status_display",
            "audit_manager", "audit_manager_name",
            "period", "start_date", "end_date", "created_at",
        )

    def get_audit_manager_name(self, obj) -> str:
        return obj.audit_manager.get_full_name() if obj.audit_manager else ""


class AuditEngagementSerializer(serializers.ModelSerializer):
    """Full serializer for detail/create/update."""

    assigned_auditors = EngagementAuditorSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    audit_manager_detail = UserListSerializer(source="audit_manager", read_only=True)

    class Meta:
        model = AuditEngagement
        fields = (
            "id", "name", "description", "status", "status_display",
            "audit_manager", "audit_manager_detail",
            "business_process", "business_objective",
            "period", "scope", "objectives",
            "start_date", "end_date",
            "assigned_auditors",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at", "assigned_auditors")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class AuditTaskSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserListSerializer(source="assigned_to", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)

    class Meta:
        model = AuditTask
        fields = (
            "id", "engagement", "name", "description",
            "status", "status_display", "priority", "priority_display",
            "assigned_to", "assigned_to_detail",
            "due_date", "completed_at", "notes",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
