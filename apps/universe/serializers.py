from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import AuditableDomain, AuditableEntity, Subprocess


class AuditableDomainSerializer(serializers.ModelSerializer):
    subdomain_count = serializers.IntegerField(source="subdomains.count", read_only=True)
    entity_count = serializers.IntegerField(source="entities.count", read_only=True)
    parent_name = serializers.CharField(source="parent.name", read_only=True, default="")

    class Meta:
        model = AuditableDomain
        fields = (
            "id", "name", "description", "parent", "parent_name",
            "is_active", "subdomain_count", "entity_count",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class AuditableEntitySerializer(serializers.ModelSerializer):
    domain_name = serializers.CharField(source="domain.name", read_only=True)
    owner_detail = UserListSerializer(source="owner", read_only=True)
    entity_type_display = serializers.CharField(source="get_entity_type_display", read_only=True)
    inherent_risk_rating_display = serializers.CharField(
        source="get_inherent_risk_rating_display", read_only=True
    )
    subprocess_count = serializers.IntegerField(source="subprocesses.count", read_only=True)

    class Meta:
        model = AuditableEntity
        fields = (
            "id", "name", "description",
            "domain", "domain_name",
            "entity_type", "entity_type_display",
            "owner", "owner_detail",
            "inherent_risk_rating", "inherent_risk_rating_display",
            "audit_frequency", "last_audit_date", "next_audit_date",
            "subprocess_count",
            "is_active", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class SubprocessSerializer(serializers.ModelSerializer):
    business_process_name = serializers.CharField(
        source="business_process.name", read_only=True
    )
    auditable_entity_name = serializers.CharField(
        source="auditable_entity.name", read_only=True, default=""
    )
    owner_detail = UserListSerializer(source="owner", read_only=True)

    class Meta:
        model = Subprocess
        fields = (
            "id", "name", "description",
            "business_process", "business_process_name",
            "auditable_entity", "auditable_entity_name",
            "sequence_order", "owner", "owner_detail",
            "is_active", "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
