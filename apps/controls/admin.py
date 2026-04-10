from django.contrib import admin

from .models import Control, EngagementControl


@admin.register(Control)
class ControlAdmin(admin.ModelAdmin):
    list_display = ("name", "control_type", "frequency", "status", "owner", "control_reference")
    list_filter = ("control_type", "status", "frequency")
    search_fields = ("name", "description", "control_reference")
    filter_horizontal = ("risks",)
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(EngagementControl)
class EngagementControlAdmin(admin.ModelAdmin):
    list_display = ("control", "engagement", "test_result", "effectiveness_rating", "tested_at")
    list_filter = ("test_result", "effectiveness_rating")
    search_fields = ("control__name", "engagement__name")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
