from django.contrib import admin

from .models import ApplicabilityLogic, Jurisdiction, RequirementOverlay


class RequirementOverlayInline(admin.TabularInline):
    model = RequirementOverlay
    extra = 0
    fields = ("framework_requirement", "overlay_type", "effective_date", "expiry_date", "is_active")


@admin.register(Jurisdiction)
class JurisdictionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "short_name",
        "jurisdiction_type",
        "country",
        "region",
        "is_active",
    )
    list_filter = ("jurisdiction_type", "is_active", "country")
    search_fields = ("name", "short_name", "regulator_name", "country", "region")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [RequirementOverlayInline]


@admin.register(RequirementOverlay)
class RequirementOverlayAdmin(admin.ModelAdmin):
    list_display = (
        "jurisdiction",
        "framework_requirement",
        "overlay_type",
        "effective_date",
        "expiry_date",
        "is_active",
    )
    list_filter = ("overlay_type", "is_active", "jurisdiction")
    search_fields = (
        "jurisdiction__name",
        "framework_requirement__requirement_id",
        "framework_requirement__title",
        "citation_reference",
    )
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ApplicabilityLogic)
class ApplicabilityLogicAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "jurisdiction",
        "condition_type",
        "is_applicable",
        "effective_date",
        "expiry_date",
    )
    list_filter = ("condition_type", "is_applicable", "jurisdiction")
    search_fields = ("name", "description", "jurisdiction__name")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
