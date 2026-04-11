"""
API tests for the jurisdictions app.

Endpoints covered:
  GET/POST        /api/v1/jurisdictions/
  GET/PATCH/DELETE  /api/v1/jurisdictions/<pk>/
  GET/POST        /api/v1/requirement-overlays/
  GET/PATCH/DELETE  /api/v1/requirement-overlays/<pk>/
  GET/POST        /api/v1/applicability-rules/
  GET/PATCH/DELETE  /api/v1/applicability-rules/<pk>/

Permission matrix:
  List:   AuditorOrAbove
  Create: AuditManagerOrAbove (all endpoints)
  Update/Delete: AuditManagerOrAbove
"""
import pytest

from conftest import (
    ApplicabilityLogicFactory,
    AuditableEntityFactory,
    FrameworkRequirementFactory,
    JurisdictionFactory,
    RequirementOverlayFactory,
)

JURISDICTIONS_URL = "/api/v1/jurisdictions/"
OVERLAYS_URL = "/api/v1/requirement-overlays/"
APPLICABILITY_URL = "/api/v1/applicability-rules/"


# ── /api/v1/jurisdictions/ ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestJurisdictionListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(JURISDICTIONS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(JURISDICTIONS_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        JurisdictionFactory()
        resp = auditor_client.get(JURISDICTIONS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_list_has_pagination(self, auditor_client):
        resp = auditor_client.get(JURISDICTIONS_URL)
        assert "results" in resp.data
        assert "count" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(
            JURISDICTIONS_URL,
            {"name": "GDPR", "jurisdiction_type": "international"},
        )
        assert resp.status_code == 403

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            JURISDICTIONS_URL,
            {
                "name": "New York Department of Financial Services",
                "short_name": "NYDFS",
                "jurisdiction_type": "state",
                "country": "US",
                "region": "New York",
            },
        )
        assert resp.status_code == 201
        assert resp.data["short_name"] == "NYDFS"
        assert "jurisdiction_type_display" in resp.data
        assert "overlay_count" in resp.data

    def test_filter_by_jurisdiction_type(self, auditor_client):
        JurisdictionFactory(jurisdiction_type="federal")
        JurisdictionFactory(jurisdiction_type="state")
        resp = auditor_client.get(f"{JURISDICTIONS_URL}?jurisdiction_type=federal")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["jurisdiction_type"] == "federal"

    def test_filter_by_country(self, auditor_client):
        JurisdictionFactory(country="US")
        JurisdictionFactory(country="DE")
        resp = auditor_client.get(f"{JURISDICTIONS_URL}?country=US")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["country"] == "US"

    def test_filter_by_is_active(self, auditor_client):
        JurisdictionFactory(is_active=True)
        JurisdictionFactory(is_active=False)
        resp = auditor_client.get(f"{JURISDICTIONS_URL}?is_active=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_active"] is True

    def test_search_by_name(self, auditor_client):
        JurisdictionFactory(name="Federal Reserve Board")
        JurisdictionFactory(name="State Banking Authority")
        resp = auditor_client.get(f"{JURISDICTIONS_URL}?search=Federal")
        assert resp.status_code == 200
        assert any("Federal" in r["name"] for r in resp.data["results"])


@pytest.mark.django_db
class TestJurisdictionDetail:
    def test_retrieve(self, auditor_client):
        j = JurisdictionFactory(short_name="CCPA")
        resp = auditor_client.get(f"{JURISDICTIONS_URL}{j.pk}/")
        assert resp.status_code == 200
        assert resp.data["short_name"] == "CCPA"

    def test_manager_can_update(self, manager_client):
        j = JurisdictionFactory(is_active=True)
        resp = manager_client.patch(f"{JURISDICTIONS_URL}{j.pk}/", {"is_active": False})
        assert resp.status_code == 200
        assert resp.data["is_active"] is False

    def test_auditor_cannot_update(self, auditor_client):
        j = JurisdictionFactory()
        resp = auditor_client.patch(f"{JURISDICTIONS_URL}{j.pk}/", {"country": "GB"})
        assert resp.status_code == 403

    def test_manager_can_delete(self, manager_client):
        j = JurisdictionFactory()
        resp = manager_client.delete(f"{JURISDICTIONS_URL}{j.pk}/")
        assert resp.status_code == 204

    def test_not_found_returns_404(self, auditor_client):
        import uuid
        resp = auditor_client.get(f"{JURISDICTIONS_URL}{uuid.uuid4()}/")
        assert resp.status_code == 404


