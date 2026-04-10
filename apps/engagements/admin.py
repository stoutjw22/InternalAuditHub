from django.contrib import admin

from .models import AuditEngagement, AuditTask, EngagementAuditor


class EngagementAuditorInline(admin.TabularInline):
    model = EngagementAuditor
    extra = 1
    fields = ("auditor", "role_note")


class AuditTaskInline(admin.TabularInline):
    model = AuditTask
    extra = 0
    fields = ("name", "status", "priority", "assigned_to", "due_date")
    show_change_link = True


@admin.register(AuditEngagement)
class AuditEngagementAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "audit_manager", "start_date", "end_date", "created_at")
    list_filter = ("status", "business_process")
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
    inlines = [EngagementAuditorInline, AuditTaskInline]
    date_hierarchy = "created_at"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AuditTask)
class AuditTaskAdmin(admin.ModelAdmin):
    list_display = ("name", "engagement", "status", "priority", "assigned_to", "due_date")
    list_filter = ("status", "priority")
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
    autocomplete_fields = ["engagement", "assigned_to"]
