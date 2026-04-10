import mimetypes

from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import ApprovalRequest, Evidence, Finding, RemediationAction

ALLOWED_EVIDENCE_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
    ".jpg", ".jpeg", ".png", ".gif", ".txt", ".csv",
}
MAX_EVIDENCE_MB = 25


class RemediationActionSerializer(serializers.ModelSerializer):
    owner_detail = UserListSerializer(source="owner", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RemediationAction
        fields = (
            "id", "finding", "description",
            "owner", "owner_detail",
            "due_date", "status", "status_display",
            "completion_notes", "completed_at",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class EvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserListSerializer(source="uploaded_by", read_only=True)
    file_size_kb = serializers.SerializerMethodField()

    class Meta:
        model = Evidence
        fields = (
            "id", "finding", "engagement", "task",
            "title", "description",
            "file", "original_filename", "file_size", "file_size_kb", "content_type",
            "uploaded_by", "uploaded_by_detail", "uploaded_at",
        )
        read_only_fields = (
            "id", "original_filename", "file_size", "content_type",
            "uploaded_by", "uploaded_at",
        )

    def get_file_size_kb(self, obj) -> str:
        return f"{obj.file_size / 1024:.1f} KB"

    def validate_file(self, value):
        import os

        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_EVIDENCE_EXTENSIONS:
            raise serializers.ValidationError(
                f"File type '{ext}' is not allowed. "
                f"Allowed types: {', '.join(sorted(ALLOWED_EVIDENCE_EXTENSIONS))}"
            )
        max_bytes = MAX_EVIDENCE_MB * 1024 * 1024
        if value.size > max_bytes:
            raise serializers.ValidationError(
                f"File size {value.size / 1024 / 1024:.1f} MB exceeds the {MAX_EVIDENCE_MB} MB limit."
            )
        return value

    def create(self, validated_data):
        file = validated_data.get("file")
        if file:
            validated_data["original_filename"] = file.name
            validated_data["file_size"] = file.size
            mime, _ = mimetypes.guess_type(file.name)
            validated_data["content_type"] = mime or "application/octet-stream"
        validated_data["uploaded_by"] = self.context["request"].user
        return super().create(validated_data)


class FindingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Finding
        fields = (
            "id", "title", "finding_type", "severity", "severity_display",
            "status", "status_display", "owner", "owner_name",
            "due_date", "created_at",
        )

    def get_owner_name(self, obj) -> str:
        return obj.owner.get_full_name() if obj.owner else ""


class FindingSerializer(serializers.ModelSerializer):
    """Full serializer for detail/create/update."""

    remediation_actions = RemediationActionSerializer(many=True, read_only=True)
    evidence_files = EvidenceSerializer(many=True, read_only=True)
    owner_detail = UserListSerializer(source="owner", read_only=True)
    identified_by_detail = UserListSerializer(source="identified_by", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    finding_type_display = serializers.CharField(source="get_finding_type_display", read_only=True)

    class Meta:
        model = Finding
        fields = (
            "id", "engagement",
            "title", "description",
            "finding_type", "finding_type_display",
            "severity", "severity_display",
            "status", "status_display",
            "root_cause", "management_response",
            "control", "risk",
            "owner", "owner_detail",
            "identified_by", "identified_by_detail",
            "identified_date", "due_date",
            "remediation_actions",
            "evidence_files",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        if not validated_data.get("identified_by"):
            validated_data["identified_by"] = self.context["request"].user
        return super().create(validated_data)


class ApprovalRequestSerializer(serializers.ModelSerializer):
    requested_by_detail = UserListSerializer(source="requested_by", read_only=True)
    approver_detail = UserListSerializer(source="approver", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = (
            "id", "entity_type", "entity_id", "entity_name",
            "requested_by", "requested_by_detail",
            "approver", "approver_detail",
            "status", "status_display",
            "request_notes", "review_notes",
            "requested_at", "reviewed_at",
        )
        read_only_fields = (
            "id", "requested_by", "requested_at", "reviewed_at",
        )

    def create(self, validated_data):
        validated_data["requested_by"] = self.context["request"].user
        return super().create(validated_data)
