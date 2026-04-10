"""
Core domain models: BusinessProcess, BusinessObjective, AuditLog.

These are foundational entities referenced by most other apps.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class BusinessProcess(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_processes",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_processes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_business_process"
        verbose_name = _("Business Process")
        verbose_name_plural = _("Business Processes")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class BusinessObjective(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    business_process = models.ForeignKey(
        BusinessProcess,
        on_delete=models.CASCADE,
        related_name="objectives",
        null=True,
        blank=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_objectives",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_objectives",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "core_business_objective"
        verbose_name = _("Business Objective")
        verbose_name_plural = _("Business Objectives")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class AuditLog(models.Model):
    """
    Immutable audit trail for every create/update/delete action.
    Written by AuditLogMiddleware and explicit log() calls in views/signals.
    """

    class Action(models.TextChoices):
        CREATE = "create", _("Create")
        UPDATE = "update", _("Update")
        DELETE = "delete", _("Delete")
        VIEW = "view", _("View")
        LOGIN = "login", _("Login")
        LOGOUT = "logout", _("Logout")
        EXPORT = "export", _("Export")
        APPROVE = "approve", _("Approve")
        REJECT = "reject", _("Reject")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices, db_index=True)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=36, blank=True, db_index=True)
    entity_name = models.CharField(max_length=200, blank=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "core_audit_log"
        verbose_name = _("Audit Log")
        verbose_name_plural = _("Audit Logs")
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["user", "-timestamp"]),
        ]
        # Audit logs must never be edited or deleted
        default_permissions = ("view",)

    def __str__(self) -> str:
        return f"{self.user} {self.action} {self.entity_type} @ {self.timestamp:%Y-%m-%d %H:%M}"
