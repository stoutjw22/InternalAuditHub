"""
API tests for the controls app.

Endpoints covered:
  GET/POST  /api/v1/controls/
  GET/PATCH/DELETE  /api/v1/controls/<pk>/
  GET/POST  /api/v1/engagement-controls/
  GET/PATCH/DELETE  /api/v1/engagement-controls/<pk>/
  GET/POST  /api/v1/engagements/<pk>/controls/
  GET/PATCH/DELETE  /api/v1/engagements/<pk>/controls/<pk>/

Permission notes:
  List controls:    RiskOwnerOrAbove (risk_owner, auditor, manager, admin)
  Create/Update/Delete: AuditorOrAbove
"""
import pytest

from conftest import (
    AuditEngagementFactory,
    ControlFactory,
    EngagementControlFactory,
    RiskFactory,
    UserFactory,
)

CONTROLS_URL = "/api/v1/controls/"
ENG_CONTROLS_URL = "/api/v1/engagement-controls/"


# ── /api/v1/controls/ ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestControlListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(CONTROLS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(CONTROLS_URL)
        assert resp.status_code == 403

    def test_risk_owner_can_list(self, risk_owner_client):
        ControlFactory()
        resp = risk_owner_client.get(CONTROLS_URL)
        assert resp.status_code == 200

    def test_auditor_can_list(self, auditor_client):
        ControlFactory()
        resp = auditor_client.get(CONTROLS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_auditor_can_create(self, auditor_client):
        data = {
            "name": "Quarterly Access Review",
            "control_type": "detective",
            "frequency": "quarterly",
            "status": "active",
        }
        resp = auditor_client.post(CONTROLS_URL, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Quarterly Access Review"

    def test_risk_owner_cannot_create(self, risk_owner_client):
        data = {"name": "Control", "control_type": "preventive"}
        resp = risk_owner_client.post(CONTROLS_URL, data)
        assert resp.status_code == 403

    def test_read_only_cannot_create(self, read_only_client):
        resp = read_only_client.post(CONTROLS_URL, {"name": "Control"})
        assert resp.status_code == 403

    def test_create_missing_name_returns_400(self, auditor_client):
        resp = auditor_client.post(CONTROLS_URL, {"control_type": "preventive"})
        assert resp.status_code == 400

    def test_filter_by_status(self, auditor_client):
        ControlFactory(status="active")
        ControlFactory(status="inactive")
        resp = auditor_client.get(f"{CONTROLS_URL}?status=active")
        assert resp.status_code == 200
        for c in resp.data["results"]:
            assert c["status"] == "active"

    def test_filter_by_control_type(self, auditor_client):
        ControlFactory(control_type="detective")
        ControlFactory(control_type="corrective")
        resp = auditor_client.get(f"{CONTROLS_URL}?control_type=detective")
        assert resp.status_code == 200
        for c in resp.data["results"]:
            assert c["control_type"] == "detective"


@pytest.mark.django_db
class TestControlDetail:
    def test_retrieve(self, auditor_client):
        control = ControlFactory(name="Known Control")
        resp = auditor_client.get(f"{CONTROLS_URL}{control.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Known Control"

    def test_partial_update(self, auditor_client):
        control = ControlFactory(status="active")
        resp = auditor_client.patch(f"{CONTROLS_URL}{control.pk}/", {"status": "under_review"})
        assert resp.status_code == 200
        assert resp.data["status"] == "under_review"

    def test_delete_by_auditor(self, auditor_client):
        control = ControlFactory()
        resp = auditor_client.delete(f"{CONTROLS_URL}{control.pk}/")
        assert resp.status_code == 204

    def test_risk_owner_cannot_update(self, risk_owner_client):
        control = ControlFactory()
        resp = risk_owner_client.patch(f"{CONTROLS_URL}{control.pk}/", {"name": "X"})
        assert resp.status_code == 403


# ── /api/v1/engagement-controls/ (flat) ───────────────────────────────────────

@pytest.mark.django_db
class TestEngagementControlFlat:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(ENG_CONTROLS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        EngagementControlFactory()
        resp = auditor_client.get(ENG_CONTROLS_URL)
        assert resp.status_code == 200

    def test_auditor_can_create(self, auditor_client):
        engagement = AuditEngagementFactory()
        control = ControlFactory()
        data = {
            "engagement": str(engagement.pk),
            "control": str(control.pk),
            "test_result": "pass",
            "effectiveness_rating": "effective",
        }
        resp = auditor_client.post(ENG_CONTROLS_URL, data)
        assert resp.status_code == 201
        assert resp.data["test_result"] == "pass"

    def test_duplicate_returns_400(self, auditor_client):
        ec = EngagementControlFactory()
        data = {
            "engagement": str(ec.engagement.pk),
            "control": str(ec.control.pk),
        }
        resp = auditor_client.post(ENG_CONTROLS_URL, data)
        assert resp.status_code == 400

    def test_retrieve_flat(self, auditor_client):
        ec = EngagementControlFactory()
        resp = auditor_client.get(f"{ENG_CONTROLS_URL}{ec.pk}/")
        assert resp.status_code == 200
        assert "control_detail" in resp.data

    def test_partial_update(self, auditor_client):
        ec = EngagementControlFactory(test_result="not_tested")
        resp = auditor_client.patch(
            f"{ENG_CONTROLS_URL}{ec.pk}/",
            {"test_result": "fail", "effectiveness_rating": "ineffective"},
        )
        assert resp.status_code == 200
        assert resp.data["test_result"] == "fail"

    def test_delete(self, auditor_client):
        ec = EngagementControlFactory()
        resp = auditor_client.delete(f"{ENG_CONTROLS_URL}{ec.pk}/")
        assert resp.status_code == 204


# ── /api/v1/engagements/<pk>/controls/ (nested) ───────────────────────────────

@pytest.mark.django_db
class TestEngagementControlNested:
    def test_list_scoped_to_engagement(self, auditor_client):
        ec = EngagementControlFactory()
        EngagementControlFactory()  # different engagement
        url = f"/api/v1/engagements/{ec.engagement.pk}/controls/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["engagement"]) == str(ec.engagement.pk)

    def test_create_sets_engagement(self, auditor_client):
        engagement = AuditEngagementFactory()
        control = ControlFactory()
        url = f"/api/v1/engagements/{engagement.pk}/controls/"
        data = {"engagement": str(engagement.pk), "control": str(control.pk)}
        resp = auditor_client.post(url, data)
        assert resp.status_code == 201
        assert str(resp.data["engagement"]) == str(engagement.pk)

    def test_read_only_cannot_list(self, read_only_client):
        ec = EngagementControlFactory()
        url = f"/api/v1/engagements/{ec.engagement.pk}/controls/"
        resp = read_only_client.get(url)
        assert resp.status_code == 403
