"""
Risk Taxonomy: RiskCategory, RiskSubcategory, RiskScoringConfig.

Provides a structured classification hierarchy for risks and a configurable
scoring method that drives likelihood × impact calculations.
"""
import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _


class RiskCategory(models.Model):
    """Top-level risk classification bucket (e.g. Operational, Financial)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "taxonomy_risk_category"
        verbose_name = _("Risk Category")
        verbose_name_plural = _("Risk Categories")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class RiskSubcategory(models.Model):
    """Second-level classification under a RiskCategory."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        RiskCategory,
        on_delete=models.PROTECT,
        related_name="subcategories",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "taxonomy_risk_subcategory"
        verbose_name = _("Risk Subcategory")
        verbose_name_plural = _("Risk Subcategories")
        ordering = ["category__name", "name"]
        unique_together = [("category", "name")]

    def __str__(self) -> str:
        return f"{self.category.name} — {self.name}"


class RiskScoringConfig(models.Model):
    """
    Configures how raw likelihood and impact scores are combined
    and mapped to qualitative risk ratings.

    Only one config should be marked is_default=True at a time.
    The scoring_matrix JSON field supports custom overrides:
      {"critical": 20, "high": 12, "medium": 6}
    """

    class ScoringMethod(models.TextChoices):
        MULTIPLICATIVE = "multiplicative", _("Multiplicative (L × I)")
        ADDITIVE = "additive", _("Additive (L + I)")
        WEIGHTED = "weighted", _("Weighted (wL × L + wI × I)")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    scoring_method = models.CharField(
        max_length=20,
        choices=ScoringMethod.choices,
        default=ScoringMethod.MULTIPLICATIVE,
    )
    likelihood_scale = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(2), MaxValueValidator(10)],
        help_text="Maximum value on the likelihood scale (e.g. 5 = 1-5 scale).",
    )
    impact_scale = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(2), MaxValueValidator(10)],
        help_text="Maximum value on the impact scale.",
    )
    critical_threshold = models.PositiveIntegerField(
        default=20,
        help_text="Minimum score to be rated Critical.",
    )
    high_threshold = models.PositiveIntegerField(
        default=12,
        help_text="Minimum score to be rated High.",
    )
    medium_threshold = models.PositiveIntegerField(
        default=6,
        help_text="Minimum score to be rated Medium (below = Low).",
    )
    likelihood_weight = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default="1.00",
        help_text="Weight for likelihood (used with Weighted method).",
    )
    impact_weight = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default="1.00",
        help_text="Weight for impact (used with Weighted method).",
    )
    scoring_matrix = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional JSON override for custom scoring logic.",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="If true, this config is applied when no explicit config is chosen.",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_scoring_configs",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "taxonomy_risk_scoring_config"
        verbose_name = _("Risk Scoring Config")
        verbose_name_plural = _("Risk Scoring Configs")
        ordering = ["-is_default", "name"]

    def __str__(self) -> str:
        default_tag = " [default]" if self.is_default else ""
        return f"{self.name}{default_tag}"

    def compute_score(self, likelihood: int, impact: int) -> float:
        """Return numeric score given a likelihood and impact value."""
        method = self.scoring_method
        if method == self.ScoringMethod.ADDITIVE:
            return likelihood + impact
        if method == self.ScoringMethod.WEIGHTED:
            return float(self.likelihood_weight) * likelihood + float(self.impact_weight) * impact
        return likelihood * impact  # MULTIPLICATIVE default

    def rating_for_score(self, score: float) -> str:
        """Map a numeric score to a qualitative rating label."""
        if score >= self.critical_threshold:
            return "Critical"
        if score >= self.high_threshold:
            return "High"
        if score >= self.medium_threshold:
            return "Medium"
        return "Low"
