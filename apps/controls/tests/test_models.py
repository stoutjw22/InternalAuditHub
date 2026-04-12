"""
Model tests for the controls app: Control, EngagementControl.

Covers: creation, __str__, field defaults, M2M relationship to risks,
and the unique-together constraint on EngagementControl.
"""
import pytest
from django.db import IntegrityError

from conftest import (
    AuditEngagementFactory,
    ControlFactory,
    EngagementControlFactory,
    RiskFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestControlModel:
    def test_create(self):
        control = ControlFactory()
        assert control.pk is not None

    def test_str_returns_name(self):
        control = ControlFactory(name="Password Policy Control")
        assert str(control) == "Password Policy Control"

    def test_default_control_type_is_preventive(self):
        control = ControlFactory()
        assert control.control_type == "preventive"

    def test_default_frequency_is_monthly(self):
        control = ControlFactory()
        assert control.frequency == "monthly"

    def test_default_status_is_active(self):
        control = ControlFactory()
        assert control.status == "active"

    def test_owner_is_optional(self):
        control = ControlFactory(owner=None)
        assert control.owner is None

    def test_owner_can_be_set(self):
        user = UserFactory()
        control = ControlFactory(owner=user)
        assert control.owner == user

    def test_control_reference_defaults_blank(self):
        control = ControlFactory()
        assert control.control_reference == ""

    def test_risks_m2m_empty_by_default(self):
        control = ControlFactory()
        assert control.risks.count() == 0

    def test_risks_m2m_can_be_added(self):
        control = ControlFactory()
        risk1 = RiskFactory()
        risk2 = RiskFactory()
        control.risks.add(risk1, risk2)
        assert control.risks.count() == 2

    def test_risk_back_relation(self):
        control = ControlFactory()
        risk = RiskFactory()
        control.risks.add(risk)
        assert risk.controls.filter(pk=control.pk).exists()

    def test_all_control_type_choices(self):
        for ct in ("preventive", "detective", "corrective", "directive", "compensating"):
            c = ControlFactory(control_type=ct)
            assert c.control_type == ct

    def test_all_frequency_choices(self):
        for freq in ("continuous", "daily", "weekly", "monthly", "quarterly", "annually", "ad_hoc"):
            c = ControlFactory(frequency=freq)
            assert c.frequency == freq

    def test_all_status_choices(self):
        for st in ("active", "inactive", "design_deficiency", "under_review"):
            c = ControlFactory(status=st)
            assert c.status == st


@pytest.mark.django_db
class TestEngagementControlModel:
    def test_create(self):
        ec = EngagementControlFactory()
        assert ec.pk is not None

    def test_str_includes_control_and_engagement(self):
        ec = EngagementControlFactory()
        result = str(ec)
        assert str(ec.control) in result
        assert str(ec.engagement) in result

    def test_default_test_result_is_not_tested(self):
        ec = EngagementControlFactory()
        assert ec.test_result == "not_tested"

    def test_default_effectiveness_rating_is_not_assessed(self):
        ec = EngagementControlFactory()
        assert ec.effectiveness_rating == "not_assessed"

    def test_tested_by_is_optional(self):
        ec = EngagementControlFactory()
        assert ec.tested_by is None

    def test_unique_together_engagement_control(self):
        ec = EngagementControlFactory()
        with pytest.raises(IntegrityError):
            EngagementControlFactory(engagement=ec.engagement, control=ec.control)

    def test_different_control_same_engagement_allowed(self):
        ec = EngagementControlFactory()
        ec2 = EngagementControlFactory(engagement=ec.engagement)
        assert ec2.pk is not None

    def test_all_test_result_choices(self):
        for result in ("not_tested", "pass", "fail", "partial", "na"):
            ec = EngagementControlFactory(test_result=result)
            assert ec.test_result == result

    def test_all_effectiveness_rating_choices(self):
        for rating in ("effective", "partially_effective", "ineffective", "not_assessed"):
            ec = EngagementControlFactory(effectiveness_rating=rating)
            assert ec.effectiveness_rating == rating


# ── Epic 4: new Control fields ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestControlNewFields:
    def test_is_key_control_defaults_false(self):
        control = ControlFactory()
        assert control.is_key_control is False

    def test_can_mark_as_key_control(self):
        control = ControlFactory(is_key_control=True)
        assert control.is_key_control is True

    def test_execution_mode_defaults_manual(self):
        control = ControlFactory()
        assert control.execution_mode == "manual"

    def test_execution_mode_choices(self):
        for mode in ("manual", "automated", "hybrid"):
            control = ControlFactory(execution_mode=mode)
            assert control.execution_mode == mode

    def test_assertions_m2m_is_empty_by_default(self):
        from conftest import AssertionTypeFactory
        control = ControlFactory()
        assert control.assertions.count() == 0

    def test_can_add_assertions(self):
        from conftest import AssertionTypeFactory
        control = ControlFactory()
        at1 = AssertionTypeFactory()
        at2 = AssertionTypeFactory()
        control.assertions.add(at1, at2)
        assert control.assertions.count() == 2
