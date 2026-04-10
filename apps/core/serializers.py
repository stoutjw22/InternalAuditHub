from rest_framework import serializers

from .models import AuditLog, BusinessObjective, BusinessProcess


class BusinessProcessSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = BusinessProcess
        fields = (
            "id", "name", "description", "owner", "owner_name",
            "is_active", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def get_owner_name(self, obj) -> str:
        return obj.owner.get_full_name() if obj.owner else ""

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class BusinessObjectiveSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    process_name = serializers.SerializerMethodField()

    class Meta:
        model = BusinessObjective
        fields = (
            "id", "name", "description", "business_process", "process_name",
            "owner", "owner_name", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def get_owner_name(self, obj) -> str:
        return obj.owner.get_full_name() if obj.owner else ""

    def get_process_name(self, obj) -> str:
        return obj.business_process.name if obj.business_process else ""

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id", "user", "user_email", "action", "entity_type",
            "entity_id", "entity_name", "old_values", "new_values",
            "ip_address", "timestamp",
        )
        read_only_fields = fields

    def get_user_email(self, obj) -> str:
        return obj.user.email if obj.user else ""
