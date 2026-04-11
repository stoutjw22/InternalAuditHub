"""
Model tests for the risks app: Risk, EngagementRisk.

Covers: creation, __str__, computed properties (inherent_score, residual_score,
risk_rating), field defaults, optional FK relationships, and the unique-together
constraint on EngagementRisk.
"""
import pytest
from django.db import IntegrityError

from conftest import (
    AuditEngagementFactory,
    EngagementRiskFactory,
    RiskFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestRiskModel:
    def test_create_minimal_risk(self):
        risk = RiskFactory()
        assert risk.pk is not None
        assert risk.name.startswith("Risk")

    def test_str_returns_name(self):
        risk = RiskFactory(name="Data Breach Risk")
        assert str(risk) == "Data Breach Risk"

    def test_default_category_is_operational(self):
        risk = RiskFactory()
        assert risk.category == "operational"

    def test_default_status_is_identified(self):
        risk = RiskFactory()
        assert risk.status == "identified"

    def test_default_inherent_likelihood_is_3(self):
        risk = RiskFactory()
        assert risk.inherent_likelihood == 3

    def test_default_inherent_impact_is_3(self):
        risk = RiskFactory()
        assert risk.inherent_impact == 3

    # ── inherent_score property ─────────────────────────────────────────────

    def test_inherent_score_is_likelihood_times_impact(self):
        risk = RiskFactory(inherent_likelihood=4, inherent_impact=5)
        assert risk.inherent_score == 20

    def test_inherent_score_default(self):
        risk = RiskFactory()
        assert risk.inherent_score == 9  # 3 × 3

    # ── residual_score property ─────────────────────────────────────────────

    def test_residual_score_none_when_fields_unset(self):
        risk = RiskFactory(residual_likelihood=None, residual_impact=None)
        assert risk.residual_score is None

    def test_residual_score_none_when_only_likelihood_set(self):
        risk = RiskFactory(residual_likelihood=2, residual_impact=None)
        assert risk.residual_score is None

    def test_residual_score_computed_when_both_set(self):
        risk = RiskFactory(residual_likelihood=2, residual_impact=3)
        assert risk.residual_score == 6

    # ── risk_rating property ────────────────────────────────────────────────

    def test_risk_rating_critical_at_20(self):
        risk = RiskFactory(inherent_likelihood=5, inherent_impact=4)
        assert risk.inherent_score == 20
        assert risk.risk_rating == "Critical"

    def test_risk_rating_critical_above_20(self):
        risk = RiskFactory(inherent_likelihood=5, inherent_impact=5)
        assert risk.inherent_score == 25
        assert risk.risk_rating == "Critical"

    def test_risk_rating_high_at_12(self):
        risk = RiskFactory(inherent_likelihood=3, inherent_impact=4)
        assert risk.inherent_score == 12
        assert risk.risk_rating == "High"

    def test_risk_rating_high_between_12_and_19(self):
        risk = RiskFactory(inherent_likelihood=4, inherent_impact=4)
        assert risk.inherent_score == 16
        assert risk.risk_rating == "High"

    def test_risk_rating_medium_at_6(self):
        risk = RiskFactory(inherent_likelihood=2, inherent_impact=3)
        assert risk.inherent_score == 6
        assert risk.risk_rating == "Medium"

    def test_risk_rating_low_below_6(self):
        risk = RiskFactory(inherent_likelihood=1, inherent_impact=2)
        assert risk.inherent_score == 2
        assert risk.risk_rating == "Low"

    def test_risk_rating_low_at_1(self):
        risk = RiskFactory(inherent_likelihood=1, inherent_impact=1)
        assert risk.inherent_score == 1
        assert risk.risk_rating == "Low"

    # ── FK relationships ────────────────────────────────────────────────────

    def test_owner_is_optional(self):
        risk = RiskFactory(owner=None)
        assert risk.owner is None

    def test_owner_can_be_set(self):
        user = UserFactory()
        risk = RiskFactory(owner=user)
        assert risk.owner == user

    def test_treatment_plan_defaults_blank(self):
        risk = RiskFactory()
        assert risk.treatment_plan == ""

    def test_all_category_choices_accepted(self):
        categories = (
            "operational", "financial", "compliance", "strategic",
            "reputational", "technology", "fraud", "other",
        )
        for cat in categories:
            risk = RiskFactory(category=cat)
            assert risk.category == cat

    def test_all_status_choices_accepted(self):
        for status in ("identified", "assessed", "mitigated", "accepted", "closed"):
            risk = RiskFactory(status=status)
            assert risk.status == status


@pytest.mark.django_db
class TestEngagementRiskModel:
    def test_create(self):
        er = EngagementRiskFactory()
        assert er.pk is not None

    def test_is_in_scope_defaults_true(self):
        er = EngagementRiskFactory()
        assert er.is_in_scope is True

    def test_str_returns_display_name_when_set(self):
        er = EngagementRiskFactory(display_name="Fraud Risk – Revenue Objective")
        assert str(er) == "Fraud Risk – Revenue Objective"

    def test_str_falls_back_to_risk_and_engagement(self):
        er = EngagementRiskFactory(display_name="")
        assert str(er) == f"{er.risk} in {er.engagement}"

    def test_assessment_notes_defaults_blank(self):
        er = EngagementRiskFactory()
        assert er.assessment_notes == ""

    def test_unique_together_engagement_risk(self):
        er = EngagementRiskFactory()
        with pytest.raises(IntegrityError):
            EngagementRiskFactory(engagement=er.engagement, risk=er.risk)

    def test_different_risk_same_engagement_allowed(self):
        er = EngagementRiskFactory()
        er2 = EngagementRiskFactory(engagement=er.engagement)
        assert er2.pk is not None

    def test_same_risk_different_engagement_allowed(self):
        er = EngagementRiskFactory()
        er2 = EngagementRiskFactory(risk=er.risk)
        assert er2.pk is not None
