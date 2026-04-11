"""
Control models: Control, EngagementControl.

Controls mitigate one or more Risks.  During an engagement, each control
in scope gets tested (EngagementControl) and rated for effectiveness.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Control(models.Model):
    class ControlType(models.TextChoices):
        PREVENTIVE = "preventive", _("Preventive")
        DETECTIVE = "detective", _("Detective")
        CORRECTIVE = "corrective", _("Corrective")
        DIRECTIVE = "directive", _("Directive")
        COMPENSATING = "compensating", _("Compensating")

    class Frequency(models.TextChoices):
        CONTINUOUS = "continuous", _("Continuous")
        DAILY = "daily", _("Daily")
        WEEKLY = "weekly", _("Weekly")
        MONTHLY = "monthly", _("Monthly")
        QUARTERLY = "quarterly", _("Quarterly")
        ANNUALLY = "annually", _("Annually")
        AD_HOC = "ad_hoc", _("Ad-Hoc")

    class ControlStatus(models.TextChoices):
        ACTIVE = "active", _("Active")
        INACTIVE = "inactive", _("Inactive")
        DESIGN_DEFICIENCY = "design_deficiency", _("Design Deficiency")
        UNDER_REVIEW = "under_review", _("Under Review")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    control_type = models.CharField(
        max_length=20, choices=ControlType.choices, default=ControlType.PREVENTIVE, db_index=True
    )
    frequency = models.CharField(
        max_length=20, choices=Frequency.choices, default=Frequency.MONTHLY
    )
    status = models.CharField(
        max_length=20, choices=ControlStatus.choices, default=ControlStatus.ACTIVE, db_index=True
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_controls",
    )
    business_process = models.ForeignKey(
        "core.BusinessProcess",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="controls",
    )
    # Controls can mitigate multiple risks
    risks = models.ManyToManyField(
        "risks.Risk",
        related_name="controls",
        blank=True,
    )
    control_reference = models.CharField(
        max_length=50,
        blank=True,
        help_text="Internal control ID / framework reference (e.g. ISO 27001 A.9.1.1).",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_controls",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "controls_control"
        verbose_name = _("Control")
        verbose_name_plural = _("Controls")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["control_type", "status"]),
            models.Index(fields=["owner"]),
        ]

    def __str__(self) -> str:
        return self.name


class EngagementControl(models.Model):
    """
    Testing record for a Control within a specific AuditEngagement.
    """

    class TestResult(models.TextChoices):
        NOT_TESTED = "not_tested", _("Not Tested")
        PASS = "pass", _("Pass")
        FAIL = "fail", _("Fail")
        PARTIAL = "partial", _("Partial")
        NOT_APPLICABLE = "na", _("N/A")

    class EffectivenessRating(models.TextChoices):
        EFFECTIVE = "effective", _("Effective")
        PARTIALLY_EFFECTIVE = "partially_effective", _("Partially Effective")
        INEFFECTIVE = "ineffective", _("Ineffective")
        NOT_ASSESSED = "not_assessed", _("Not Assessed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(
        "engagements.AuditEngagement",
        on_delete=models.CASCADE,
        related_name="engagement_controls",
    )
    control = models.ForeignKey(
        Control,
        on_delete=models.CASCADE,
        related_name="engagement_controls",
    )
    engagement_risk = models.ForeignKey(
        "risks.EngagementRisk",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engagement_controls",
    )
    display_name = models.CharField(
        max_length=300,
        blank=True,
        help_text="Display label, e.g. 'Control Name – Risk Name'.",
    )
    test_procedure = models.TextField(blank=True, help_text="Steps taken to test this control.")
    test_result = models.CharField(
        max_length=20, choices=TestResult.choices, default=TestResult.NOT_TESTED
    )
    effectiveness_rating = models.CharField(
        max_length=25, choices=EffectivenessRating.choices, default=EffectivenessRating.NOT_ASSESSED
    )
    notes = models.TextField(blank=True)
    tested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="control_tests",
    )
    tested_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_engagement_controls",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "controls_engagement_control"
        verbose_name = _("Engagement Control")
        verbose_name_plural = _("Engagement Controls")
        unique_together = ("engagement", "control")

    def __str__(self) -> str:
        return f"{self.control} in {self.engagement}"
