"""Add optional taxonomy FK fields to Risk (risk_category, risk_subcategory, scoring_config)."""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("risks", "0002_engagementrisk_display_name_engagementrisk_objective"),
        ("taxonomy", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="risk",
            name="risk_category",
            field=models.ForeignKey(
                blank=True,
                help_text="Structured taxonomy category for this risk.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="risks",
                to="taxonomy.riskcategory",
            ),
        ),
        migrations.AddField(
            model_name="risk",
            name="risk_subcategory",
            field=models.ForeignKey(
                blank=True,
                help_text="Structured taxonomy subcategory for this risk.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="risks",
                to="taxonomy.risksubcategory",
            ),
        ),
        migrations.AddField(
            model_name="risk",
            name="scoring_config",
            field=models.ForeignKey(
                blank=True,
                help_text="Scoring configuration to use when computing this risk's score.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="risks",
                to="taxonomy.riskscoringconfig",
            ),
        ),
    ]
