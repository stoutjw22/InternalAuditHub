"""
Auditable Universe Hierarchy:
  AuditableDomain → AuditableEntity → (linked to BusinessProcess) → Subprocess

Provides the structural layer above individual processes so audit scope
can be defined at domain or entity level.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditableDomain(models.Model):
    """
    Top-level organisational grouping (e.g. Finance, Technology, Operations).
    Supports a single level of parent/child nesting for sub-domains.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subdomains",
        help_text="Optional parent domain for subdirectory nesting.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_domains",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "universe_auditable_domain"
        verbose_name = _("Auditable Domain")
        verbose_name_plural = _("Auditable Domains")
        ordering = ["name"]

    def __str__(self) -> str:
        if self.parent:
            return f"{self.parent.name} / {self.name}"
        return self.name


class AuditableEntity(models.Model):
    """
    A discrete, auditable unit within a domain (e.g. Accounts Payable,
    Core Banking System, Third-Party Vendor – Acme Corp).
    """

    class EntityType(models.TextChoices):
        PROCESS = "process", _("Business Process")
        SYSTEM = "system", _("IT System / Application")
        ORG_UNIT = "org_unit", _("Organisational Unit")
        VENDOR = "vendor", _("Third-Party / Vendor")
        PRODUCT = "product", _("Product / Service")
        LOCATION = "location", _("Physical Location")
        OTHER = "other", _("Other")

    class InherentRiskRating(models.TextChoices):
        CRITICAL = "critical", _("Critical")
        HIGH = "high", _("High")
        MEDIUM = "medium", _("Medium")
        LOW = "low", _("Low")
        NOT_RATED = "not_rated", _("Not Rated")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    domain = models.ForeignKey(
        AuditableDomain,
        on_delete=models.PROTECT,
        related_name="entities",
    )
    entity_type = models.CharField(
        max_length=20,
        choices=EntityType.choices,
        default=EntityType.PROCESS,
        db_index=True,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_entities",
    )
    inherent_risk_rating = models.CharField(
        max_length=20,
        choices=InherentRiskRating.choices,
        default=InherentRiskRating.NOT_RATED,
        db_index=True,
    )
    audit_frequency = models.CharField(
        max_length=50,
        blank=True,
        help_text="How often this entity should be audited (e.g. Annual, Biennial).",
    )
    last_audit_date = models.DateField(null=True, blank=True)
    next_audit_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_entities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "universe_auditable_entity"
        verbose_name = _("Auditable Entity")
        verbose_name_plural = _("Auditable Entities")
        ordering = ["domain__name", "name"]
        indexes = [
            models.Index(fields=["domain", "entity_type"]),
            models.Index(fields=["inherent_risk_rating"]),
        ]

    def __str__(self) -> str:
        return f"{self.domain.name} — {self.name}"


class Subprocess(models.Model):
    """
    A subprocess or activity that falls under a BusinessProcess.

    Optionally linked to an AuditableEntity for traceability from
    universe → process → subprocess.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    business_process = models.ForeignKey(
        "core.BusinessProcess",
        on_delete=models.PROTECT,
        related_name="subprocesses",
    )
    auditable_entity = models.ForeignKey(
        AuditableEntity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subprocesses",
    )
    sequence_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order within the parent process.",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_subprocesses",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_subprocesses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "universe_subprocess"
        verbose_name = _("Subprocess / Activity")
        verbose_name_plural = _("Subprocesses / Activities")
        ordering = ["business_process__name", "sequence_order", "name"]
        indexes = [
            models.Index(fields=["business_process", "sequence_order"]),
        ]

    def __str__(self) -> str:
        return f"{self.business_process.name} → {self.name}"
