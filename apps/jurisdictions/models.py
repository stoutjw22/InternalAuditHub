"""
Jurisdiction & Regulator Overlay Capability:
  Jurisdiction         — a state, federal agency, regulator, or country
  RequirementOverlay   — jurisdiction-specific interpretation or additional
                         requirement layered on top of a framework requirement
  ApplicabilityLogic   — rules that determine whether a requirement applies
                         to a given entity, with effective dating
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Jurisdiction(models.Model):
    """
    Represents a legal or regulatory authority whose requirements may
    overlay those of a base compliance framework (e.g. NYDFS, GDPR, CCPA,
    FFIEC, a specific US state, or a foreign regulator).
    """

    class JurisdictionType(models.TextChoices):
        FEDERAL = "federal", _("Federal / National")
        STATE = "state", _("State / Provincial")
        INTERNATIONAL = "international", _("International")
        REGULATOR = "regulator", _("Industry Regulator")
        SELF_REGULATORY = "self_regulatory", _("Self-Regulatory Organisation")
        OTHER = "other", _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    short_name = models.CharField(
        max_length=50,
        blank=True,
        help_text="Abbreviation (e.g. NYDFS, CCPA, GDPR).",
    )
    jurisdiction_type = models.CharField(
        max_length=20,
        choices=JurisdictionType.choices,
        default=JurisdictionType.REGULATOR,
        db_index=True,
    )
    country = models.CharField(
        max_length=100,
        blank=True,
        help_text="ISO country code or country name (e.g. US, DE, GB).",
    )
    region = models.CharField(
        max_length=100,
        blank=True,
        help_text="State/province/region within the country (e.g. New York).",
    )
    regulator_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Full name of the regulatory body (if applicable).",
    )
    website_url = models.URLField(max_length=1000, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jurisdictions_jurisdiction"
        verbose_name = _("Jurisdiction")
        verbose_name_plural = _("Jurisdictions")
        ordering = ["jurisdiction_type", "name"]

    def __str__(self) -> str:
        label = self.short_name or self.name
        region = f" ({self.region})" if self.region else ""
        return f"{label}{region}"


class RequirementOverlay(models.Model):
    """
    A jurisdiction-specific interpretation, restriction, or additional
    obligation that overlays a base FrameworkRequirement.

    Example: NYDFS Part 500 §500.12 is stricter than NIST CSF PR.AC-1,
    so a NYDFS overlay on the NIST requirement captures that delta.
    """

    class OverlayType(models.TextChoices):
        STRICTER = "stricter", _("Stricter than Base Requirement")
        EQUIVALENT = "equivalent", _("Equivalent to Base Requirement")
        EXEMPTION = "exemption", _("Provides Exemption / Safe Harbour")
        INTERPRETATION = "interpretation", _("Jurisdiction-Specific Interpretation")
        ADDITIONAL = "additional", _("Additional Obligation")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    jurisdiction = models.ForeignKey(
        Jurisdiction,
        on_delete=models.PROTECT,
        related_name="overlays",
    )
    framework_requirement = models.ForeignKey(
        "frameworks.FrameworkRequirement",
        on_delete=models.PROTECT,
        related_name="overlays",
    )
    overlay_type = models.CharField(
        max_length=20,
        choices=OverlayType.choices,
        default=OverlayType.STRICTER,
        db_index=True,
    )
    overlay_text = models.TextField(
        help_text="Jurisdiction-specific text that augments or replaces the base requirement.",
    )
    citation_source = models.ForeignKey(
        "frameworks.CitationSource",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="overlays",
    )
    citation_reference = models.CharField(
        max_length=500,
        blank=True,
        help_text="Specific section/article reference (e.g. §500.12(b)).",
    )
    effective_date = models.DateField(
        help_text="Date from which this overlay is in force.",
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date after which this overlay is superseded.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_overlays",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jurisdictions_requirement_overlay"
        verbose_name = _("Requirement Overlay")
        verbose_name_plural = _("Requirement Overlays")
        ordering = ["jurisdiction", "framework_requirement"]
        unique_together = [("jurisdiction", "framework_requirement")]
        indexes = [
            models.Index(fields=["overlay_type", "is_active"]),
            models.Index(fields=["effective_date", "expiry_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.jurisdiction.short_name or self.jurisdiction.name} — {self.framework_requirement}"


class ApplicabilityLogic(models.Model):
    """
    Defines the conditions under which a framework requirement (or overlay)
    applies to a given auditable entity within a jurisdiction.

    condition_type drives which condition_config keys are evaluated:
      - ALWAYS         → applies unconditionally
      - ENTITY_TYPE    → condition_config: {"entity_types": ["system", "vendor"]}
      - RISK_RATING    → condition_config: {"min_rating": "high"}
      - THRESHOLD      → condition_config: {"field": "asset_value", "operator": ">=", "value": 1000000}
      - CUSTOM         → condition_config: free-form JSON for bespoke logic

    Effective dating ensures obsolete rules are retained for audit trail.
    """

    class ConditionType(models.TextChoices):
        ALWAYS = "always", _("Always Applicable")
        ENTITY_TYPE = "entity_type", _("By Entity Type")
        RISK_RATING = "risk_rating", _("By Risk Rating")
        THRESHOLD = "threshold", _("By Threshold / Attribute")
        CUSTOM = "custom", _("Custom Logic")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    jurisdiction = models.ForeignKey(
        Jurisdiction,
        on_delete=models.PROTECT,
        related_name="applicability_rules",
    )
    auditable_entity = models.ForeignKey(
        "universe.AuditableEntity",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applicability_rules",
        help_text="If set, this rule is scoped to a specific entity only.",
    )
    framework_requirement = models.ForeignKey(
        "frameworks.FrameworkRequirement",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="applicability_rules",
        help_text="If set, scoped to a specific framework requirement.",
    )
    condition_type = models.CharField(
        max_length=20,
        choices=ConditionType.choices,
        default=ConditionType.ALWAYS,
        db_index=True,
    )
    condition_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON object defining evaluation parameters for the condition_type.",
    )
    is_applicable = models.BooleanField(
        default=True,
        help_text="Set to False to record an explicit non-applicability determination.",
    )
    rationale = models.TextField(
        blank=True,
        help_text="Documented rationale for the applicability determination.",
    )
    effective_date = models.DateField(
        help_text="Date from which this rule is in effect.",
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date after which this rule is superseded.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_applicability_rules",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jurisdictions_applicability_logic"
        verbose_name = _("Applicability Logic")
        verbose_name_plural = _("Applicability Logic Rules")
        ordering = ["jurisdiction", "name"]
        indexes = [
            models.Index(fields=["condition_type", "is_applicable"]),
            models.Index(fields=["effective_date", "expiry_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.jurisdiction} — {self.name}"
