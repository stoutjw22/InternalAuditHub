"""Model tests for the testing app."""
import pytest

from conftest import (
    AssertionTypeFactory,
    ControlFactory,
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
