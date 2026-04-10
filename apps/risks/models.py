"""
Risk models: Risk, EngagementRisk.

Risk score = likelihood × impact (1-25 scale).
Inherent risk is assessed before controls; residual is after.
"""
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class Risk(models.Model):
    class Category(models.TextChoices):
        OPERATIONAL = "operational", _("Operational")
        FINANCIAL = "financial", _("Financial")
        COMPLIANCE = "compliance", _("Compliance")
        STRATEGIC = "strategic", _("Strategic")
        REPUTATIONAL = "reputational", _("Reputational")
        TECHNOLOGY = "technology", _("Technology")
        FRAUD = "fraud", _("Fraud")
        OTHER = "other", _("Other")

    class RiskStatus(models.TextChoices):
        IDENTIFIED = "identified", _("Identified")
        ASSESSED = "assessed", _("Assessed")
        MITIGATED = "mitigated", _("Mitigated")
        ACCEPTED = "accepted", _("Accepted")
        CLOSED = "closed", _("Closed")

    _SCORE_VALIDATORS = [MinValueValidator(1), MaxValueValidator(5)]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OPERATIONAL, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=RiskStatus.choices, default=RiskStatus.IDENTIFIED, db_index=True
    )

    # Inherent risk (before controls)
    inherent_likelihood = models.PositiveSmallIntegerField(
        default=3, validators=_SCORE_VALIDATORS,
        help_text="1=Rare, 5=Almost certain",
    )
    inherent_impact = models.PositiveSmallIntegerField(
        default=3, validators=_SCORE_VALIDATORS,
        help_text="1=Negligible, 5=Catastrophic",
    )

    # Residual risk (after controls)
    residual_likelihood = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=_SCORE_VALIDATORS,
    )
    residual_impact = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=_SCORE_VALIDATORS,
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_risks",
    )
    business_process = models.ForeignKey(
        "core.BusinessProcess",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="risks",
    )
    business_objective = models.ForeignKey(
        "core.BusinessObjective",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="risks",
    )
    treatment_plan = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_risks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "risks_risk"
        verbose_name = _("Risk")
        verbose_name_plural = _("Risks")
        ordering = ["-inherent_likelihood", "-inherent_impact"]
        indexes = [
            models.Index(fields=["category", "status"]),
            models.Index(fields=["owner"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def inherent_score(self) -> int:
        return self.inherent_likelihood * self.inherent_impact

    @property
    def residual_score(self) -> int | None:
        if self.residual_likelihood and self.residual_impact:
            return self.residual_likelihood * self.residual_impact
        return None

    @property
    def risk_rating(self) -> str:
        """Qualitative label for inherent score."""
        score = self.inherent_score
        if score >= 20:
            return "Critical"
        if score >= 12:
            return "High"
        if score >= 6:
            return "Medium"
        return "Low"


class EngagementRisk(models.Model):
    """Links a Risk to an AuditEngagement with engagement-specific assessment."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(
        "engagements.AuditEngagement",
        on_delete=models.CASCADE,
        related_name="engagement_risks",
    )
    risk = models.ForeignKey(
        Risk,
        on_delete=models.CASCADE,
        related_name="engagement_risks",
    )
    assessment_notes = models.TextField(blank=True)
    is_in_scope = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_engagement_risks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "risks_engagement_risk"
        verbose_name = _("Engagement Risk")
        verbose_name_plural = _("Engagement Risks")
        unique_together = ("engagement", "risk")

    def __str__(self) -> str:
        return f"{self.risk} in {self.engagement}"
