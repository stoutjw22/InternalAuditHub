import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("controls", "0002_engagementcontrol_display_name_and_more"),
        ("engagements", "0002_engagementauditor_role_key"),
        ("findings", "0002_remediationaction_evidence"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TestingMethod",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=255, unique=True)),
                ("description", models.TextField(blank=True)),
                (
                    "method_type",
                    models.CharField(
                        choices=[
                            ("inquiry", "Inquiry"),
                            ("observation", "Observation"),
                            ("inspection", "Inspection / Examination"),
                            ("reperformance", "Reperformance"),
                            ("analytical", "Analytical Procedure"),
                            ("recalculation", "Recalculation"),
                            ("confirmation", "Confirmation"),
                        ],
                        db_index=True,
                        default="inspection",
                        max_length=20,
                    ),
                ),
                (
                    "guidance",
                    models.TextField(
                        blank=True,
                        help_text="Internal guidance on when and how to apply this method.",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Testing Method",
                "verbose_name_plural": "Testing Methods",
                "db_table": "testing_method",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="AssertionType",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=255, unique=True)),
                ("description", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Assertion Type",
                "verbose_name_plural": "Assertion Types",
                "db_table": "testing_assertion_type",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="TestPlan",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=500)),
                ("description", models.TextField(blank=True)),
                (
                    "sampling_method",
                    models.CharField(
                        choices=[
                            ("random", "Random"),
                            ("systematic", "Systematic"),
                            ("haphazard", "Haphazard"),
                            ("judgmental", "Judgmental"),
                            ("stratified", "Stratified"),
                        ],
                        default="random",
                        max_length=20,
                    ),
                ),
                (
                    "population_description",
                    models.TextField(
                        blank=True,
                        help_text="Description of the total population from which samples are drawn.",
                    ),
                ),
                (
                    "population_size",
                    models.PositiveIntegerField(
                        blank=True,
                        help_text="Total number of items in the population.",
                        null=True,
                    ),
                ),
                (
                    "sample_size",
                    models.PositiveIntegerField(
                        blank=True,
                        help_text="Number of items to sample from the population.",
                        null=True,
                    ),
                ),
                (
                    "design_effectiveness_status",
                    models.CharField(
                        choices=[
                            ("not_assessed", "Not Assessed"),
                            ("effective", "Effective"),
                            ("partially_effective", "Partially Effective"),
                            ("ineffective", "Ineffective"),
                        ],
                        db_index=True,
                        default="not_assessed",
                        help_text="Assessment of whether the control is designed to achieve its objective.",
                        max_length=25,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("approved", "Approved"),
                            ("active", "Active"),
                            ("completed", "Completed"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("planned_date", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assertion_types",
                    models.ManyToManyField(
                        blank=True,
                        related_name="test_plans",
                        to="testing.assertiontype",
                    ),
                ),
                (
                    "control",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="test_plans",
                        to="controls.control",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_test_plans",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "engagement",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="test_plans",
                        to="engagements.auditengagement",
                    ),
                ),
                (
                    "planned_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="planned_tests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "testing_method",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="test_plans",
                        to="testing.testingmethod",
                    ),
                ),
            ],
            options={
                "verbose_name": "Test Plan",
                "verbose_name_plural": "Test Plans",
                "db_table": "testing_test_plan",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="testplan",
            index=models.Index(
                fields=["control", "status"],
                name="testing_tp_control_status_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="testplan",
            index=models.Index(
                fields=["engagement", "status"],
                name="testing_tp_engagement_status_idx",
            ),
        ),
        migrations.CreateModel(
            name="TestInstance",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "instance_number",
                    models.PositiveIntegerField(
                        default=1,
                        help_text="Sequential instance number within this test plan.",
                    ),
                ),
                (
                    "test_period_start",
                    models.DateField(
                        blank=True,
                        help_text="Start of the period under test.",
                        null=True,
                    ),
                ),
                (
                    "test_period_end",
                    models.DateField(
                        blank=True,
                        help_text="End of the period under test.",
                        null=True,
                    ),
                ),
                (
                    "performed_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When the test execution was completed.",
                        null=True,
                    ),
                ),
                (
                    "operating_effectiveness_status",
                    models.CharField(
                        choices=[
                            ("not_tested", "Not Tested"),
                            ("effective", "Effective"),
                            ("partially_effective", "Partially Effective"),
                            ("ineffective", "Ineffective"),
                        ],
                        db_index=True,
                        default="not_tested",
                        help_text="Overall conclusion on whether the control operated effectively.",
                        max_length=25,
                    ),
                ),
                ("conclusion", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "performed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="performed_tests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "test_plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="instances",
                        to="testing.testplan",
                    ),
                ),
            ],
            options={
                "verbose_name": "Test Instance",
                "verbose_name_plural": "Test Instances",
                "db_table": "testing_test_instance",
                "ordering": ["test_plan", "instance_number"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="testinstance",
            unique_together={("test_plan", "instance_number")},
        ),
        migrations.AddIndex(
            model_name="testinstance",
            index=models.Index(
                fields=["operating_effectiveness_status"],
                name="testing_ti_oe_status_idx",
            ),
        ),
        migrations.CreateModel(
            name="SampleItem",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "item_identifier",
                    models.CharField(
                        help_text="Unique identifier for the sampled item (e.g. transaction ID, invoice #).",
                        max_length=500,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                (
                    "result",
                    models.CharField(
                        choices=[
                            ("not_tested", "Not Tested"),
                            ("pass", "Pass"),
                            ("fail", "Fail"),
                            ("exception", "Exception"),
                            ("na", "N/A"),
                        ],
                        db_index=True,
                        default="not_tested",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "evidence",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sample_items",
                        to="findings.evidence",
                    ),
                ),
                (
                    "test_instance",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sample_items",
                        to="testing.testinstance",
                    ),
                ),
            ],
            options={
                "verbose_name": "Sample Item",
                "verbose_name_plural": "Sample Items",
                "db_table": "testing_sample_item",
                "ordering": ["test_instance", "item_identifier"],
            },
        ),
        migrations.CreateModel(
            name="TestException",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("title", models.CharField(max_length=500)),
                ("description", models.TextField()),
                (
                    "exception_type",
                    models.CharField(
                        choices=[
                            ("design", "Design Deficiency"),
                            ("operating", "Operating Deficiency"),
                            ("data_quality", "Data Quality Issue"),
                            ("missing_evidence", "Missing Evidence"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="operating",
                        max_length=20,
                    ),
                ),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("critical", "Critical"),
                            ("high", "High"),
                            ("medium", "Medium"),
                            ("low", "Low"),
                        ],
                        db_index=True,
                        default="medium",
                        max_length=20,
                    ),
                ),
                ("resolution_notes", models.TextField(blank=True)),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_exceptions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "finding",
                    models.ForeignKey(
                        blank=True,
                        help_text="Formal finding created if this exception is escalated.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="test_exceptions",
                        to="findings.finding",
                    ),
                ),
                (
                    "resolved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="resolved_exceptions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "sample_item",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="exceptions",
                        to="testing.sampleitem",
                    ),
                ),
                (
                    "test_instance",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="exceptions",
                        to="testing.testinstance",
                    ),
                ),
            ],
            options={
                "verbose_name": "Test Exception",
                "verbose_name_plural": "Test Exceptions",
                "db_table": "testing_exception",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="testexception",
            index=models.Index(
                fields=["exception_type", "severity"],
                name="testing_exc_type_severity_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="testexception",
            index=models.Index(
                fields=["test_instance", "severity"],
                name="testing_exc_instance_sev_idx",
            ),
        ),
    ]
