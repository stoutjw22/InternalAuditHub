from rest_framework import serializers

from apps.accounts.serializers import UserListSerializer

from .models import AssertionType, SampleItem, TestException, TestInstance, TestPlan, TestingMethod


class TestingMethodSerializer(serializers.ModelSerializer):
    method_type_display = serializers.CharField(source="get_method_type_display", read_only=True)

    class Meta:
        model = TestingMethod
        fields = (
            "id", "name", "description",
            "method_type", "method_type_display",
            "guidance", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class AssertionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssertionType
        fields = ("id", "name", "description", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class TestPlanSerializer(serializers.ModelSerializer):
    control_name = serializers.CharField(source="control.name", read_only=True)
    engagement_name = serializers.CharField(
        source="engagement.name", read_only=True, default=""
    )
    testing_method_name = serializers.CharField(
        source="testing_method.name", read_only=True, default=""
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    design_effectiveness_display = serializers.CharField(
        source="get_design_effectiveness_status_display", read_only=True
    )
    instance_count = serializers.IntegerField(source="instances.count", read_only=True)

    class Meta:
        model = TestPlan
        fields = (
            "id", "name", "description",
            "control", "control_name",
            "engagement", "engagement_name",
            "testing_method", "testing_method_name",
            "assertion_types",
            "population_description", "population_size", "sample_size",
            "sampling_method",
            "acceptance_criteria", "tolerable_exception_rate", "procedure_template",
            "design_effectiveness_status", "design_effectiveness_display",
            "status", "status_display",
            "planned_by", "planned_date",
            "instance_count",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TestInstanceSerializer(serializers.ModelSerializer):
    test_plan_name = serializers.CharField(source="test_plan.name", read_only=True)
    performed_by_detail = UserListSerializer(source="performed_by", read_only=True)
    operating_effectiveness_display = serializers.CharField(
        source="get_operating_effectiveness_status_display", read_only=True
    )
    exception_count = serializers.IntegerField(source="exceptions.count", read_only=True)
    sample_count = serializers.IntegerField(source="sample_items.count", read_only=True)
    compliance_rate = serializers.SerializerMethodField()

    class Meta:
        model = TestInstance
        fields = (
            "id", "test_plan", "test_plan_name",
            "engagement_control",
            "instance_number",
            "test_period_start", "test_period_end",
            "performed_by", "performed_by_detail", "performed_at",
            "operating_effectiveness_status", "operating_effectiveness_display",
            "conclusion", "notes",
            "exception_count", "sample_count", "compliance_rate",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def get_compliance_rate(self, obj) -> float | None:
        items = obj.sample_items.exclude(result="na")
        total = items.count()
        if total == 0:
            return None
        return round(items.filter(result="pass").count() / total * 100, 1)


class SampleItemSerializer(serializers.ModelSerializer):
    result_display = serializers.CharField(source="get_result_display", read_only=True)

    class Meta:
        model = SampleItem
        fields = (
            "id", "test_instance",
            "item_identifier", "description",
            "result", "result_display",
            "tested_date", "population_segment",
            "notes", "evidence",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class TestExceptionSerializer(serializers.ModelSerializer):
    exception_type_display = serializers.CharField(
        source="get_exception_type_display", read_only=True
    )
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)
    resolved_by_detail = UserListSerializer(source="resolved_by", read_only=True)

    class Meta:
        model = TestException
        fields = (
            "id", "test_instance", "sample_item",
            "title", "description",
            "exception_type", "exception_type_display",
            "severity", "severity_display",
            "root_cause",
            "finding",
            "resolution_notes", "resolved_at",
            "resolved_by", "resolved_by_detail",
            "created_by", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_at", "updated_at")

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
