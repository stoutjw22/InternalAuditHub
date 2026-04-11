import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditableDomain",
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
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_domains",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        help_text="Optional parent domain for subdirectory nesting.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="subdomains",
                        to="universe.auditabledomain",
                    ),
                ),
            ],
            options={
                "verbose_name": "Auditable Domain",
                "verbose_name_plural": "Auditable Domains",
                "db_table": "universe_auditable_domain",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="AuditableEntity",
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
                    "entity_type",
                    models.CharField(
                        choices=[
                            ("process", "Business Process"),
                            ("system", "IT System / Application"),
                            ("org_unit", "Organisational Unit"),
                            ("vendor", "Third-Party / Vendor"),
                            ("product", "Product / Service"),
                            ("location", "Physical Location"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        default="process",
                        max_length=20,
                    ),
                ),
                (
                    "inherent_risk_rating",
                    models.CharField(
                        choices=[
                            ("critical", "Critical"),
                            ("high", "High"),
                            ("medium", "Medium"),
                            ("low", "Low"),
                            ("not_rated", "Not Rated"),
                        ],
                        db_index=True,
                        default="not_rated",
                        max_length=20,
                    ),
                ),
                (
                    "audit_frequency",
                    models.CharField(
                        blank=True,
                        help_text="How often this entity should be audited (e.g. Annual, Biennial).",
                        max_length=50,
                    ),
                ),
                ("last_audit_date", models.DateField(blank=True, null=True)),
                ("next_audit_date", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_entities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "domain",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="entities",
                        to="universe.auditabledomain",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="owned_entities",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Auditable Entity",
                "verbose_name_plural": "Auditable Entities",
                "db_table": "universe_auditable_entity",
                "ordering": ["domain__name", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="auditableentity",
            index=models.Index(
                fields=["domain", "entity_type"],
                name="universe_ae_domain_type_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="auditableentity",
            index=models.Index(
                fields=["inherent_risk_rating"],
                name="universe_ae_risk_rating_idx",
            ),
        ),
        migrations.CreateModel(
            name="Subprocess",
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
                    "sequence_order",
                    models.PositiveIntegerField(
                        default=0,
                        help_text="Display order within the parent process.",
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "auditable_entity",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="subprocesses",
                        to="universe.auditableentity",
                    ),
                ),
                (
                    "business_process",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="subprocesses",
                        to="core.businessprocess",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_subprocesses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="owned_subprocesses",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Subprocess / Activity",
                "verbose_name_plural": "Subprocesses / Activities",
                "db_table": "universe_subprocess",
                "ordering": ["business_process__name", "sequence_order", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="subprocess",
            index=models.Index(
                fields=["business_process", "sequence_order"],
                name="universe_sp_proc_seq_idx",
            ),
        ),
    ]
