"""
Management command: python manage.py seed_audit_plan

Loads reference data for the 6-Year Integrated Audit Plan:
  1. RiskScoringConfig  — 5 weighted scoring factors
  2. ControlEffectivenessScale — 5-level effectiveness scale (1.00 → 0.00)
  3. AuditPlanSummary   — placeholder rows for FY2026–FY2031 (zeroed counts)

This command is idempotent; running it multiple times will not create
duplicate records.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.audit_plan.models import (
    AuditPlanSummary,
    ControlEffectivenessScale,
    RiskScoringConfig,
)


RISK_SCORING_FACTORS = [
    {
        "factor": "Financial Impact",
        "weight": Decimal("0.30"),
        "score_1_label": "Negligible <$50K",
        "score_2_label": "Minor $50K–$250K",
        "score_3_label": "Moderate $250K–$1M",
        "score_4_label": "Significant $1M–$5M",
        "score_5_label": "Critical >$5M",
    },
    {
        "factor": "Regulatory Risk",
        "weight": Decimal("0.25"),
        "score_1_label": "No regulatory exposure",
        "score_2_label": "Low general compliance",
        "score_3_label": "Moderate MAR adjacent",
        "score_4_label": "High direct MAR/507E",
        "score_5_label": "Critical NAIC/Iowa exam risk",
    },
    {
        "factor": "Operational Complexity",
        "weight": Decimal("0.20"),
        "score_1_label": "Simple single-step",
        "score_2_label": "Low complexity",
        "score_3_label": "Moderate multi-step",
        "score_4_label": "High cross-functional",
        "score_5_label": "Critical enterprise-wide",
    },
    {
        "factor": "Volume",
        "weight": Decimal("0.15"),
        "score_1_label": "Minimal <100/yr",
        "score_2_label": "Low 100–1K/yr",
        "score_3_label": "Moderate 1K–10K/yr",
        "score_4_label": "High 10K–100K/yr",
        "score_5_label": "Very High >100K/yr",
    },
    {
        "factor": "Change Velocity",
        "weight": Decimal("0.10"),
        "score_1_label": "Stable no changes",
        "score_2_label": "Minor updates only",
        "score_3_label": "Annual system change",
        "score_4_label": "Significant change",
        "score_5_label": "Major transformation",
    },
]

EFFECTIVENESS_SCALE = [
    {
        "score": Decimal("1.00"),
        "label": "Fully Effective",
        "meaning": (
            "Control operates as designed with no exceptions. "
            "Mitigates the associated risk to an acceptable level."
        ),
        "typical_signal": (
            "Clean walkthroughs, no audit exceptions, management has confirmed "
            "the control is operating effectively over the full year."
        ),
    },
    {
        "score": Decimal("0.75"),
        "label": "Minor Gaps",
        "meaning": (
            "Control is substantially effective but has isolated exceptions "
            "or minor design gaps that do not materially increase residual risk."
        ),
        "typical_signal": (
            "1–2 exceptions in a sample, informal compensating steps by staff, "
            "documentation lags but intent is sound."
        ),
    },
    {
        "score": Decimal("0.50"),
        "label": "Moderate Issues",
        "meaning": (
            "Control is only partially effective. Notable design or "
            "operating deficiencies exist that increase residual risk."
        ),
        "typical_signal": (
            "Consistent exceptions in >10% of sample, significant reliance "
            "on manual workarounds, prior-year findings not fully remediated."
        ),
    },
    {
        "score": Decimal("0.25"),
        "label": "Weak",
        "meaning": (
            "Control provides minimal mitigation. Major design or "
            "operating deficiencies substantially increase residual risk."
        ),
        "typical_signal": (
            "Frequent failures, lack of management oversight, repeated "
            "prior-year findings with no meaningful remediation progress."
        ),
    },
    {
        "score": Decimal("0.00"),
        "label": "No Control",
        "meaning": (
            "No effective control exists or the control has completely "
            "failed. Inherent risk equals residual risk."
        ),
        "typical_signal": (
            "Control does not exist, is not being performed, or was "
            "identified as completely ineffective during testing."
        ),
    },
]

PLAN_YEARS = range(2026, 2032)  # FY2026–FY2031


class Command(BaseCommand):
    help = (
        "Seed reference data for the 6-Year Integrated Audit Plan: "
        "RiskScoringConfig, ControlEffectivenessScale, and AuditPlanSummary placeholders."
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Seeding Audit Plan reference data..."))

        # ── Risk Scoring Factors ──────────────────────────────────────────────
        created_count = 0
        updated_count = 0
        for factor_data in RISK_SCORING_FACTORS:
            _, created = RiskScoringConfig.objects.update_or_create(
                factor=factor_data["factor"],
                defaults=factor_data,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"  RiskScoringConfig:         {created_count} created, {updated_count} updated"
            )
        )

        # ── Control Effectiveness Scale ───────────────────────────────────────
        created_count = 0
        updated_count = 0
        for scale_data in EFFECTIVENESS_SCALE:
            _, created = ControlEffectivenessScale.objects.update_or_create(
                score=scale_data["score"],
                defaults=scale_data,
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"  ControlEffectivenessScale: {created_count} created, {updated_count} updated"
            )
        )

        # ── AuditPlanSummary placeholders ─────────────────────────────────────
        created_count = 0
        updated_count = 0
        for year in PLAN_YEARS:
            _, created = AuditPlanSummary.objects.get_or_create(
                fiscal_year=year,
                defaults={
                    "planned_audits": 0,
                    "mar_required_count": 0,
                    "non_mar_count": 0,
                    "avg_priority_score": Decimal("0.00"),
                    "estimated_total_hours": 0,
                    "coverage_notes": (
                        f"FY{year} placeholder — run xlsx import to populate."
                    ),
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"  AuditPlanSummary:          {created_count} created, {updated_count} skipped (already exist)"
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                "\nAudit Plan seed complete. "
                "Run 'python manage.py seed_audit_plan' again at any time to refresh reference data."
            )
        )