# ── /api/v1/requirement-overlays/ ─────────────────────────────────────────────

@pytest.mark.django_db
class TestRequirementOverlayListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(OVERLAYS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        RequirementOverlayFactory()
        resp = auditor_client.get(OVERLAYS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        j = JurisdictionFactory()
        req = FrameworkRequirementFactory()
        resp = manager_client.post(
            OVERLAYS_URL,
            {
                "jurisdiction": str(j.pk),
                "framework_requirement": str(req.pk),
                "overlay_type": "stricter",
                "overlay_text": "Multi-factor authentication required for all users.",
                "effective_date": "2024-01-01",
            },
        )
        assert resp.status_code == 201
        assert resp.data["overlay_type"] == "stricter"
        assert "overlay_type_display" in resp.data
        assert "jurisdiction_name" in resp.data
        assert "requirement_display" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        j = JurisdictionFactory()
        req = FrameworkRequirementFactory()
        resp = auditor_client.post(
            OVERLAYS_URL,
            {
                "jurisdiction": str(j.pk),
                "framework_requirement": str(req.pk),
                "overlay_type": "stricter",
                "overlay_text": "X",
                "effective_date": "2024-01-01",
            },
        )
        assert resp.status_code == 403

    def test_duplicate_jurisdiction_requirement_returns_400(self, manager_client):
        overlay = RequirementOverlayFactory()
        resp = manager_client.post(
            OVERLAYS_URL,
            {
                "jurisdiction": str(overlay.jurisdiction.pk),
                "framework_requirement": str(overlay.framework_requirement.pk),
                "overlay_type": "equivalent",
                "overlay_text": "Another text.",
                "effective_date": "2024-01-01",
            },
        )
        assert resp.status_code == 400

    def test_filter_by_jurisdiction(self, auditor_client):
        j = JurisdictionFactory()
        RequirementOverlayFactory(jurisdiction=j)
        RequirementOverlayFactory()
        resp = auditor_client.get(f"{OVERLAYS_URL}?jurisdiction={j.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["jurisdiction"] == str(j.pk)

    def test_filter_by_overlay_type(self, auditor_client):
        RequirementOverlayFactory(overlay_type="stricter")
        RequirementOverlayFactory(overlay_type="exemption")
        resp = auditor_client.get(f"{OVERLAYS_URL}?overlay_type=stricter")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["overlay_type"] == "stricter"

    def test_filter_by_is_active(self, auditor_client):
        RequirementOverlayFactory(is_active=True)
        RequirementOverlayFactory(is_active=False)
        resp = auditor_client.get(f"{OVERLAYS_URL}?is_active=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_active"] is True


@pytest.mark.django_db
class TestRequirementOverlayDetail:
    def test_retrieve(self, auditor_client):
        overlay = RequirementOverlayFactory(overlay_type="additional")
        resp = auditor_client.get(f"{OVERLAYS_URL}{overlay.pk}/")
        assert resp.status_code == 200
        assert resp.data["overlay_type"] == "additional"

    def test_manager_can_update(self, manager_client):
        overlay = RequirementOverlayFactory(is_active=True)
        resp = manager_client.patch(f"{OVERLAYS_URL}{overlay.pk}/", {"is_active": False})
        assert resp.status_code == 200
        assert resp.data["is_active"] is False

    def test_auditor_cannot_update(self, auditor_client):
        overlay = RequirementOverlayFactory()
        resp = auditor_client.patch(f"{OVERLAYS_URL}{overlay.pk}/", {"overlay_type": "exemption"})
        assert resp.status_code == 403

    def test_manager_can_delete(self, manager_client):
        overlay = RequirementOverlayFactory()
        resp = manager_client.delete(f"{OVERLAYS_URL}{overlay.pk}/")
        assert resp.status_code == 204


# ── /api/v1/applicability-rules/ ──────────────────────────────────────────────

@pytest.mark.django_db
class TestApplicabilityLogicListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(APPLICABILITY_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        ApplicabilityLogicFactory()
        resp = auditor_client.get(APPLICABILITY_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create_always_rule(self, manager_client):
        j = JurisdictionFactory()
        resp = manager_client.post(
            APPLICABILITY_URL,
            {
                "name": "NYDFS Part 500 – Always Applicable",
                "jurisdiction": str(j.pk),
                "condition_type": "always",
                "is_applicable": True,
                "effective_date": "2024-01-01",
            },
        )
        assert resp.status_code == 201
        assert resp.data["condition_type"] == "always"
        assert "condition_type_display" in resp.data
        assert "jurisdiction_name" in resp.data

    def test_manager_can_create_entity_type_rule(self, manager_client):
        j = JurisdictionFactory()
        resp = manager_client.post(
            APPLICABILITY_URL,
            {
                "name": "System-specific rule",
                "jurisdiction": str(j.pk),
                "condition_type": "entity_type",
                "condition_config": {"entity_types": ["system"]},
                "is_applicable": True,
                "effective_date": "2024-01-01",
            },
        )
        assert resp.status_code == 201
        assert resp.data["condition_config"] == {"entity_types": ["system"]}

    def test_auditor_cannot_create(self, auditor_client):
        j = JurisdictionFactory()
        resp = auditor_client.post(
            APPLICABILITY_URL,
            {
                "name": "Rule",
                "jurisdiction": str(j.pk),
                "condition_type": "always",
                "effective_date": "2024-01-01",
            },
        )
        assert resp.status_code == 403

    def test_filter_by_jurisdiction(self, auditor_client):
        j = JurisdictionFactory()
        ApplicabilityLogicFactory(jurisdiction=j)
        ApplicabilityLogicFactory()
        resp = auditor_client.get(f"{APPLICABILITY_URL}?jurisdiction={j.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["jurisdiction"] == str(j.pk)

    def test_filter_by_condition_type(self, auditor_client):
        ApplicabilityLogicFactory(condition_type="always")
        ApplicabilityLogicFactory(condition_type="entity_type")
        resp = auditor_client.get(f"{APPLICABILITY_URL}?condition_type=always")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["condition_type"] == "always"

    def test_filter_by_is_applicable(self, auditor_client):
        ApplicabilityLogicFactory(is_applicable=True)
        ApplicabilityLogicFactory(is_applicable=False)
        resp = auditor_client.get(f"{APPLICABILITY_URL}?is_applicable=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_applicable"] is True

    def test_scoped_to_entity(self, auditor_client):
        entity = AuditableEntityFactory()
        ApplicabilityLogicFactory(auditable_entity=entity)
        ApplicabilityLogicFactory()
        resp = auditor_client.get(f"{APPLICABILITY_URL}?auditable_entity={entity.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["auditable_entity"] == str(entity.pk)


@pytest.mark.django_db
class TestApplicabilityLogicDetail:
    def test_retrieve(self, auditor_client):
        rule = ApplicabilityLogicFactory(name="Federal Crypto Rule")
        resp = auditor_client.get(f"{APPLICABILITY_URL}{rule.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Federal Crypto Rule"

    def test_manager_can_update(self, manager_client):
        rule = ApplicabilityLogicFactory(is_applicable=True)
        resp = manager_client.patch(
            f"{APPLICABILITY_URL}{rule.pk}/",
            {"is_applicable": False, "rationale": "Entity below asset threshold."},
        )
        assert resp.status_code == 200
        assert resp.data["is_applicable"] is False

    def test_auditor_cannot_update(self, auditor_client):
        rule = ApplicabilityLogicFactory()
        resp = auditor_client.patch(f"{APPLICABILITY_URL}{rule.pk}/", {"is_applicable": False})
        assert resp.status_code == 403

    def test_manager_can_delete(self, manager_client):
        rule = ApplicabilityLogicFactory()
        resp = manager_client.delete(f"{APPLICABILITY_URL}{rule.pk}/")
        assert resp.status_code == 204
