from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "get_full_name", "role", "department", "is_active", "is_azure_user", "date_joined")
    list_filter = ("role", "is_active", "is_azure_user", "is_staff")
    search_fields = ("email", "first_name", "last_name", "department")
    ordering = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "title", "department", "phone", "avatar")}),
        (_("Role & permissions"), {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Azure AD"), {"fields": ("azure_oid", "is_azure_user")}),
        (_("Security"), {"fields": ("must_change_password", "last_login_ip")}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "username", "first_name", "last_name", "role", "password1", "password2"),
        }),
    )

    readonly_fields = ("last_login", "date_joined", "last_login_ip")
