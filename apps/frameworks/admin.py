from django.contrib import admin

from .models import (
    CitationSource,
    ControlActivity,
    ControlObjective,
    ControlRequirementMapping,
    Framework,
    FrameworkRequirement,
)


@admin.register(CitationSource)
class CitationSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "source_type", "publisher", "publication_date")
    list_filter = ("source_type",)
    search_fields = ("name", "publisher")
    readonly_fields = ("id", "created_at", "updated_at")


class FrameworkRequirementInline(admin.TabularInline):
    model = FrameworkRequirement
    extra = 0
    fields = ("requirement_id", "title", "requirement_type", "is_active")


@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):
    list_display = (
        "short_name",
        "name",
        "framework_type",
        "version",
        "effective_date",
        "expiry_date",
        "is_active",
    )
    list_filter = ("framework_type", "is_active")
    search_fields = ("name", "short_name", "version")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
    inlines = [FrameworkRequirementInline]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class ChildRequirementInline(admin.TabularInline):
    model = FrameworkRequirement
    fk_name = "parent"
    extra = 0
    fields = ("requirement_id", "title", "requirement_type", "is_active")
    verbose_name = "Child Requirement"
    verbose_name_plural = "Child Requirements"


@admin.register(FrameworkRequirement)
class FrameworkRequirementAdmin(admin.ModelAdmin):
    list_display = (
        "requirement_id",
        "framework",
        "title",
        "requirement_type",
        "effective_date",
        "expiry_date",
        "is_active",
    )
    list_filter = ("framework", "requirement_type", "is_active")
    search_fields = ("requirement_id", "title", "description")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [ChildRequirementInline]


@admin.register(ControlObjective)
class ControlObjectiveAdmin(admin.ModelAdmin):
    list_display = ("reference_code", "name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("reference_code", "name", "description")
    filter_horizontal = ("framework_requirements",)
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ControlActivity)
class ControlActivityAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "control",
        "control_objective",
        "activity_type",
        "frequency",
        "is_active",
    )
    list_filter = ("activity_type", "is_active")
    search_fields = ("name", "description", "control__name")
    filter_horizontal = ("framework_requirements",)
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ControlRequirementMapping)
class ControlRequirementMappingAdmin(admin.ModelAdmin):
    list_display = (
        "control",
        "framework_requirement",
        "mapping_type",
        "effective_date",
        "expiry_date",
    )
    list_filter = ("mapping_type",)
    search_fields = (
        "control__name",
        "framework_requirement__requirement_id",
        "framework_requirement__title",
    )
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
