import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("frameworks", "0001_initial"),
        ("universe", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Jurisdiction",
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
                (
                    "short_name",
                    models.CharField(
                        blank=True,
                        help_text="Abbreviation (e.g. NYDFS, CCPA, GDPR).",
                        max_length=50,
                    ),
                ),
                (
                    "jurisdiction_type",
                    models.CharField(
                        choices=[
                            ("federal", "Federal / National"),
                            ("state", "State / Provincial"),
                            ("international", "International"),
                            ("regulator", "Industry Regulator"),
                            ("self_regulatory", "Self-Regulatory Organisation"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="regulator",
                        max_length=20,
                    ),
                ),
                (
                    "country",
                    models.CharField(
                        blank=True,
                        help_text="ISO country code or country name (e.g. US, DE, GB).",
                        max_length=100,
                    ),
                ),
                (
                    "region",
                    models.CharField(
                        blank=True,
                        help_text="State/province/region within the country (e.g. New York).",
                        max_length=100,
                    ),
                ),
                (
                    "regulator_name",
                    models.CharField(
                        blank=True,
                        help_text="Full name of the regulatory body (if applicable).",
                        max_length=255,
                    ),
                ),
                ("website_url", models.URLField(blank=True, max_length=1000)),
                ("description", models.TextField(blank=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Jurisdiction",
                "verbose_name_plural": "Jurisdictions",
                "db_table": "jurisdictions_jurisdiction",
                "ordering": ["jurisdiction_type", "name"],
            },
        ),
        migrations.CreateModel(
            name="RequirementOverlay",
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
                    "overlay_type",
                    models.CharField(
                        choices=[
                            ("stricter", "Stricter than Base Requirement"),
                            ("equivalent", "Equivalent to Base Requirement"),
                            ("exemption", "Provides Exemption / Safe Harbour"),
                            ("interpretation", "Jurisdiction-Specific Interpretation"),
                            ("additional", "Additional Obligation"),
                        ],
                        db_index=True,
                        default="stricter",
                        max_length=20,
                    ),
                ),
                (
                    "overlay_text",
                    models.TextField(
                        help_text="Jurisdiction-specific text that augments or replaces the base requirement.",
                    ),
                ),
                (
                    "citation_reference",
                    models.CharField(
                        blank=True,
                        help_text="Specific section/article reference (e.g. \u00a7500.12(b)).",
                        max_length=500,
                    ),
                ),
                (
                    "effective_date",
                    models.DateField(
                        help_text="Date from which this overlay is in force.",
                    ),
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
                        related_name="overlays",
                        to="frameworks.citationsource",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_overlays",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "framework_requirement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="overlays",
                        to="frameworks.frameworkrequirement",
                    ),
                ),
                (
                    "jurisdiction",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="overlays",
                        to="jurisdictions.jurisdiction",
                    ),
                ),
            ],
            options={
                "verbose_name": "Requirement Overlay",
                "verbose_name_plural": "Requirement Overlays",
                "db_table": "jurisdictions_requirement_overlay",
                "ordering": ["jurisdiction", "framework_requirement"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="requirementoverlay",
            unique_together={("jurisdiction", "framework_requirement")},
        ),
        migrations.AddIndex(
            model_name="requirementoverlay",
            index=models.Index(
                fields=["overlay_type", "is_active"],
                name="jurisd_overlay_type_active_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="requirementoverlay",
            index=models.Index(
                fields=["effective_date", "expiry_date"],
                name="jurisd_overlay_dates_idx",
            ),
        ),
        migrations.CreateModel(
            name="ApplicabilityLogic",
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
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                (
                    "condition_type",
                    models.CharField(
                        choices=[
                            ("always", "Always Applicable"),
                            ("entity_type", "By Entity Type"),
                            ("risk_rating", "By Risk Rating"),
                            ("threshold", "By Threshold / Attribute"),
                            ("custom", "Custom Logic"),
                        ],
                        db_index=True,
                        default="always",
                        max_length=20,
                    ),
                ),
                (
                    "condition_config",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="JSON object defining evaluation parameters for the condition_type.",
                    ),
                ),
                (
                    "is_applicable",
                    models.BooleanField(
                        default=True,
                        help_text="Set to False to record an explicit non-applicability determination.",
                    ),
                ),
                ("rationale", models.TextField(blank=True)),
                (
                    "effective_date",
                    models.DateField(
                        help_text="Date from which this rule is in effect.",
                    ),
                ),
                (
                    "expiry_date",
                    models.DateField(blank=True, null=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "auditable_entity",
                    models.ForeignKey(
                        blank=True,
                        help_text="If set, this rule is scoped to a specific entity only.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="applicability_rules",
                        to="universe.auditableentity",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_applicability_rules",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "framework_requirement",
                    models.ForeignKey(
                        blank=True,
                        help_text="If set, scoped to a specific framework requirement.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="applicability_rules",
                        to="frameworks.frameworkrequirement",
                    ),
                ),
                (
                    "jurisdiction",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="applicability_rules",
                        to="jurisdictions.jurisdiction",
                    ),
                ),
            ],
            options={
                "verbose_name": "Applicability Logic",
                "verbose_name_plural": "Applicability Logic Rules",
                "db_table": "jurisdictions_applicability_logic",
                "ordering": ["jurisdiction", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="applicabilitylogic",
            index=models.Index(
                fields=["condition_type", "is_applicable"],
                name="jurisd_applic_cond_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="applicabilitylogic",
            index=models.Index(
                fields=["effective_date", "expiry_date"],
                name="jurisd_applic_dates_idx",
            ),
        ),
    ]
