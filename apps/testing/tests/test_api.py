"""
API tests for the testing app.

Endpoints covered:
  GET/POST        /api/v1/testing-methods/
  GET/POST        /api/v1/assertion-types/
  GET/POST        /api/v1/test-plans/
  GET/PATCH/DELETE  /api/v1/test-plans/<pk>/
  GET/POST        /api/v1/test-instances/
  GET/PATCH/DELETE  /api/v1/test-instances/<pk>/
  GET/POST        /api/v1/sample-items/
  GET/PATCH/DELETE  /api/v1/sample-items/<pk>/
  GET/POST        /api/v1/test-exceptions/
  GET/PATCH/DELETE  /api/v1/test-exceptions/<pk>/

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
            assert item["control"] == str(ctrl.pk)

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
            assert item["test_plan"] == str(plan.pk)

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
            assert item["test_instance"] == str(instance.pk)


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
        assert resp.data["finding"] == str(finding.pk)


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
