"""Model tests for the testing app."""
import pytest

from conftest import (
    AssertionTypeFactory,
    ControlFactory,
    EngagementControlFactory,
    FindingFactory,
    SampleItemFactory,
    TestExceptionFactory,
    TestInstanceFactory,
    TestPlanFactory,
    TestingMethodFactory,
)


@pytest.mark.django_db
class TestTestingMethod:
    def test_str(self):
        method = TestingMethodFactory(name="Reperformance")
        assert str(method) == "Reperformance"

    def test_method_type_choices(self):
        for mtype in ("inquiry", "observation", "inspection", "reperformance", "analytical", "recalculation", "confirmation"):
            m = TestingMethodFactory(method_type=mtype)
            assert m.method_type == mtype

    def test_unique_name(self):
        from django.db import IntegrityError
        TestingMethodFactory(name="UniqueName")
        with pytest.raises(IntegrityError):
            TestingMethodFactory(name="UniqueName")


@pytest.mark.django_db
class TestAssertionType:
    def test_str(self):
        at = AssertionTypeFactory(name="Existence")
        assert str(at) == "Existence"

    def test_unique_name(self):
        from django.db import IntegrityError
        AssertionTypeFactory(name="Completeness")
        with pytest.raises(IntegrityError):
            AssertionTypeFactory(name="Completeness")


@pytest.mark.django_db
class TestTestPlan:
    def test_str(self):
        plan = TestPlanFactory(name="Q1 Access Control Test")
        assert str(plan) == "Q1 Access Control Test"

    def test_default_status_is_draft(self):
        plan = TestPlanFactory()
        assert plan.status == "draft"

    def test_default_design_effectiveness_not_assessed(self):
        plan = TestPlanFactory()
        assert plan.design_effectiveness_status == "not_assessed"

    def test_sampling_method_choices(self):
        for sm in ("random", "systematic", "haphazard", "judgmental", "stratified"):
            plan = TestPlanFactory(sampling_method=sm)
            assert plan.sampling_method == sm

    def test_plan_status_choices(self):
        for status in ("draft", "approved", "active", "completed", "cancelled"):
            plan = TestPlanFactory(status=status)
            assert plan.status == status

    def test_assertion_types_m2m(self):
        plan = TestPlanFactory()
        at1 = AssertionTypeFactory()
        at2 = AssertionTypeFactory()
        plan.assertion_types.add(at1, at2)
        assert plan.assertion_types.count() == 2

    def test_instance_reverse_relation(self):
        plan = TestPlanFactory()
        TestInstanceFactory(test_plan=plan)
        TestInstanceFactory(test_plan=plan)
        assert plan.instances.count() == 2


@pytest.mark.django_db
class TestTestInstance:
    def test_str(self):
        plan = TestPlanFactory(name="Control Test")
        instance = TestInstanceFactory(test_plan=plan, instance_number=1)
        assert "Control Test" in str(instance)
        assert "#1" in str(instance)

    def test_unique_together_test_plan_instance_number(self):
        from django.db import IntegrityError
        plan = TestPlanFactory()
        TestInstanceFactory(test_plan=plan, instance_number=1)
        with pytest.raises(IntegrityError):
            TestInstanceFactory(test_plan=plan, instance_number=1)

    def test_operating_effectiveness_choices(self):
        for status in ("not_tested", "effective", "partially_effective", "ineffective"):
            instance = TestInstanceFactory(operating_effectiveness_status=status)
            assert instance.operating_effectiveness_status == status

    def test_sample_items_reverse_relation(self):
        instance = TestInstanceFactory()
        SampleItemFactory(test_instance=instance)
        SampleItemFactory(test_instance=instance)
        assert instance.sample_items.count() == 2

    def test_exceptions_reverse_relation(self):
        instance = TestInstanceFactory()
        TestExceptionFactory(test_instance=instance)
        assert instance.exceptions.count() == 1


@pytest.mark.django_db
class TestSampleItem:
    def test_str(self):
        instance = TestInstanceFactory()
        item = SampleItemFactory(test_instance=instance, item_identifier="TXN-001")
        assert "TXN-001" in str(item)

    def test_result_choices(self):
        for result in ("not_tested", "pass", "fail", "exception", "na"):
            item = SampleItemFactory(result=result)
            assert item.result == result

    def test_default_result_not_tested(self):
        item = SampleItemFactory()
        assert item.result == "not_tested"


