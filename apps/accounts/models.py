"""
Custom User model with role-based access control.

Roles map directly to the PowerApps personas:
  auditmanager, auditor, riskowner, controlowner, findingowner
plus admin and read_only.
"""
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    ADMIN = "admin", _("Administrator")
    AUDIT_MANAGER = "audit_manager", _("Audit Manager")
    AUDITOR = "auditor", _("Auditor")
    RISK_OWNER = "risk_owner", _("Risk Owner")
    CONTROL_OWNER = "control_owner", _("Control Owner")
    FINDING_OWNER = "finding_owner", _("Finding Owner")
    READ_ONLY = "read_only", _("Read Only")


class User(AbstractUser):
    """
    Custom user model.  Email is the login credential; username is kept for
    compatibility with django-allauth and Django admin.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.READ_ONLY,
        db_index=True,
    )
    department = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # Azure AD / Entra ID fields (populated on SSO login)
    azure_oid = models.CharField(
        max_length=36,
        blank=True,
        unique=True,
        null=True,
        help_text="Azure AD object ID — set automatically on SSO login.",
    )
    is_azure_user = models.BooleanField(default=False)

    # Security tracking
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    must_change_password = models.BooleanField(
        default=False,
        help_text="Force password change on next login.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        db_table = "accounts_user"
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self) -> str:
        full = self.get_full_name()
        return f"{full} <{self.email}>" if full else self.email

    # ── Role helpers ──────────────────────────────────────────────────────────
    @property
    def is_admin_role(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_audit_manager_or_above(self) -> bool:
        return self.role in (UserRole.ADMIN, UserRole.AUDIT_MANAGER)

    @property
    def is_auditor_or_above(self) -> bool:
        return self.role in (UserRole.ADMIN, UserRole.AUDIT_MANAGER, UserRole.AUDITOR)
