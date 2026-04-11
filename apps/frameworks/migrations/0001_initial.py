import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("controls", "0002_engagementcontrol_display_name_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CitationSource",
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
                (
                    "source_type",
                    models.CharField(
                        choices=[
                            ("regulation", "Regulation / Statute"),
                            ("standard", "Industry Standard"),
                            ("guidance", "Regulatory Guidance"),
                            ("internal_policy", "Internal Policy"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="standard",
                        max_length=20,
                    ),
                ),
                ("publisher", models.CharField(blank=True, max_length=255)),
                ("url", models.URLField(blank=True, max_length=1000)),
                ("publication_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Citation Source",
                "verbose_name_plural": "Citation Sources",
                "db_table": "frameworks_citation_source",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Framework",
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
                (
                    "short_name",
                    models.CharField(
                        help_text="Abbreviated identifier shown in UI (e.g. SOC2, ISO27001).",
                        max_length=50,
                    ),
                ),
                ("description", models.TextField(blank=True)),
                (
                    "framework_type",
                    models.CharField(
                        choices=[
                            ("security", "Information Security"),
                            ("privacy", "Privacy / Data Protection"),
                            ("financial", "Financial Reporting"),
                            ("operational", "Operational Resilience"),
                            ("compliance", "Regulatory Compliance"),
                            ("governance", "Governance / Ethics"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="compliance",
                        max_length=20,
                    ),
                ),
                (
                    "version",
                    models.CharField(
                        blank=True,
                        help_text="Version or edition identifier (e.g. 2022, Rev 5).",
                        max_length=50,
                    ),
                ),
                (
                    "effective_date",
                    models.DateField(
                        blank=True,
                        help_text="Date from which this framework version is in force.",
                        null=True,
                    ),
                ),
                (
                    "expiry_date",
                    models.DateField(
                        blank=True,
                        help_text="Date after which this version is superseded.",
                        null=True,
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "citation_source",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="frameworks",
                        to="frameworks.citationsource",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_frameworks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Framework",
                "verbose_name_plural": "Frameworks",
                "db_table": "frameworks_framework",
                "ordering": ["short_name", "version"],
            },
        ),
        migrations.AddIndex(
            model_name="framework",
            index=models.Index(
                fields=["framework_type", "is_active"],
                name="frameworks_fw_type_active_idx",
            ),
        ),
        migrations.CreateModel(
            name="FrameworkRequirement",
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
                    "requirement_id",
                    models.CharField(
                        help_text="Framework-assigned identifier (e.g. CC6.1, A.9.2.3, PCI-DSS 3.4).",
                        max_length=100,
                    ),
                ),
                ("title", models.CharField(max_length=500)),
                ("description", models.TextField(blank=True)),
                (
                    "requirement_type",
                    models.CharField(
                        choices=[
                            ("objective", "Control Objective"),
                            ("control", "Control Activity"),
                            ("policy", "Policy Requirement"),
                            ("procedure", "Procedure Requirement"),
                            ("principle", "Principle"),
                            ("criterion", "Trust Service Criterion"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="control",
                        max_length=20,
                    ),
                ),
                (
                    "citation_text",
                    models.TextField(
                        blank=True,
                        help_text="Verbatim text from the citation source.",
                    ),
                ),
                (
                    "effective_date",
                    models.DateField(blank=True, null=True),
                ),
                (
                    "expiry_date",
                    models.DateField(blank=True, null=True),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "citation_source",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="cited_requirements",
                        to="frameworks.citationsource",
                    ),
                ),
                (
                    "framework",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="requirements",
                        to="frameworks.framework",
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        help_text="Parent requirement for hierarchical clause structures.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="frameworks.frameworkrequirement",
                    ),
                ),
            ],
            options={
                "verbose_name": "Framework Requirement",
                "verbose_name_plural": "Framework Requirements",
                "db_table": "frameworks_requirement",
                "ordering": ["framework", "requirement_id"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="frameworkrequirement",
            unique_together={("framework", "requirement_id")},
        ),
        migrations.AddIndex(
            model_name="frameworkrequirement",
            index=models.Index(
                fields=["framework", "requirement_type"],
                name="frameworks_req_fw_type_idx",
            ),
        ),
        migrations.CreateModel(
            name="ControlObjective",
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
                    "reference_code",
                    models.CharField(
                        blank=True,
                        help_text="Internal reference code (e.g. CO-001).",
                        max_length=100,
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_control_objectives",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "framework_requirements",
                    models.ManyToManyField(
                        blank=True,
                        related_name="control_objectives",
                        to="frameworks.frameworkrequirement",
                    ),
                ),
            ],
            options={
                "verbose_name": "Control Objective",
                "verbose_name_plural": "Control Objectives",
                "db_table": "frameworks_control_objective",
                "ordering": ["reference_code", "name"],
            },
        ),
        migrations.CreateModel(
            name="ControlActivity",
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
                    "activity_type",
                    models.CharField(
                        choices=[
                            ("preventive", "Preventive"),
                            ("detective", "Detective"),
                            ("corrective", "Corrective"),
                            ("directive", "Directive"),
                            ("compensating", "Compensating"),
                        ],
                        db_index=True,
                        default="preventive",
                        max_length=20,
                    ),
                ),
                (
                    "frequency",
                    models.CharField(
                        blank=True,
                        help_text="How often this specific activity runs (mirrors Control.Frequency choices).",
                        max_length=20,
                    ),
                ),
                (
                    "procedure_steps",
                    models.TextField(
                        blank=True,
                        help_text="Step-by-step description of how the activity is performed.",
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "control",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="activities",
                        to="controls.control",
                    ),
                ),
                (
                    "control_objective",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activities",
                        to="frameworks.controlobjective",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_control_activities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "framework_requirements",
                    models.ManyToManyField(
                        blank=True,
                        related_name="control_activities",
                        to="frameworks.frameworkrequirement",
                    ),
                ),
            ],
            options={
                "verbose_name": "Control Activity",
                "verbose_name_plural": "Control Activities",
                "db_table": "frameworks_control_activity",
                "ordering": ["control__name", "name"],
            },
        ),
        migrations.CreateModel(
            name="ControlRequirementMapping",
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
                    "mapping_type",
                    models.CharField(
                        choices=[
                            ("satisfies", "Fully Satisfies"),
                            ("partially_satisfies", "Partially Satisfies"),
                            ("addresses", "Addresses / Related"),
                            ("compensates", "Compensating"),
                        ],
                        db_index=True,
                        default="satisfies",
                        max_length=25,
                    ),
                ),
                ("notes", models.TextField(blank=True)),
                (
                    "effective_date",
                    models.DateField(
                        blank=True,
                        help_text="Date from which this mapping is valid.",
                        null=True,
                    ),
                ),
                (
                    "expiry_date",
                    models.DateField(
                        blank=True,
                        help_text="Date after which this mapping is no longer considered.",
                        null=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "control",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="requirement_mappings",
                        to="controls.control",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_control_mappings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "framework_requirement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="control_mappings",
                        to="frameworks.frameworkrequirement",
                    ),
                ),
            ],
            options={
                "verbose_name": "Control\u2013Requirement Mapping",
                "verbose_name_plural": "Control\u2013Requirement Mappings",
                "db_table": "frameworks_control_requirement_mapping",
            },
        ),
        migrations.AlterUniqueTogether(
            name="controlrequirementmapping",
            unique_together={("control", "framework_requirement")},
        ),
        migrations.AddIndex(
            model_name="controlrequirementmapping",
            index=models.Index(
                fields=["mapping_type"],
                name="frameworks_crm_type_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="controlrequirementmapping",
            index=models.Index(
                fields=["effective_date", "expiry_date"],
                name="frameworks_crm_dates_idx",
            ),
        ),
    ]
