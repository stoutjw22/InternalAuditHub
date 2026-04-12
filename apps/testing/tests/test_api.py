"""
API tests for the testing app.

Endpoints covered:
  GET/POST        /api/v1/testing-methods/
  GET/POST        /api/v1/assertion-types/
  GET/POST        /api/v1/test-plans/
  GET/PATCH/DELETE  /api/v1/test-plans/<pk>/
  GET/POST        /api/v1/test-plans/<pk>/instances/
  GET/POST        /api/v1/test-instances/
  GET/PATCH/DELETE  /api/v1/test-instances/<pk>/
  GET/POST        /api/v1/test-instances/<pk>/samples/
  GET/POST        /api/v1/test-instances/<pk>/exceptions/
  POST            /api/v1/test-instances/<pk>/conclude/
  GET             /api/v1/test-instances/<pk>/statistics/
  GET/POST        /api/v1/sample-items/
  GET/PATCH/DELETE  /api/v1/sample-items/<pk>/
  GET/POST        /api/v1/test-exceptions/
  GET/PATCH/DELETE  /api/v1/test-exceptions/<pk>/
  POST            /api/v1/test-exceptions/<pk>/escalate/
  GET             /api/v1/controls/<pk>/test-plans/

Permission matrix:
  List:   AuditorOrAbove
  Create methods/assertion-types: AuditManagerOrAbove
  Create test plans/instances/samples/exceptions: AuditorOrAbove
"""
import pytest

