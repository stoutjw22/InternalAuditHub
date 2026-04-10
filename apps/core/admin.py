from django.contrib import admin

from .models import AuditLog, BusinessObjective, BusinessProcess


@admin.register(BusinessProcess)
class BusinessProcessAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(BusinessObjective)
class BusinessObjectiveAdmin(admin.ModelAdmin):
    list_display = ("name", "business_process", "owner", "created_at")
    list_filter = ("business_process",)
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "user", "action", "entity_type", "entity_name", "ip_address")
    list_filter = ("action", "entity_type")
    search_fields = ("entity_name", "entity_type", "user__email")
    readonly_fields = [f.name for f in AuditLog._meta.get_fields()]
    ordering = ("-timestamp",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
