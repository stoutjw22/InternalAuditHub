from django.contrib import admin

from .models import EngagementRisk, Risk


@admin.register(Risk)
class RiskAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "status", "inherent_score_display", "owner", "created_at")
    list_filter = ("category", "status")
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    @admin.display(description="Inherent Score")
    def inherent_score_display(self, obj):
        return f"{obj.inherent_score} ({obj.risk_rating})"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(EngagementRisk)
class EngagementRiskAdmin(admin.ModelAdmin):
    list_display = ("risk", "engagement", "is_in_scope", "created_at")
    list_filter = ("is_in_scope",)
    search_fields = ("risk__name", "engagement__name")
    readonly_fields = ("id", "created_by", "created_at")
