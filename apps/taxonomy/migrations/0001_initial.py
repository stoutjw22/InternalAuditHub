import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RiskCategory",
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
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Risk Category",
                "verbose_name_plural": "Risk Categories",
                "db_table": "taxonomy_risk_category",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="RiskSubcategory",
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
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="subcategories",
                        to="taxonomy.riskcategory",
                    ),
                ),
            ],
            options={
                "verbose_name": "Risk Subcategory",
                "verbose_name_plural": "Risk Subcategories",
                "db_table": "taxonomy_risk_subcategory",
                "ordering": ["category__name", "name"],
            },
        ),
        migrations.AlterUniqueTogether(
            name="risksubcategory",
            unique_together={("category", "name")},
        ),
        migrations.CreateModel(
            name="RiskScoringConfig",
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
                    "scoring_method",
                    models.CharField(
                        choices=[
                            ("multiplicative", "Multiplicative (L \u00d7 I)"),
                            ("additive", "Additive (L + I)"),
                            ("weighted", "Weighted (wL \u00d7 L + wI \u00d7 I)"),
                        ],
                        default="multiplicative",
                        max_length=20,
                    ),
                ),
                (
                    "likelihood_scale",
                    models.PositiveSmallIntegerField(
                        default=5,
                        help_text="Maximum value on the likelihood scale (e.g. 5 = 1-5 scale).",
                    ),
                ),
                (
                    "impact_scale",
                    models.PositiveSmallIntegerField(
                        default=5,
                        help_text="Maximum value on the impact scale.",
                    ),
                ),
                (
                    "critical_threshold",
                    models.PositiveIntegerField(
                        default=20,
                        help_text="Minimum score to be rated Critical.",
                    ),
                ),
                (
                    "high_threshold",
                    models.PositiveIntegerField(
                        default=12,
                        help_text="Minimum score to be rated High.",
                    ),
                ),
                (
                    "medium_threshold",
                    models.PositiveIntegerField(
                        default=6,
                        help_text="Minimum score to be rated Medium (below = Low).",
                    ),
                ),
                (
                    "likelihood_weight",
                    models.DecimalField(
                        decimal_places=2,
                        default="1.00",
                        help_text="Weight for likelihood (used with Weighted method).",
                        max_digits=4,
                    ),
                ),
                (
                    "impact_weight",
                    models.DecimalField(
                        decimal_places=2,
                        default="1.00",
                        help_text="Weight for impact (used with Weighted method).",
                        max_digits=4,
                    ),
                ),
                (
                    "scoring_matrix",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Optional JSON override for custom scoring logic.",
                    ),
                ),
                (
                    "is_default",
                    models.BooleanField(
                        default=False,
                        help_text="If true, this config is applied when no explicit config is chosen.",
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_scoring_configs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Risk Scoring Config",
                "verbose_name_plural": "Risk Scoring Configs",
                "db_table": "taxonomy_risk_scoring_config",
                "ordering": ["-is_default", "name"],
            },
        ),
    ]
