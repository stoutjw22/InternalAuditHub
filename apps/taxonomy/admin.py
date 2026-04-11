from django.contrib import admin

from .models import RiskCategory, RiskScoringConfig, RiskSubcategory


@admin.register(RiskCategory)
class RiskCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_at", "updated_at")


class RiskSubcategoryInline(admin.TabularInline):
    model = RiskSubcategory
    extra = 1
    fields = ("name", "description", "is_active")


@admin.register(RiskSubcategory)
class RiskSubcategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "created_at")
    list_filter = ("is_active", "category")
    search_fields = ("name", "description", "category__name")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(RiskScoringConfig)
class RiskScoringConfigAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "scoring_method",
        "likelihood_scale",
        "impact_scale",
        "critical_threshold",
        "high_threshold",
        "medium_threshold",
        "is_default",
        "is_active",
    )
    list_filter = ("scoring_method", "is_default", "is_active")
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
