from django.contrib import admin

from .models import AssertionType, SampleItem, TestException, TestInstance, TestPlan, TestingMethod


@admin.register(TestingMethod)
class TestingMethodAdmin(admin.ModelAdmin):
    list_display = ("name", "method_type", "created_at")
    list_filter = ("method_type",)
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(AssertionType)
class AssertionTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_at", "updated_at")


class TestInstanceInline(admin.TabularInline):
    model = TestInstance
    extra = 0
    fields = (
        "instance_number",
        "test_period_start",
        "test_period_end",
        "performed_by",
        "operating_effectiveness_status",
    )
    readonly_fields = ("instance_number",)


@admin.register(TestPlan)
class TestPlanAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "control",
        "engagement",
        "status",
        "design_effectiveness_status",
        "planned_date",
    )
    list_filter = ("status", "design_effectiveness_status", "sampling_method")
    search_fields = ("name", "description", "control__name")
    filter_horizontal = ("assertion_types",)
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
    inlines = [TestInstanceInline]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class SampleItemInline(admin.TabularInline):
    model = SampleItem
    extra = 0
    fields = ("item_identifier", "result", "notes")


class TestExceptionInline(admin.TabularInline):
    model = TestException
    extra = 0
    fields = ("title", "exception_type", "severity", "resolved_at")


@admin.register(TestInstance)
class TestInstanceAdmin(admin.ModelAdmin):
    list_display = (
        "test_plan",
        "instance_number",
        "test_period_start",
        "test_period_end",
        "performed_by",
        "operating_effectiveness_status",
    )
    list_filter = ("operating_effectiveness_status",)
    search_fields = ("test_plan__name", "conclusion")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [SampleItemInline, TestExceptionInline]


@admin.register(SampleItem)
class SampleItemAdmin(admin.ModelAdmin):
    list_display = ("item_identifier", "test_instance", "result", "created_at")
    list_filter = ("result",)
    search_fields = ("item_identifier", "description")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(TestException)
class TestExceptionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "test_instance",
        "exception_type",
        "severity",
        "resolved_at",
        "resolved_by",
    )
    list_filter = ("exception_type", "severity")
    search_fields = ("title", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