@pytest.mark.django_db
class TestTestException:
    def test_str_includes_severity(self):
        exc = TestExceptionFactory(severity="critical", title="Missing Evidence")
        result = str(exc)
        assert "CRITICAL" in result
        assert "Missing Evidence" in result

    def test_exception_type_choices(self):
        for etype in ("design", "operating", "data_quality", "missing_evidence", "other"):
            exc = TestExceptionFactory(exception_type=etype)
            assert exc.exception_type == etype

    def test_severity_choices(self):
        for sev in ("critical", "high", "medium", "low"):
            exc = TestExceptionFactory(severity=sev)
            assert exc.severity == sev

    def test_optional_finding_link(self):
        finding = FindingFactory()
        exc = TestExceptionFactory(finding=finding)
        assert exc.finding == finding

    def test_optional_sample_item_link(self):
        instance = TestInstanceFactory()
        item = SampleItemFactory(test_instance=instance)
        exc = TestExceptionFactory(test_instance=instance, sample_item=item)
        assert exc.sample_item == item


# ── Epic 4: new field tests ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTestPlanNewFields:
    def test_acceptance_criteria_defaults_blank(self):
        plan = TestPlanFactory()
        assert plan.acceptance_criteria == ""

    def test_tolerable_exception_rate_nullable(self):
        plan = TestPlanFactory()
        assert plan.tolerable_exception_rate is None

    def test_procedure_template_defaults_blank(self):
        plan = TestPlanFactory()
        assert plan.procedure_template == ""

    def test_can_set_tolerable_exception_rate(self):
        plan = TestPlanFactory(tolerable_exception_rate="5.00")
        assert float(plan.tolerable_exception_rate) == 5.0


@pytest.mark.django_db
class TestTestInstanceRollup:
    def test_rollup_sets_pass_and_effective(self):
        ec = EngagementControlFactory(test_result="not_tested", effectiveness_rating="not_assessed")
        plan = TestPlanFactory(control=ec.control)
        instance = TestInstanceFactory(
            test_plan=plan,
            engagement_control=ec,
            operating_effectiveness_status="effective",
        )
        instance.rollup_to_engagement_control()
        ec.refresh_from_db()
        assert ec.test_result == "pass"
        assert ec.effectiveness_rating == "effective"

    def test_rollup_sets_partial_and_partially_effective(self):
        ec = EngagementControlFactory()
        plan = TestPlanFactory(control=ec.control)
        instance = TestInstanceFactory(
            test_plan=plan,
            engagement_control=ec,
            operating_effectiveness_status="partially_effective",
        )
        instance.rollup_to_engagement_control()
        ec.refresh_from_db()
        assert ec.test_result == "partial"
        assert ec.effectiveness_rating == "partially_effective"

    def test_rollup_sets_fail_and_ineffective(self):
        ec = EngagementControlFactory()
        plan = TestPlanFactory(control=ec.control)
        instance = TestInstanceFactory(
            test_plan=plan,
            engagement_control=ec,
            operating_effectiveness_status="ineffective",
        )
        instance.rollup_to_engagement_control()
        ec.refresh_from_db()
        assert ec.test_result == "fail"
        assert ec.effectiveness_rating == "ineffective"

    def test_rollup_noop_when_no_engagement_control(self):
        instance = TestInstanceFactory(engagement_control=None)
        # Must not raise any exception
        instance.rollup_to_engagement_control()

    def test_engagement_control_field_nullable(self):
        instance = TestInstanceFactory(engagement_control=None)
        assert instance.engagement_control is None


@pytest.mark.django_db
class TestSampleItemNewFields:
    def test_tested_date_defaults_null(self):
        item = SampleItemFactory()
        assert item.tested_date is None

    def test_population_segment_defaults_blank(self):
        item = SampleItemFactory()
        assert item.population_segment == ""

    def test_can_set_tested_date(self):
        from datetime import date
        item = SampleItemFactory(tested_date=date(2026, 1, 15))
        assert item.tested_date == date(2026, 1, 15)

    def test_can_set_population_segment(self):
        item = SampleItemFactory(population_segment="High Value")
        assert item.population_segment == "High Value"


@pytest.mark.django_db
class TestTestExceptionNewFields:
    def test_root_cause_defaults_blank(self):
        exc = TestExceptionFactory()
        assert exc.root_cause == ""

    def test_root_cause_valid_choices(self):
        for rc in ("process", "system", "people", "control_design", "data", "external", "other"):
            exc = TestExceptionFactory(root_cause=rc)
            assert exc.root_cause == rc
