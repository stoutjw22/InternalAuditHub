"""
Testing Layer:
  TestingMethod    — how a test is performed (inquiry, observation, reperformance…)
  AssertionType    — what assertion is being tested (existence, completeness…)
  TestPlan         — the plan for testing a control within an engagement
  TestInstance     — an execution run of a test plan
  SampleItem       — individual item drawn from the population during a test
  TestException    — an exception/deviation noted during testing
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TestingMethod(models.Model):
    """
    Describes the audit procedure method used to gather evidence
    (e.g. Inquiry, Observation, Inspection, Reperformance, Analytical).
    """

    class MethodType(models.TextChoices):
        INQUIRY = "inquiry", _("Inquiry")
        OBSERVATION = "observation", _("Observation")
        INSPECTION = "inspection", _("Inspection / Examination")
        REPERFORMANCE = "reperformance", _("Reperformance")
        ANALYTICAL = "analytical", _("Analytical Procedure")
        RECALCULATION = "recalculation", _("Recalculation")
        CONFIRMATION = "confirmation", _("Confirmation")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    method_type = models.CharField(
        max_length=20,
        choices=MethodType.choices,
        default=MethodType.INSPECTION,
        db_index=True,
    )
    guidance = models.TextField(
        blank=True,
        help_text="Internal guidance on when and how to apply this method.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "testing_method"
        verbose_name = _("Testing Method")
        verbose_name_plural = _("Testing Methods")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class AssertionType(models.Model):
    """
    Represents an audit assertion being tested (e.g. Existence,
    Completeness, Accuracy, Valuation, Cut-off, Rights & Obligations).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "testing_assertion_type"
        verbose_name = _("Assertion Type")
        verbose_name_plural = _("Assertion Types")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class TestPlan(models.Model):
    """
    A structured plan that describes how a specific control will be tested.
    One control can have multiple test plans (e.g. different assertions
    or sampling approaches per engagement).
    """

    class SamplingMethod(models.TextChoices):
        RANDOM = "random", _("Random")
        SYSTEMATIC = "systematic", _("Systematic")
        HAPHAZARD = "haphazard", _("Haphazard")
        JUDGMENTAL = "judgmental", _("Judgmental")
        STRATIFIED = "stratified", _("Stratified")

    class PlanStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        APPROVED = "approved", _("Approved")
        ACTIVE = "active", _("Active")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    class DesignEffectivenessStatus(models.TextChoices):
        NOT_ASSESSED = "not_assessed", _("Not Assessed")
        EFFECTIVE = "effective", _("Effective")
        PARTIALLY_EFFECTIVE = "partially_effective", _("Partially Effective")
        INEFFECTIVE = "ineffective", _("Ineffective")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    control = models.ForeignKey(
        "controls.Control",
        on_delete=models.PROTECT,
        related_name="test_plans",
    )
    engagement = models.ForeignKey(
        "engagements.AuditEngagement",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_plans",
    )
    testing_method = models.ForeignKey(
        TestingMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_plans",
    )
    assertion_types = models.ManyToManyField(
        AssertionType,
        blank=True,
        related_name="test_plans",
    )
    population_description = models.TextField(
        blank=True,
        help_text="Description of the total population from which samples are drawn.",
    )
    population_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Total number of items in the population.",
    )
    sample_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Number of items to sample from the population.",
    )
    sampling_method = models.CharField(
        max_length=20,
        choices=SamplingMethod.choices,
        default=SamplingMethod.RANDOM,
    )
    design_effectiveness_status = models.CharField(
        max_length=25,
        choices=DesignEffectivenessStatus.choices,
        default=DesignEffectivenessStatus.NOT_ASSESSED,
        db_index=True,
        help_text="Assessment of whether the control is designed to achieve its objective.",
    )
    status = models.CharField(
        max_length=20,
        choices=PlanStatus.choices,
        default=PlanStatus.DRAFT,
        db_index=True,
    )
    planned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="planned_tests",
    )
    planned_date = models.DateField(
        null=True,
        blank=True,
        help_text="Target date for completing the test.",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_test_plans",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "testing_test_plan"
        verbose_name = _("Test Plan")
        verbose_name_plural = _("Test Plans")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["control", "status"]),
            models.Index(fields=["engagement", "status"]),
        ]

    def __str__(self) -> str:
        return self.name


