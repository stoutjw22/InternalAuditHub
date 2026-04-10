from django.contrib import admin

from .models import ApprovalRequest, Evidence, Finding, RemediationAction


class RemediationActionInline(admin.TabularInline):
    model = RemediationAction
    extra = 0
    fields = ("description", "owner", "due_date", "status")
    show_change_link = True


class EvidenceInline(admin.TabularInline):
    model = Evidence
    extra = 0
    fields = ("title", "file", "uploaded_by", "uploaded_at")
    readonly_fields = ("uploaded_at",)


@admin.register(Finding)
class FindingAdmin(admin.ModelAdmin):
    list_display = ("title", "engagement", "severity", "status", "owner", "due_date", "created_at")
    list_filter = ("severity", "status", "finding_type")
    search_fields = ("title", "description", "root_cause")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
    inlines = [RemediationActionInline, EvidenceInline]
    date_hierarchy = "created_at"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
            if not obj.identified_by:
                obj.identified_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(RemediationAction)
class RemediationActionAdmin(admin.ModelAdmin):
    list_display = ("finding", "status", "owner", "due_date", "completed_at")
    list_filter = ("status",)
    search_fields = ("description", "finding__title")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ("entity_type", "entity_name", "requested_by", "approver", "status", "requested_at")
    list_filter = ("entity_type", "status")
    search_fields = ("entity_name",)
    readonly_fields = ("id", "requested_at", "reviewed_at")
