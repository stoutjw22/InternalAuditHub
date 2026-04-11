"""
API tests for the risks app.

Endpoints covered:
  GET/POST  /api/v1/risks/
  GET/PATCH/DELETE  /api/v1/risks/<pk>/
  GET/POST  /api/v1/engagement-risks/
  GET/PATCH/DELETE  /api/v1/engagement-risks/<pk>/
  GET/POST  /api/v1/engagements/<pk>/risks/
  GET/PATCH/DELETE  /api/v1/engagements/<pk>/risks/<pk>/

Permission matrix:
  List risks:    RiskOwnerOrAbove (risk_owner, auditor, manager, admin)
  Create risk:   AuditorOrAbove   (auditor, manager, admin)
  Update/Delete: AuditorOrAbove
"""
import pytest

from conftest import (
    AuditEngagementFactory,
    EngagementRiskFactory,
    RiskFactory,
    UserFactory,
)

RISKS_URL = "/api/v1/risks/"
ENG_RISKS_URL = "/api/v1/engagement-risks/"


# ── /api/v1/risks/ ─────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRiskListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(RISKS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(RISKS_URL)
        assert resp.status_code == 403

    def test_risk_owner_can_list(self, risk_owner_client):
        RiskFactory()
        resp = risk_owner_client.get(RISKS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_list(self, auditor_client):
        RiskFactory()
        resp = auditor_client.get(RISKS_URL)
        assert resp.status_code == 200

    def test_manager_can_list(self, manager_client):
        RiskFactory()
        resp = manager_client.get(RISKS_URL)
        assert resp.status_code == 200

    def test_list_response_has_pagination_structure(self, auditor_client):
        resp = auditor_client.get(RISKS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data
        assert "count" in resp.data

    def test_risk_owner_cannot_create(self, risk_owner_client):
        data = {"name": "Risk", "category": "operational"}
        resp = risk_owner_client.post(RISKS_URL, data)
        assert resp.status_code == 403

    def test_read_only_cannot_create(self, read_only_client):
        data = {"name": "Risk", "category": "operational"}
        resp = read_only_client.post(RISKS_URL, data)
        assert resp.status_code == 403

    def test_auditor_can_create(self, auditor_client):
        data = {
            "name": "Data Loss Risk",
            "category": "technology",
            "inherent_likelihood": 4,
            "inherent_impact": 3,
        }
        resp = auditor_client.post(RISKS_URL, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Data Loss Risk"
        assert resp.data["inherent_score"] == 12
        assert resp.data["risk_rating"] == "High"

    def test_manager_can_create(self, manager_client):
        data = {
            "name": "Compliance Violation Risk",
            "category": "compliance",
            "inherent_likelihood": 3,
            "inherent_impact": 5,
        }
        resp = manager_client.post(RISKS_URL, data)
        assert resp.status_code == 201

    def test_create_returns_computed_fields(self, auditor_client):
        data = {
            "name": "Critical Risk",
            "inherent_likelihood": 5,
            "inherent_impact": 5,
        }
        resp = auditor_client.post(RISKS_URL, data)
        assert resp.status_code == 201
        assert resp.data["risk_rating"] == "Critical"
        assert resp.data["inherent_score"] == 25

    def test_create_missing_name_returns_400(self, auditor_client):
        resp = auditor_client.post(RISKS_URL, {"category": "operational"})
        assert resp.status_code == 400

    def test_create_invalid_likelihood_returns_400(self, auditor_client):
        data = {"name": "Bad Risk", "inherent_likelihood": 0, "inherent_impact": 3}
        resp = auditor_client.post(RISKS_URL, data)
        assert resp.status_code == 400

    def test_filter_by_category(self, auditor_client):
        RiskFactory(category="financial")
        RiskFactory(category="technology")
        resp = auditor_client.get(f"{RISKS_URL}?category=financial")
        assert resp.status_code == 200
        for risk in resp.data["results"]:
            assert risk["category"] == "financial"

    def test_filter_by_status(self, auditor_client):
        RiskFactory(status="mitigated")
        RiskFactory(status="identified")
        resp = auditor_client.get(f"{RISKS_URL}?status=mitigated")
        assert resp.status_code == 200
        for risk in resp.data["results"]:
            assert risk["status"] == "mitigated"


@pytest.mark.django_db
class TestRiskDetail:
    def test_retrieve_risk(self, risk_owner_client):
        risk = RiskFactory(name="Known Risk")
        resp = risk_owner_client.get(f"{RISKS_URL}{risk.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Known Risk"

    def test_partial_update_by_auditor(self, auditor_client):
        risk = RiskFactory(name="Old Name")
        resp = auditor_client.patch(f"{RISKS_URL}{risk.pk}/", {"name": "Updated Name"})
        assert resp.status_code == 200
        assert resp.data["name"] == "Updated Name"

    def test_full_update_by_manager(self, manager_client):
        risk = RiskFactory()
        data = {
            "name": "Fully Updated Risk",
            "category": "fraud",
            "status": "assessed",
            "inherent_likelihood": 2,
            "inherent_impact": 2,
        }
        resp = manager_client.put(f"{RISKS_URL}{risk.pk}/", data)
        assert resp.status_code == 200
        assert resp.data["name"] == "Fully Updated Risk"

    def test_delete_by_auditor(self, auditor_client):
        risk = RiskFactory()
        resp = auditor_client.delete(f"{RISKS_URL}{risk.pk}/")
        assert resp.status_code == 204

    def test_risk_owner_cannot_delete(self, risk_owner_client):
        risk = RiskFactory()
        resp = risk_owner_client.delete(f"{RISKS_URL}{risk.pk}/")
        assert resp.status_code == 403

    def test_risk_owner_cannot_update(self, risk_owner_client):
        risk = RiskFactory()
        resp = risk_owner_client.patch(f"{RISKS_URL}{risk.pk}/", {"name": "X"})
        assert resp.status_code == 403

    def test_unauthenticated_retrieve_returns_401(self, api_client):
        risk = RiskFactory()
        resp = api_client.get(f"{RISKS_URL}{risk.pk}/")
        assert resp.status_code == 401


# ── /api/v1/engagement-risks/ (flat) ──────────────────────────────────────────

@pytest.mark.django_db
class TestEngagementRiskFlat:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(ENG_RISKS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(ENG_RISKS_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        EngagementRiskFactory()
        resp = auditor_client.get(ENG_RISKS_URL)
        assert resp.status_code == 200

    def test_auditor_can_create(self, auditor_client):
        engagement = AuditEngagementFactory()
        risk = RiskFactory()
        data = {
            "engagement": str(engagement.pk),
            "risk": str(risk.pk),
            "is_in_scope": True,
        }
        resp = auditor_client.post(ENG_RISKS_URL, data)
        assert resp.status_code == 201
        assert resp.data["is_in_scope"] is True

    def test_duplicate_engagement_risk_returns_400(self, auditor_client):
        er = EngagementRiskFactory()
        data = {
            "engagement": str(er.engagement.pk),
            "risk": str(er.risk.pk),
            "is_in_scope": True,
        }
        resp = auditor_client.post(ENG_RISKS_URL, data)
        assert resp.status_code == 400

    def test_retrieve_flat(self, auditor_client):
        er = EngagementRiskFactory()
        resp = auditor_client.get(f"{ENG_RISKS_URL}{er.pk}/")
        assert resp.status_code == 200
        assert "risk_detail" in resp.data

    def test_partial_update_flat(self, auditor_client):
        er = EngagementRiskFactory(is_in_scope=True)
        resp = auditor_client.patch(
            f"{ENG_RISKS_URL}{er.pk}/",
            {"is_in_scope": False},
        )
        assert resp.status_code == 200
        assert resp.data["is_in_scope"] is False

    def test_delete_flat(self, auditor_client):
        er = EngagementRiskFactory()
        resp = auditor_client.delete(f"{ENG_RISKS_URL}{er.pk}/")
        assert resp.status_code == 204


# ── /api/v1/engagements/<pk>/risks/ (nested) ──────────────────────────────────

@pytest.mark.django_db
class TestEngagementRiskNested:
    def test_list_scoped_to_engagement(self, auditor_client):
        er1 = EngagementRiskFactory()
        EngagementRiskFactory()  # different engagement
        url = f"/api/v1/engagements/{er1.engagement.pk}/risks/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        # Only results from er1's engagement
        for item in resp.data["results"]:
            assert str(item["engagement"]) == str(er1.engagement.pk)

    def test_create_sets_engagement_from_url(self, auditor_client):
        engagement = AuditEngagementFactory()
        risk = RiskFactory()
        url = f"/api/v1/engagements/{engagement.pk}/risks/"
        # Serializer requires engagement in body; view's perform_create also enforces it
        resp = auditor_client.post(url, {"engagement": str(engagement.pk), "risk": str(risk.pk)})
        assert resp.status_code == 201
        assert str(resp.data["engagement"]) == str(engagement.pk)

    def test_nested_detail_retrieve(self, auditor_client):
        er = EngagementRiskFactory()
        url = f"/api/v1/engagements/{er.engagement.pk}/risks/{er.pk}/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200

    def test_nested_detail_delete(self, auditor_client):
        er = EngagementRiskFactory()
        url = f"/api/v1/engagements/{er.engagement.pk}/risks/{er.pk}/"
        resp = auditor_client.delete(url)
        assert resp.status_code == 204

    def test_read_only_cannot_access_nested(self, read_only_client):
        er = EngagementRiskFactory()
        url = f"/api/v1/engagements/{er.engagement.pk}/risks/"
        resp = read_only_client.get(url)
        assert resp.status_code == 403
