from django.contrib import admin

from .models import AuditReport, AuditReportTemplate


@admin.register(AuditReportTemplate)
class AuditReportTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_by", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AuditReport)
class AuditReportAdmin(admin.ModelAdmin):
    list_display = ("title", "engagement", "status", "generated_by", "finalized_at", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "executive_summary")
    readonly_fields = ("id", "generated_by", "finalized_by", "finalized_at", "created_at", "updated_at")
    date_hierarchy = "created_at"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.generated_by = request.user
        super().save_model(request, obj, form, change)