class TestInstance(models.Model):
    """
    A single execution of a TestPlan — corresponds to one testing cycle
    (e.g. Q1 2026 test run).  Holds the operating-effectiveness conclusion.
    """

    class OperatingEffectivenessStatus(models.TextChoices):
        NOT_TESTED = "not_tested", _("Not Tested")
        EFFECTIVE = "effective", _("Effective")
        PARTIALLY_EFFECTIVE = "partially_effective", _("Partially Effective")
        INEFFECTIVE = "ineffective", _("Ineffective")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_plan = models.ForeignKey(
        TestPlan,
        on_delete=models.PROTECT,
        related_name="instances",
    )
    instance_number = models.PositiveIntegerField(
        default=1,
        help_text="Sequential instance number within this test plan.",
    )
    test_period_start = models.DateField(
        null=True,
        blank=True,
        help_text="Start of the period under test.",
    )
    test_period_end = models.DateField(
        null=True,
        blank=True,
        help_text="End of the period under test.",
    )
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performed_tests",
    )
    performed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the test execution was completed.",
    )
    operating_effectiveness_status = models.CharField(
        max_length=25,
        choices=OperatingEffectivenessStatus.choices,
        default=OperatingEffectivenessStatus.NOT_TESTED,
        db_index=True,
        help_text="Overall conclusion on whether the control operated effectively.",
    )
    conclusion = models.TextField(
        blank=True,
        help_text="Narrative conclusion of the test instance.",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "testing_test_instance"
        verbose_name = _("Test Instance")
        verbose_name_plural = _("Test Instances")
        ordering = ["test_plan", "instance_number"]
        unique_together = [("test_plan", "instance_number")]
        indexes = [
            models.Index(fields=["operating_effectiveness_status"]),
        ]

    def __str__(self) -> str:
        return f"{self.test_plan.name} — Run #{self.instance_number}"


class SampleItem(models.Model):
    """
    An individual item drawn from the population and tested within
    a TestInstance.
    """

    class ItemResult(models.TextChoices):
        NOT_TESTED = "not_tested", _("Not Tested")
        PASS = "pass", _("Pass")
        FAIL = "fail", _("Fail")
        EXCEPTION = "exception", _("Exception")
        NOT_APPLICABLE = "na", _("N/A")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_instance = models.ForeignKey(
        TestInstance,
        on_delete=models.CASCADE,
        related_name="sample_items",
    )
    item_identifier = models.CharField(
        max_length=500,
        help_text="Unique identifier for the sampled item (e.g. transaction ID, invoice #).",
    )
    description = models.TextField(blank=True)
    result = models.CharField(
        max_length=20,
        choices=ItemResult.choices,
        default=ItemResult.NOT_TESTED,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    evidence = models.ForeignKey(
        "findings.Evidence",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sample_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "testing_sample_item"
        verbose_name = _("Sample Item")
        verbose_name_plural = _("Sample Items")
        ordering = ["test_instance", "item_identifier"]

    def __str__(self) -> str:
        return f"{self.test_instance} / {self.item_identifier}"


class TestException(models.Model):
    """
    A deviation or exception noted during testing.  Can be linked to
    a SampleItem (item-level exception) or raised at the instance level.
    Optionally escalated to a formal Finding.
    """

    class ExceptionType(models.TextChoices):
        DESIGN = "design", _("Design Deficiency")
        OPERATING = "operating", _("Operating Deficiency")
        DATA_QUALITY = "data_quality", _("Data Quality Issue")
        MISSING_EVIDENCE = "missing_evidence", _("Missing Evidence")
        OTHER = "other", _("Other")

    class ExceptionSeverity(models.TextChoices):
        CRITICAL = "critical", _("Critical")
        HIGH = "high", _("High")
        MEDIUM = "medium", _("Medium")
        LOW = "low", _("Low")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_instance = models.ForeignKey(
        TestInstance,
        on_delete=models.CASCADE,
        related_name="exceptions",
    )
    sample_item = models.ForeignKey(
        SampleItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="exceptions",
    )
    title = models.CharField(max_length=500)
    description = models.TextField()
    exception_type = models.CharField(
        max_length=20,
        choices=ExceptionType.choices,
        default=ExceptionType.OPERATING,
        db_index=True,
    )
    severity = models.CharField(
        max_length=20,
        choices=ExceptionSeverity.choices,
        default=ExceptionSeverity.MEDIUM,
        db_index=True,
    )
    finding = models.ForeignKey(
        "findings.Finding",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="test_exceptions",
        help_text="Formal finding created if this exception is escalated.",
    )
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_exceptions",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_exceptions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "testing_exception"
        verbose_name = _("Test Exception")
        verbose_name_plural = _("Test Exceptions")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["exception_type", "severity"]),
            models.Index(fields=["test_instance", "severity"]),
        ]

    def __str__(self) -> str:
        return f"[{self.severity.upper()}] {self.title}"
