"""
Framework Library + Control Framework Mapping.

Models:
  CitationSource          — publication / regulatory source metadata
  Framework               — a versioned compliance/control framework
  FrameworkRequirement    — hierarchical requirements within a framework
  ControlObjective        — what a set of controls is designed to achieve
  ControlActivity         — a specific activity implementing a control objective
  ControlRequirementMapping — explicit M2M link: Control ↔ FrameworkRequirement
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class CitationSource(models.Model):
    """Metadata for a regulatory, standards, or guidance publication."""

    class SourceType(models.TextChoices):
        REGULATION = "regulation", _("Regulation / Statute")
        STANDARD = "standard", _("Industry Standard")
        GUIDANCE = "guidance", _("Regulatory Guidance")
        INTERNAL_POLICY = "internal_policy", _("Internal Policy")
        OTHER = "other", _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    source_type = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.STANDARD,
        db_index=True,
    )
    publisher = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=1000, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "frameworks_citation_source"
        verbose_name = _("Citation Source")
        verbose_name_plural = _("Citation Sources")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Framework(models.Model):
    """
    A versioned compliance or control framework (e.g. SOC 2, ISO 27001,
    PCI-DSS 4.0, NIST CSF 2.0).

    Effective dating supports tracking multiple active versions simultaneously.
    """

    class FrameworkType(models.TextChoices):
        SECURITY = "security", _("Information Security")
        PRIVACY = "privacy", _("Privacy / Data Protection")
        FINANCIAL = "financial", _("Financial Reporting")
        OPERATIONAL = "operational", _("Operational Resilience")
        COMPLIANCE = "compliance", _("Regulatory Compliance")
        GOVERNANCE = "governance", _("Governance / Ethics")
        OTHER = "other", _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    short_name = models.CharField(
        max_length=50,
        help_text="Abbreviated identifier shown in UI (e.g. SOC2, ISO27001).",
    )
    description = models.TextField(blank=True)
    framework_type = models.CharField(
        max_length=20,
        choices=FrameworkType.choices,
        default=FrameworkType.COMPLIANCE,
        db_index=True,
    )
    citation_source = models.ForeignKey(
        CitationSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="frameworks",
    )
    version = models.CharField(
        max_length=50,
        blank=True,
        help_text="Version or edition identifier (e.g. 2022, Rev 5).",
    )
    effective_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date from which this framework version is in force.",
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date after which this version is superseded.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_frameworks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "frameworks_framework"
        verbose_name = _("Framework")
        verbose_name_plural = _("Frameworks")
        ordering = ["short_name", "version"]
        indexes = [
            models.Index(fields=["framework_type", "is_active"]),
        ]

    def __str__(self) -> str:
        version_str = f" v{self.version}" if self.version else ""
        return f"{self.short_name}{version_str}"


class FrameworkRequirement(models.Model):
    """
    A single requirement, control, or clause within a Framework.
    Self-referential parent/children for hierarchical clause numbering.

    Effective dating allows a requirement to have its own lifecycle
    independent of the parent framework.
    """

    class RequirementType(models.TextChoices):
        OBJECTIVE = "objective", _("Control Objective")
        CONTROL = "control", _("Control Activity")
        POLICY = "policy", _("Policy Requirement")
        PROCEDURE = "procedure", _("Procedure Requirement")
        PRINCIPLE = "principle", _("Principle")
        CRITERION = "criterion", _("Trust Service Criterion")
        OTHER = "other", _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    framework = models.ForeignKey(
        Framework,
        on_delete=models.PROTECT,
        related_name="requirements",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Parent requirement for hierarchical clause structures.",
    )
    requirement_id = models.CharField(
        max_length=100,
        help_text="Framework-assigned identifier (e.g. CC6.1, A.9.2.3, PCI-DSS 3.4).",
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    requirement_type = models.CharField(
        max_length=20,
        choices=RequirementType.choices,
        default=RequirementType.CONTROL,
        db_index=True,
    )
    citation_source = models.ForeignKey(
        CitationSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cited_requirements",
    )
    citation_text = models.TextField(
        blank=True,
        help_text="Verbatim text from the citation source.",
    )
    effective_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "frameworks_requirement"
        verbose_name = _("Framework Requirement")
        verbose_name_plural = _("Framework Requirements")
        ordering = ["framework", "requirement_id"]
        unique_together = [("framework", "requirement_id")]
        indexes = [
            models.Index(fields=["framework", "requirement_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.framework.short_name} {self.requirement_id}: {self.title}"


class ControlObjective(models.Model):
    """
    A high-level statement of what a group of controls aims to achieve.
    Can be mapped to one or more FrameworkRequirements.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    reference_code = models.CharField(
        max_length=100,
        blank=True,
        help_text="Internal reference code (e.g. CO-001).",
    )
    framework_requirements = models.ManyToManyField(
        FrameworkRequirement,
        blank=True,
        related_name="control_objectives",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_control_objectives",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "frameworks_control_objective"
        verbose_name = _("Control Objective")
        verbose_name_plural = _("Control Objectives")
        ordering = ["reference_code", "name"]

    def __str__(self) -> str:
        prefix = f"[{self.reference_code}] " if self.reference_code else ""
        return f"{prefix}{self.name}"


class ControlActivity(models.Model):
    """
    A specific activity that implements or supports a Control and/or
    ControlObjective.  More granular than the parent Control record.
    """

    class ActivityType(models.TextChoices):
        PREVENTIVE = "preventive", _("Preventive")
        DETECTIVE = "detective", _("Detective")
        CORRECTIVE = "corrective", _("Corrective")
        DIRECTIVE = "directive", _("Directive")
        COMPENSATING = "compensating", _("Compensating")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    control = models.ForeignKey(
        "controls.Control",
        on_delete=models.PROTECT,
        related_name="activities",
    )
    control_objective = models.ForeignKey(
        ControlObjective,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )
    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices,
        default=ActivityType.PREVENTIVE,
        db_index=True,
    )
    frequency = models.CharField(
        max_length=20,
        blank=True,
        help_text="How often this specific activity runs (mirrors Control.Frequency choices).",
    )
    procedure_steps = models.TextField(
        blank=True,
        help_text="Step-by-step description of how the activity is performed.",
    )
    framework_requirements = models.ManyToManyField(
        FrameworkRequirement,
        blank=True,
        related_name="control_activities",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_control_activities",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "frameworks_control_activity"
        verbose_name = _("Control Activity")
        verbose_name_plural = _("Control Activities")
        ordering = ["control__name", "name"]

    def __str__(self) -> str:
        return f"{self.control.name} → {self.name}"


class ControlRequirementMapping(models.Model):
    """
    Explicit, metadata-rich M2M through-table linking a Control to a
    FrameworkRequirement.  Supports partial/full satisfaction annotations
    and effective dating for lifecycle management.
    """

    class MappingType(models.TextChoices):
        SATISFIES = "satisfies", _("Fully Satisfies")
        PARTIALLY_SATISFIES = "partially_satisfies", _("Partially Satisfies")
        ADDRESSES = "addresses", _("Addresses / Related")
        COMPENSATES = "compensates", _("Compensating")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    control = models.ForeignKey(
        "controls.Control",
        on_delete=models.CASCADE,
        related_name="requirement_mappings",
    )
    framework_requirement = models.ForeignKey(
        FrameworkRequirement,
        on_delete=models.CASCADE,
        related_name="control_mappings",
    )
    mapping_type = models.CharField(
        max_length=25,
        choices=MappingType.choices,
        default=MappingType.SATISFIES,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    effective_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date from which this mapping is valid.",
    )
    expiry_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date after which this mapping is no longer considered.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_control_mappings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "frameworks_control_requirement_mapping"
        verbose_name = _("Control–Requirement Mapping")
        verbose_name_plural = _("Control–Requirement Mappings")
        unique_together = [("control", "framework_requirement")]
        indexes = [
            models.Index(fields=["mapping_type"]),
            models.Index(fields=["effective_date", "expiry_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.control.name} → {self.framework_requirement}"
