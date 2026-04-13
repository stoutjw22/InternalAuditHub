"""
6-Year Integrated Audit Plan models.

Covers all data structures for the IA_Integrated_6Year_Plan workbook:
  79 auditable entities, 724 controls, FY2026-FY2030 risk-based plan,
  and FY2031 Year-6 MAR testing plan.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditableEntity(models.Model):
    """
    A single auditable entity (AU) from the integrated 6-year plan.
    Each AU is a discrete business process or system that can be audited.
    """

    class Domain(models.TextChoices):
        CYBERSECURITY = "Cybersecurity", _("Cybersecurity")
        BUSINESS_CONTINUITY = "Business Continuity", _("Business Continuity")
        CLAIMS = "Claims", _("Claims")
        THIRD_PARTY_RISK = "Third-Party Risk", _("Third-Party Risk")
        FINANCIAL_REPORTING = "Financial Reporting", _("Financial Reporting")
        ACTUARIAL_ERM = "Actuarial / ERM", _("Actuarial / ERM")
        IT_INFRASTRUCTURE = "IT Infrastructure", _("IT Infrastructure")
        IT_SDLC = "IT / SDLC", _("IT / SDLC")
        ERM_GOVERNANCE = "ERM / Governance", _("ERM / Governance")
        CLAIMS_FRAUD = "Claims / Fraud", _("Claims / Fraud")
        CLAIMS_UW_AGENCY = "Claims/UW/Agency", _("Claims/UW/Agency")
        UNDERWRITING = "Underwriting", _("Underwriting")
        DATA_GOVERNANCE = "Data Governance", _("Data Governance")
        COMPLIANCE = "Compliance", _("Compliance")
        HR = "HR", _("HR")
        ACTUARIAL = "Actuarial", _("Actuarial")
        MARKET_CONDUCT = "Market Conduct", _("Market Conduct")
        LEGAL_GOVERNANCE = "Legal / Governance", _("Legal / Governance")
        IT_ASSET_MGMT = "IT Asset Mgmt", _("IT Asset Mgmt")
        OPERATIONS = "Operations", _("Operations")
        IT_OPERATIONS = "IT Operations", _("IT Operations")
        POLICY_ADMIN = "Policy Admin", _("Policy Admin")
        PHYSICAL_SECURITY = "Physical Security", _("Physical Security")
        GOVERNANCE = "Governance", _("Governance")

    class ResidualLevel(models.TextChoices):
        CRITICAL = "Critical", _("Critical")
        HIGH = "High", _("High")
        MEDIUM = "Medium", _("Medium")
        LOW = "Low", _("Low")

    au_id = models.CharField(max_length=20, unique=True, db_index=True, help_text="e.g. AU-070")
    name = models.CharField(max_length=300)
    domain = models.CharField(max_length=50, choices=Domain.choices, db_index=True)
    rank = models.IntegerField(null=True, blank=True, help_text="Priority rank from plan")
    priority_score = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )
    residual_level = models.CharField(
        max_length=10, choices=ResidualLevel.choices, null=True, blank=True, db_index=True
    )
    mar_required = models.BooleanField(
        default=False, help_text="Whether MAR testing is required for this AU"
    )
    primary_clusters = models.CharField(
        max_length=200, null=True, blank=True, help_text="e.g. GS-02, SC-01, AC-02"
    )
    frameworks = models.CharField(
        max_length=300, null=True, blank=True, help_text="e.g. NIST CSF 2.0, Iowa 507E, SOC 2"
    )
    risk_count = models.IntegerField(null=True, blank=True)
    key_control_ids = models.TextField(
        null=True, blank=True, help_text="Comma-separated CTL IDs"
    )
    agile_scope = models.TextField(null=True, blank=True)
    estimated_hours = models.IntegerField(null=True, blank=True)
    erm_risk_category = models.CharField(max_length=100, null=True, blank=True)
    risk_appetite_threshold = models.CharField(max_length=100, null=True, blank=True)
    exceeds_appetite = models.CharField(max_length=50, null=True, blank=True)
    frequency_override_triggers = models.CharField(max_length=300, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_auditable_entity"
        verbose_name = _("Auditable Entity")
        verbose_name_plural = _("Auditable Entities")
        ordering = ["rank", "au_id"]
        indexes = [
            models.Index(fields=["domain", "residual_level"]),
            models.Index(fields=["mar_required"]),
        ]

    def __str__(self) -> str:
        return f"{self.au_id} — {self.name}"


class AuditPlanYear(models.Model):
    """
    Represents whether an AuditableEntity is scheduled in a given fiscal year,
    and tracks the planned quarter and execution status.
    """

    class Status(models.TextChoices):
        NOT_STARTED = "Not Started", _("Not Started")
        IN_PROGRESS = "In Progress", _("In Progress")
        COMPLETE = "Complete", _("Complete")
        DEFERRED = "Deferred", _("Deferred")

    class Quarter(models.TextChoices):
        Q1 = "Q1", _("Q1")
        Q2 = "Q2", _("Q2")
        Q3 = "Q3", _("Q3")
        Q4 = "Q4", _("Q4")

    au = models.ForeignKey(
        AuditableEntity,
        on_delete=models.CASCADE,
        related_name="plan_years",
    )
    fiscal_year = models.IntegerField(db_index=True, help_text="2026–2031")
    planned_year = models.IntegerField(
        null=True, blank=True, help_text="The year this AU is actually scheduled"
    )
    quarter = models.CharField(
        max_length=2, choices=Quarter.choices, null=True, blank=True
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.NOT_STARTED, db_index=True
    )
    is_scheduled = models.BooleanField(
        default=False, help_text="Whether the AU appears in this fiscal year (● marker)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_year"
        verbose_name = _("Audit Plan Year")
        verbose_name_plural = _("Audit Plan Years")
        unique_together = ("au", "fiscal_year")
        ordering = ["fiscal_year", "au__rank"]

    def __str__(self) -> str:
        return f"{self.au.au_id} FY{self.fiscal_year}"


class RiskScoringConfig(models.Model):
    """
    Risk scoring factors and their weighted score label definitions.
    The 5 factors sum to 100% weight.
    """

    factor = models.CharField(max_length=100, help_text="e.g. Financial Impact")
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="e.g. 0.30 for 30%"
    )
    score_1_label = models.CharField(max_length=200)
    score_2_label = models.CharField(max_length=200)
    score_3_label = models.CharField(max_length=200)
    score_4_label = models.CharField(max_length=200)
    score_5_label = models.CharField(max_length=200)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_risk_scoring_config"
        verbose_name = _("Risk Scoring Config")
        verbose_name_plural = _("Risk Scoring Configs")
        ordering = ["-weight"]

    def __str__(self) -> str:
        return f"{self.factor} ({self.weight * 100:.0f}%)"


class ControlEffectivenessScale(models.Model):
    """
    The 5-level control effectiveness scoring scale (1.00 down to 0.00).
    Used in the residual risk formula: Residual = Inherent × (1 − Effectiveness).
    """

    score = models.DecimalField(
        max_digits=4, decimal_places=2, unique=True, help_text="0.00–1.00"
    )
    label = models.CharField(
        max_length=50, help_text="e.g. Fully Effective"
    )
    meaning = models.TextField()
    typical_signal = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_control_effectiveness_scale"
        verbose_name = _("Control Effectiveness Scale")
        verbose_name_plural = _("Control Effectiveness Scales")
        ordering = ["-score"]

    def __str__(self) -> str:
        return f"{self.label} ({self.score})"


class KeyControlAssignment(models.Model):
    """
    A key control from the 724-control master list, optionally assigned to an AU.
    The ★ flag marks controls designated as key for reliance testing.
    """

    class ControlType(models.TextChoices):
        DIRECTIVE = "Directive", _("Directive")
        PREVENTIVE = "Preventive", _("Preventive")
        DETECTIVE = "Detective", _("Detective")
        CORRECTIVE = "Corrective", _("Corrective")

    class Category(models.TextChoices):
        ADMINISTRATIVE = "Administrative", _("Administrative")
        TECHNICAL = "Technical", _("Technical")
        PHYSICAL = "Physical", _("Physical")

    class Frequency(models.TextChoices):
        ANNUAL = "Annual", _("Annual")
        QUARTERLY = "Quarterly", _("Quarterly")
        MONTHLY = "Monthly", _("Monthly")
        CONTINUOUS = "Continuous", _("Continuous")

    class ControlTier(models.TextChoices):
        TIER_1 = "Tier 1 (MAR/Fin Rptg)", _("Tier 1 (MAR/Fin Rptg)")
        TIER_2 = "Tier 2 (Key Ops/Reg)", _("Tier 2 (Key Ops/Reg)")
        TIER_3 = "Tier 3 (Supporting)", _("Tier 3 (Supporting)")

    control_id = models.CharField(
        max_length=20, db_index=True, help_text="e.g. CTL-285"
    )
    is_key_control = models.BooleanField(
        default=False, help_text="★ flag — key control for reliance testing"
    )
    control_name = models.CharField(max_length=300)
    framework = models.CharField(max_length=100, null=True, blank=True)
    layer = models.CharField(
        max_length=50, null=True, blank=True, help_text="GOVERNANCE, OPERATIONS, etc."
    )
    grc_domain = models.CharField(max_length=100, null=True, blank=True)
    grc_theme = models.CharField(max_length=100, null=True, blank=True)
    sub_area = models.CharField(max_length=100, null=True, blank=True)
    control_type = models.CharField(
        max_length=20, choices=ControlType.choices, null=True, blank=True
    )
    category = models.CharField(
        max_length=20, choices=Category.choices, null=True, blank=True
    )
    frequency = models.CharField(
        max_length=15, choices=Frequency.choices, null=True, blank=True
    )
    assigned_au = models.ForeignKey(
        AuditableEntity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_controls",
    )
    plan_year = models.IntegerField(null=True, blank=True)
    control_tier = models.CharField(
        max_length=30, choices=ControlTier.choices, null=True, blank=True
    )
    baseline_complete = models.BooleanField(default=False)
    control_effectiveness = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True,
        help_text="0.00–1.00"
    )
    reliance_ready = models.BooleanField(default=False)
    testing_strategy = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_key_control_assignment"
        verbose_name = _("Key Control Assignment")
        verbose_name_plural = _("Key Control Assignments")
        ordering = ["control_id"]
        indexes = [
            models.Index(fields=["control_tier", "plan_year"]),
            models.Index(fields=["is_key_control", "reliance_ready"]),
        ]

    def __str__(self) -> str:
        star = "★ " if self.is_key_control else ""
        return f"{star}{self.control_id} — {self.control_name}"


class ControlRelianceCycle(models.Model):
    """
    3-year reliance testing cycle results for a key control (FY2026–FY2028).
    Three consecutive clean cycles qualify a control as Reliance Ready.
    """

    class Result(models.TextChoices):
        CLEAN = "Clean", _("Clean")
        EXCEPTIONS = "Exceptions", _("Exceptions")
        NOT_TESTED = "Not Tested", _("Not Tested")

    control = models.ForeignKey(
        KeyControlAssignment,
        on_delete=models.CASCADE,
        related_name="reliance_cycles",
    )
    cycle_year = models.IntegerField(help_text="2026, 2027, or 2028")
    result = models.CharField(
        max_length=15, choices=Result.choices, null=True, blank=True
    )
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_control_reliance_cycle"
        verbose_name = _("Control Reliance Cycle")
        verbose_name_plural = _("Control Reliance Cycles")
        unique_together = ("control", "cycle_year")
        ordering = ["control", "cycle_year"]

    def __str__(self) -> str:
        return f"{self.control.control_id} FY{self.cycle_year}: {self.result or 'Not Tested'}"


class GRCTestingTheme(models.Model):
    """
    GRC Testing themes and sub-themes used to organize the 724 controls
    across audit cycles.
    """

    layer = models.CharField(
        max_length=50, db_index=True, help_text="GOVERNANCE, OPERATIONS, etc."
    )
    domain = models.CharField(
        max_length=100, help_text="e.g. GOV-1  Enterprise & IT Governance"
    )
    sub_theme_code = models.CharField(
        max_length=20, help_text="e.g. GOV-1.1"
    )
    sub_theme_name = models.CharField(
        max_length=200, help_text="e.g. Organizational Strategy & Mission"
    )
    control_count = models.IntegerField(null=True, blank=True)
    control_types = models.CharField(max_length=200, null=True, blank=True)
    key_evidence = models.TextField(null=True, blank=True)
    planned_audit_years = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_grc_testing_theme"
        verbose_name = _("GRC Testing Theme")
        verbose_name_plural = _("GRC Testing Themes")
        ordering = ["layer", "sub_theme_code"]

    def __str__(self) -> str:
        return f"{self.sub_theme_code} — {self.sub_theme_name}"


class MARTestingEngagement(models.Model):
    """
    Year 6 (FY2031) MAR testing engagements.
    Covers all Model Audit Rule / ICFR testing planned for the sixth year.
    """

    class TestType(models.TextChoices):
        DESIGN_AND_EFFECTIVENESS = "Design + Effectiveness", _("Design + Effectiveness")
        EFFECTIVENESS = "Effectiveness", _("Effectiveness")
        INSPECTION = "Inspection", _("Inspection")

    fiscal_year = models.IntegerField(default=2031)
    mar_test_area = models.CharField(
        max_length=200, help_text="e.g. ICFR — Financial Close & Reporting"
    )
    control_theme = models.CharField(max_length=200)
    control_count = models.IntegerField(null=True, blank=True)
    au_scope = models.TextField(null=True, blank=True)
    test_type = models.CharField(
        max_length=30, choices=TestType.choices, null=True, blank=True
    )
    sample_size = models.IntegerField(null=True, blank=True)
    quarter = models.CharField(max_length=2, null=True, blank=True)
    assigned_to = models.CharField(max_length=100, null=True, blank=True)
    estimated_hours = models.IntegerField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_mar_testing_engagement"
        verbose_name = _("MAR Testing Engagement")
        verbose_name_plural = _("MAR Testing Engagements")
        ordering = ["fiscal_year", "mar_test_area"]

    def __str__(self) -> str:
        return f"FY{self.fiscal_year} MAR: {self.mar_test_area}"


class AuditPlanSummary(models.Model):
    """
    Cached / computed summary statistics per fiscal year.
    Populated via the seed_audit_plan management command and refreshed
    after bulk imports.
    """

    fiscal_year = models.IntegerField(unique=True)
    planned_audits = models.IntegerField(default=0)
    mar_required_count = models.IntegerField(default=0)
    non_mar_count = models.IntegerField(default=0)
    avg_priority_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    estimated_total_hours = models.IntegerField(default=0)
    coverage_notes = models.TextField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_plan_summary"
        verbose_name = _("Audit Plan Summary")
        verbose_name_plural = _("Audit Plan Summaries")
        ordering = ["fiscal_year"]

    def __str__(self) -> str:
        return f"FY{self.fiscal_year} Summary"
