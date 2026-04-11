from django.contrib import admin

from .models import AuditableDomain, AuditableEntity, Subprocess


class SubdomainInline(admin.TabularInline):
    model = AuditableDomain
    fk_name = "parent"
    extra = 0
    fields = ("name", "description", "is_active")
    verbose_name = "Subdomain"
    verbose_name_plural = "Subdomains"


@admin.register(AuditableDomain)
class AuditableDomainAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")
    inlines = [SubdomainInline]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class SubprocessInline(admin.TabularInline):
    model = Subprocess
    extra = 0
    fields = ("name", "sequence_order", "owner", "is_active")


@admin.register(AuditableEntity)
class AuditableEntityAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "domain",
        "entity_type",
        "inherent_risk_rating",
        "owner",
        "next_audit_date",
        "is_active",
    )
    list_filter = ("entity_type", "inherent_risk_rating", "is_active", "domain")
    search_fields = ("name", "description", "domain__name")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Subprocess)
class SubprocessAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "business_process",
        "auditable_entity",
        "sequence_order",
        "owner",
        "is_active",
    )
    list_filter = ("is_active", "business_process")
    search_fields = ("name", "description", "business_process__name")
    readonly_fields = ("id", "created_by", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