from conftest import (
    AuditEngagementFactory,
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

METHODS_URL = "/api/v1/testing-methods/"
ASSERTIONS_URL = "/api/v1/assertion-types/"
PLANS_URL = "/api/v1/test-plans/"
INSTANCES_URL = "/api/v1/test-instances/"
SAMPLES_URL = "/api/v1/sample-items/"
EXCEPTIONS_URL = "/api/v1/test-exceptions/"


# ── /api/v1/testing-methods/ ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestTestingMethodListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(METHODS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        TestingMethodFactory()
        resp = auditor_client.get(METHODS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            METHODS_URL,
            {
                "name": "Walk-Through",
                "method_type": "inspection",
                "guidance": "Trace a single transaction end-to-end.",
            },
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Walk-Through"
        assert "method_type_display" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(METHODS_URL, {"name": "X", "method_type": "inquiry"})
        assert resp.status_code == 403

    def test_filter_by_method_type(self, auditor_client):
        TestingMethodFactory(method_type="inquiry")
        TestingMethodFactory(method_type="observation")
        resp = auditor_client.get(f"{METHODS_URL}?method_type=inquiry")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["method_type"] == "inquiry"


# ── /api/v1/assertion-types/ ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestAssertionTypeListCreate:
    def test_auditor_can_list(self, auditor_client):
        AssertionTypeFactory()
        resp = auditor_client.get(ASSERTIONS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            ASSERTIONS_URL,
            {"name": "Completeness", "description": "Ensures all records are captured."},
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Completeness"

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(ASSERTIONS_URL, {"name": "Existence"})
        assert resp.status_code == 403


# ── /api/v1/test-plans/ ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTestPlanListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(PLANS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        TestPlanFactory()
        resp = auditor_client.get(PLANS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        ctrl = ControlFactory()
        engagement = AuditEngagementFactory()
        resp = auditor_client.post(
            PLANS_URL,
            {
                "name": "Q1 2026 Logical Access Test",
                "control": str(ctrl.pk),
                "engagement": str(engagement.pk),
                "sampling_method": "random",
                "population_size": 500,
                "sample_size": 25,
            },
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Q1 2026 Logical Access Test"
        assert "design_effectiveness_display" in resp.data
        assert "status_display" in resp.data
        assert "instance_count" in resp.data

    def test_filter_by_control(self, auditor_client):
        ctrl = ControlFactory()
        TestPlanFactory(control=ctrl)
        TestPlanFactory()
        resp = auditor_client.get(f"{PLANS_URL}?control={ctrl.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["control"]) == str(ctrl.pk)

    def test_filter_by_status(self, auditor_client):
        TestPlanFactory(status="draft")
        TestPlanFactory(status="approved")
        resp = auditor_client.get(f"{PLANS_URL}?status=draft")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["status"] == "draft"

    def test_filter_by_design_effectiveness_status(self, auditor_client):
        TestPlanFactory(design_effectiveness_status="effective")
        TestPlanFactory(design_effectiveness_status="not_assessed")
        resp = auditor_client.get(f"{PLANS_URL}?design_effectiveness_status=effective")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["design_effectiveness_status"] == "effective"


@pytest.mark.django_db
class TestTestPlanDetail:
    def test_retrieve(self, auditor_client):
        plan = TestPlanFactory(name="Year-End Payroll Test")
        resp = auditor_client.get(f"{PLANS_URL}{plan.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Year-End Payroll Test"

    def test_auditor_can_update_status(self, auditor_client):
        plan = TestPlanFactory(status="draft")
        resp = auditor_client.patch(f"{PLANS_URL}{plan.pk}/", {"status": "approved"})
        assert resp.status_code == 200
        assert resp.data["status"] == "approved"

    def test_auditor_can_update_design_effectiveness(self, auditor_client):
        plan = TestPlanFactory()
        resp = auditor_client.patch(
            f"{PLANS_URL}{plan.pk}/",
            {"design_effectiveness_status": "effective"},
        )
        assert resp.status_code == 200
        assert resp.data["design_effectiveness_status"] == "effective"

    def test_auditor_can_delete(self, auditor_client):
        plan = TestPlanFactory()
        resp = auditor_client.delete(f"{PLANS_URL}{plan.pk}/")
        assert resp.status_code == 204


# ── /api/v1/test-instances/ ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestTestInstanceListCreate:
    def test_auditor_can_list(self, auditor_client):
        TestInstanceFactory()
        resp = auditor_client.get(INSTANCES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client, auditor_user):
        plan = TestPlanFactory()
        resp = auditor_client.post(
            INSTANCES_URL,
            {
                "test_plan": str(plan.pk),
                "instance_number": 1,
                "test_period_start": "2026-01-01",
                "test_period_end": "2026-03-31",
                "performed_by": str(auditor_user.pk),
                "operating_effectiveness_status": "not_tested",
            },
        )
        assert resp.status_code == 201
        assert "operating_effectiveness_display" in resp.data
        assert "exception_count" in resp.data
        assert "sample_count" in resp.data

    def test_filter_by_test_plan(self, auditor_client):
        plan = TestPlanFactory()
        TestInstanceFactory(test_plan=plan)
        TestInstanceFactory()
        resp = auditor_client.get(f"{INSTANCES_URL}?test_plan={plan.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["test_plan"]) == str(plan.pk)

    def test_filter_by_operating_effectiveness(self, auditor_client):
        TestInstanceFactory(operating_effectiveness_status="effective")
        TestInstanceFactory(operating_effectiveness_status="not_tested")
        resp = auditor_client.get(f"{INSTANCES_URL}?operating_effectiveness_status=effective")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["operating_effectiveness_status"] == "effective"


@pytest.mark.django_db
class TestTestInstanceDetail:
    def test_retrieve(self, auditor_client):
        instance = TestInstanceFactory(conclusion="Controls operating effectively.")
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/")
        assert resp.status_code == 200
        assert resp.data["conclusion"] == "Controls operating effectively."

    def test_auditor_can_update_effectiveness(self, auditor_client):
        instance = TestInstanceFactory(operating_effectiveness_status="not_tested")
        resp = auditor_client.patch(
            f"{INSTANCES_URL}{instance.pk}/",
            {"operating_effectiveness_status": "effective"},
        )
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "effective"

    def test_auditor_can_delete(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.delete(f"{INSTANCES_URL}{instance.pk}/")
        assert resp.status_code == 204


# ── /api/v1/sample-items/ ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSampleItemListCreate:
    def test_auditor_can_list(self, auditor_client):
        SampleItemFactory()
        resp = auditor_client.get(SAMPLES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.post(
            SAMPLES_URL,
            {
                "test_instance": str(instance.pk),
                "item_identifier": "INV-2026-00042",
                "description": "January payroll run.",
                "result": "not_tested",
            },
        )
        assert resp.status_code == 201
        assert resp.data["item_identifier"] == "INV-2026-00042"
        assert "result_display" in resp.data

    def test_filter_by_result(self, auditor_client):
        SampleItemFactory(result="pass")
        SampleItemFactory(result="fail")
        resp = auditor_client.get(f"{SAMPLES_URL}?result=pass")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["result"] == "pass"

    def test_filter_by_test_instance(self, auditor_client):
        instance = TestInstanceFactory()
        SampleItemFactory(test_instance=instance)
        SampleItemFactory()
        resp = auditor_client.get(f"{SAMPLES_URL}?test_instance={instance.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["test_instance"]) == str(instance.pk)


@pytest.mark.django_db
class TestSampleItemDetail:
    def test_retrieve(self, auditor_client):
        item = SampleItemFactory(item_identifier="TXN-9999")
        resp = auditor_client.get(f"{SAMPLES_URL}{item.pk}/")
        assert resp.status_code == 200
        assert resp.data["item_identifier"] == "TXN-9999"

    def test_auditor_can_update_result(self, auditor_client):
        item = SampleItemFactory(result="not_tested")
        resp = auditor_client.patch(f"{SAMPLES_URL}{item.pk}/", {"result": "pass"})
        assert resp.status_code == 200
        assert resp.data["result"] == "pass"

    def test_auditor_can_delete(self, auditor_client):
        item = SampleItemFactory()
        resp = auditor_client.delete(f"{SAMPLES_URL}{item.pk}/")
        assert resp.status_code == 204


# ── /api/v1/test-exceptions/ ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestTestExceptionListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(EXCEPTIONS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        TestExceptionFactory()
        resp = auditor_client.get(EXCEPTIONS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.post(
            EXCEPTIONS_URL,
            {
                "test_instance": str(instance.pk),
                "title": "Missing approval signature",
                "description": "Invoice #1234 lacks manager approval.",
                "exception_type": "operating",
                "severity": "high",
            },
        )
        assert resp.status_code == 201
        assert resp.data["title"] == "Missing approval signature"
        assert "exception_type_display" in resp.data
        assert "severity_display" in resp.data

    def test_filter_by_severity(self, auditor_client):
        TestExceptionFactory(severity="critical")
        TestExceptionFactory(severity="low")
        resp = auditor_client.get(f"{EXCEPTIONS_URL}?severity=critical")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["severity"] == "critical"

    def test_filter_by_exception_type(self, auditor_client):
        TestExceptionFactory(exception_type="design")
        TestExceptionFactory(exception_type="operating")
        resp = auditor_client.get(f"{EXCEPTIONS_URL}?exception_type=design")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["exception_type"] == "design"

    def test_exception_linked_to_finding(self, auditor_client):
        finding = FindingFactory()
        instance = TestInstanceFactory()
        resp = auditor_client.post(
            EXCEPTIONS_URL,
            {
                "test_instance": str(instance.pk),
                "title": "Escalated Exception",
                "description": "Linked to a formal finding.",
                "exception_type": "operating",
                "severity": "high",
                "finding": str(finding.pk),
            },
        )
        assert resp.status_code == 201
        assert str(resp.data["finding"]) == str(finding.pk)


@pytest.mark.django_db
class TestTestExceptionDetail:
    def test_retrieve(self, auditor_client):
        exc = TestExceptionFactory(severity="critical")
        resp = auditor_client.get(f"{EXCEPTIONS_URL}{exc.pk}/")
        assert resp.status_code == 200
        assert resp.data["severity"] == "critical"

    def test_auditor_can_update(self, auditor_client):
        exc = TestExceptionFactory(severity="low")
        resp = auditor_client.patch(f"{EXCEPTIONS_URL}{exc.pk}/", {"severity": "high"})
        assert resp.status_code == 200
        assert resp.data["severity"] == "high"

    def test_auditor_can_delete(self, auditor_client):
        exc = TestExceptionFactory()
        resp = auditor_client.delete(f"{EXCEPTIONS_URL}{exc.pk}/")
        assert resp.status_code == 204


# ── Epic 4: nested routes ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTestPlanInstancesNestedRoute:
    def test_list_scoped_to_plan(self, auditor_client):
        plan = TestPlanFactory()
        TestInstanceFactory(test_plan=plan)
        TestInstanceFactory(test_plan=plan)
        TestInstanceFactory()  # different plan — must not appear
        resp = auditor_client.get(f"{PLANS_URL}{plan.pk}/instances/")
        assert resp.status_code == 200
        assert resp.data["count"] == 2

    def test_create_sets_test_plan_automatically(self, auditor_client, auditor_user):
        plan = TestPlanFactory()
        resp = auditor_client.post(
            f"{PLANS_URL}{plan.pk}/instances/",
            {
                "instance_number": 1,
                "operating_effectiveness_status": "not_tested",
                "performed_by": str(auditor_user.pk),
            },
        )
        assert resp.status_code == 201
        assert str(resp.data["test_plan"]) == str(plan.pk)

    def test_unauthenticated_gets_401(self, api_client):
        plan = TestPlanFactory()
        resp = api_client.get(f"{PLANS_URL}{plan.pk}/instances/")
        assert resp.status_code == 401

    def test_empty_list_for_nonexistent_plan(self, auditor_client):
        import uuid
        resp = auditor_client.get(f"{PLANS_URL}{uuid.uuid4()}/instances/")
        assert resp.status_code == 200
        assert resp.data["count"] == 0


@pytest.mark.django_db
class TestTestInstanceSamplesNestedRoute:
    def test_list_scoped_to_instance(self, auditor_client):
        instance = TestInstanceFactory()
        SampleItemFactory(test_instance=instance)
        SampleItemFactory(test_instance=instance)
        SampleItemFactory()  # different instance
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/samples/")
        assert resp.status_code == 200
        assert resp.data["count"] == 2

    def test_create_sets_test_instance_automatically(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.post(
            f"{INSTANCES_URL}{instance.pk}/samples/",
            {"item_identifier": "TXN-001", "result": "not_tested"},
        )
        assert resp.status_code == 201
        assert str(resp.data["test_instance"]) == str(instance.pk)

    def test_new_fields_returned(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.post(
            f"{INSTANCES_URL}{instance.pk}/samples/",
            {
                "item_identifier": "TXN-002",
                "result": "pass",
                "tested_date": "2026-03-15",
                "population_segment": "Q1 High Value",
            },
        )
        assert resp.status_code == 201
        assert resp.data["tested_date"] == "2026-03-15"
        assert resp.data["population_segment"] == "Q1 High Value"


@pytest.mark.django_db
class TestTestInstanceExceptionsNestedRoute:
    def test_list_scoped_to_instance(self, auditor_client):
        instance = TestInstanceFactory()
        TestExceptionFactory(test_instance=instance)
        TestExceptionFactory()  # different instance
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/exceptions/")
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_create_sets_test_instance_automatically(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.post(
            f"{INSTANCES_URL}{instance.pk}/exceptions/",
            {
                "title": "Missing approval",
                "description": "No sign-off found.",
                "exception_type": "operating",
                "severity": "high",
                "root_cause": "people",
            },
        )
        assert resp.status_code == 201
        assert str(resp.data["test_instance"]) == str(instance.pk)
        assert resp.data["root_cause"] == "people"


# ── Epic 4: action endpoints ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestConcludeAction:
    def test_all_pass_gives_effective(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate="5.00")
        instance = TestInstanceFactory(test_plan=plan)
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="pass")
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "effective"
        assert resp.data["compliance_rate"] == 100.0

    def test_exception_within_tolerance_gives_partially_effective(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate="20.00")
        instance = TestInstanceFactory(test_plan=plan)
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="fail")  # 25% fail — wait, 1/4 = 25% > 20%
        # Actually 1/4 = 25% which exceeds 20% so should be ineffective.
        # Use 10% tolerance: 1/10 = 10% exactly = partially effective
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "ineffective"

    def test_exception_rate_at_tolerance_gives_partially_effective(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate="25.00")
        instance = TestInstanceFactory(test_plan=plan)
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="fail")  # 25% = at tolerance
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "partially_effective"

    def test_exception_above_tolerance_gives_ineffective(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate="5.00")
        instance = TestInstanceFactory(test_plan=plan)
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="fail")  # 50% > 5%
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "ineffective"

    def test_null_tolerance_treated_as_zero(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate=None)
        instance = TestInstanceFactory(test_plan=plan)
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="fail")
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "ineffective"

    def test_na_samples_excluded_from_rate(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate="0.00")
        instance = TestInstanceFactory(test_plan=plan)
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="na")  # excluded
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        assert resp.data["operating_effectiveness_status"] == "effective"

    def test_no_testable_samples_returns_400(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 400

    def test_na_only_samples_returns_400(self, auditor_client):
        instance = TestInstanceFactory()
        SampleItemFactory(test_instance=instance, result="na")
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 400

    def test_conclude_rolls_up_to_engagement_control(self, auditor_client):
        ec = EngagementControlFactory(test_result="not_tested", effectiveness_rating="not_assessed")
        plan = TestPlanFactory(control=ec.control, tolerable_exception_rate="0.00")
        instance = TestInstanceFactory(test_plan=plan, engagement_control=ec)
        SampleItemFactory(test_instance=instance, result="pass")
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200
        ec.refresh_from_db()
        assert ec.test_result == "pass"
        assert ec.effectiveness_rating == "effective"

    def test_conclude_no_rollup_without_engagement_control(self, auditor_client):
        plan = TestPlanFactory(tolerable_exception_rate="0.00")
        instance = TestInstanceFactory(test_plan=plan, engagement_control=None)
        SampleItemFactory(test_instance=instance, result="pass")
        resp = auditor_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 200  # should succeed without error

    def test_unauthenticated_gets_401(self, api_client):
        instance = TestInstanceFactory()
        resp = api_client.post(f"{INSTANCES_URL}{instance.pk}/conclude/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestEscalateAction:
    def test_creates_finding_with_correct_fields(self, auditor_client):
        engagement = AuditEngagementFactory()
        plan = TestPlanFactory(engagement=engagement)
        instance = TestInstanceFactory(test_plan=plan)
        exc = TestExceptionFactory(test_instance=instance, title="Missing Doc", severity="high")
        resp = auditor_client.post(f"{EXCEPTIONS_URL}{exc.pk}/escalate/")
        assert resp.status_code == 200
        assert resp.data["finding"] is not None

    def test_finding_inherits_severity(self, auditor_client):
        from apps.findings.models import Finding
        engagement = AuditEngagementFactory()
        plan = TestPlanFactory(engagement=engagement)
        instance = TestInstanceFactory(test_plan=plan)
        exc = TestExceptionFactory(test_instance=instance, severity="critical")
        auditor_client.post(f"{EXCEPTIONS_URL}{exc.pk}/escalate/")
        exc.refresh_from_db()
        finding = Finding.objects.get(pk=exc.finding_id)
        assert finding.severity == "critical"

    def test_already_escalated_returns_400(self, auditor_client):
        finding = FindingFactory()
        exc = TestExceptionFactory(finding=finding)
        resp = auditor_client.post(f"{EXCEPTIONS_URL}{exc.pk}/escalate/")
        assert resp.status_code == 400

    def test_no_engagement_returns_400(self, auditor_client):
        plan = TestPlanFactory(engagement=None)
        instance = TestInstanceFactory(test_plan=plan)
        exc = TestExceptionFactory(test_instance=instance)
        resp = auditor_client.post(f"{EXCEPTIONS_URL}{exc.pk}/escalate/")
        assert resp.status_code == 400

    def test_unauthenticated_gets_401(self, api_client):
        exc = TestExceptionFactory()
        resp = api_client.post(f"{EXCEPTIONS_URL}{exc.pk}/escalate/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestStatisticsEndpoint:
    def test_all_pass_returns_100_compliance(self, auditor_client):
        instance = TestInstanceFactory()
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="pass")
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/statistics/")
        assert resp.status_code == 200
        assert resp.data["compliance_rate"] == 100.0
        assert resp.data["passed"] == 2
        assert resp.data["failed"] == 0

    def test_mixed_results_calculates_correctly(self, auditor_client):
        instance = TestInstanceFactory()
        SampleItemFactory(test_instance=instance, result="pass")
        SampleItemFactory(test_instance=instance, result="fail")
        SampleItemFactory(test_instance=instance, result="exception")
        SampleItemFactory(test_instance=instance, result="na")  # excluded
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/statistics/")
        assert resp.status_code == 200
        assert resp.data["total_samples"] == 4
        assert resp.data["testable_samples"] == 3
        assert resp.data["passed"] == 1
        assert resp.data["failed"] == 2
        assert round(resp.data["compliance_rate"], 1) == 33.3

    def test_no_samples_returns_null_compliance(self, auditor_client):
        instance = TestInstanceFactory()
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/statistics/")
        assert resp.status_code == 200
        assert resp.data["compliance_rate"] is None

    def test_exception_severity_breakdown(self, auditor_client):
        instance = TestInstanceFactory()
        TestExceptionFactory(test_instance=instance, severity="high")
        TestExceptionFactory(test_instance=instance, severity="high")
        TestExceptionFactory(test_instance=instance, severity="low")
        resp = auditor_client.get(f"{INSTANCES_URL}{instance.pk}/statistics/")
        assert resp.status_code == 200
        assert resp.data["exceptions_by_severity"]["high"] == 2
        assert resp.data["exceptions_by_severity"]["low"] == 1
        assert resp.data["exception_count"] == 3

    def test_unauthenticated_gets_401(self, api_client):
        instance = TestInstanceFactory()
        resp = api_client.get(f"{INSTANCES_URL}{instance.pk}/statistics/")
        assert resp.status_code == 401


# ── Epic 4: control test-plans route ─────────────────────────────────────────

@pytest.mark.django_db
class TestControlTestPlansRoute:
    def test_scoped_to_correct_control(self, auditor_client):
        ctrl = ControlFactory()
        TestPlanFactory(control=ctrl)
        TestPlanFactory(control=ctrl)
        TestPlanFactory()  # different control — must not appear
        resp = auditor_client.get(f"/api/v1/controls/{ctrl.pk}/test-plans/")
        assert resp.status_code == 200
        assert resp.data["count"] == 2

    def test_empty_list_for_control_with_no_plans(self, auditor_client):
        ctrl = ControlFactory()
        resp = auditor_client.get(f"/api/v1/controls/{ctrl.pk}/test-plans/")
        assert resp.status_code == 200
        assert resp.data["count"] == 0

    def test_unauthenticated_gets_401(self, api_client):
        ctrl = ControlFactory()
        resp = api_client.get(f"/api/v1/controls/{ctrl.pk}/test-plans/")
        assert resp.status_code == 401
