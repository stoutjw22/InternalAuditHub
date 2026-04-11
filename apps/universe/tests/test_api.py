"""
API tests for the universe app.

Endpoints covered:
  GET/POST        /api/v1/auditable-domains/
  GET/PUT/PATCH/DELETE  /api/v1/auditable-domains/<pk>/
  GET/POST        /api/v1/auditable-entities/
  GET/PUT/PATCH/DELETE  /api/v1/auditable-entities/<pk>/
  GET/POST        /api/v1/subprocesses/
  GET/PUT/PATCH/DELETE  /api/v1/subprocesses/<pk>/

Permission matrix:
  List:   AuditorOrAbove
  Create domains/entities: AuditManagerOrAbove
  Create subprocesses: AuditorOrAbove
  Update/Delete: AuditManagerOrAbove (domains/entities), AuditorOrAbove (subprocesses)
"""
import pytest

from conftest import (
    AuditableDomainFactory,
    AuditableEntityFactory,
    BusinessProcessFactory,
    SubprocessFactory,
)

DOMAINS_URL = "/api/v1/auditable-domains/"
ENTITIES_URL = "/api/v1/auditable-entities/"
SUBPROCESSES_URL = "/api/v1/subprocesses/"


# ── /api/v1/auditable-domains/ ────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuditableDomainListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(DOMAINS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(DOMAINS_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        AuditableDomainFactory()
        resp = auditor_client.get(DOMAINS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_list_has_pagination(self, auditor_client):
        resp = auditor_client.get(DOMAINS_URL)
        assert "results" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(DOMAINS_URL, {"name": "Finance"})
        assert resp.status_code == 403

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            DOMAINS_URL,
            {"name": "Finance", "description": "Finance domain"},
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Finance"
        assert "subdomain_count" in resp.data
        assert "entity_count" in resp.data

    def test_create_with_parent(self, manager_client):
        parent = AuditableDomainFactory()
        resp = manager_client.post(
            DOMAINS_URL,
            {"name": "SubDomain", "parent": str(parent.pk)},
        )
        assert resp.status_code == 201
        assert resp.data["parent"] == str(parent.pk)
        assert resp.data["parent_name"] == parent.name

    def test_filter_by_is_active(self, auditor_client):
        AuditableDomainFactory(is_active=True)
        AuditableDomainFactory(is_active=False)
        resp = auditor_client.get(f"{DOMAINS_URL}?is_active=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_active"] is True

    def test_search_by_name(self, auditor_client):
        AuditableDomainFactory(name="Finance Operations")
        AuditableDomainFactory(name="Technology Systems")
        resp = auditor_client.get(f"{DOMAINS_URL}?search=Finance")
        assert resp.status_code == 200
        assert any("Finance" in r["name"] for r in resp.data["results"])


@pytest.mark.django_db
class TestAuditableDomainDetail:
    def test_retrieve(self, auditor_client):
        domain = AuditableDomainFactory(name="Technology")
        resp = auditor_client.get(f"{DOMAINS_URL}{domain.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Technology"

    def test_manager_can_update(self, manager_client):
        domain = AuditableDomainFactory(name="Old Name")
        resp = manager_client.patch(f"{DOMAINS_URL}{domain.pk}/", {"name": "New Name"})
        assert resp.status_code == 200
        assert resp.data["name"] == "New Name"

    def test_auditor_cannot_update(self, auditor_client):
        domain = AuditableDomainFactory()
        resp = auditor_client.patch(f"{DOMAINS_URL}{domain.pk}/", {"name": "X"})
        assert resp.status_code == 403

    def test_manager_can_delete(self, manager_client):
        domain = AuditableDomainFactory()
        resp = manager_client.delete(f"{DOMAINS_URL}{domain.pk}/")
        assert resp.status_code == 204

    def test_not_found_returns_404(self, auditor_client):
        import uuid
        resp = auditor_client.get(f"{DOMAINS_URL}{uuid.uuid4()}/")
        assert resp.status_code == 404


# ── /api/v1/auditable-entities/ ───────────────────────────────────────────────

@pytest.mark.django_db
class TestAuditableEntityListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(ENTITIES_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        AuditableEntityFactory()
        resp = auditor_client.get(ENTITIES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        domain = AuditableDomainFactory()
        resp = manager_client.post(
            ENTITIES_URL,
            {
                "name": "Accounts Payable",
                "domain": str(domain.pk),
                "entity_type": "process",
                "inherent_risk_rating": "high",
            },
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Accounts Payable"
        assert "entity_type_display" in resp.data
        assert "inherent_risk_rating_display" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        domain = AuditableDomainFactory()
        resp = auditor_client.post(
            ENTITIES_URL,
            {"name": "AP", "domain": str(domain.pk), "entity_type": "process"},
        )
        assert resp.status_code == 403

    def test_filter_by_entity_type(self, auditor_client):
        AuditableEntityFactory(entity_type="system")
        AuditableEntityFactory(entity_type="vendor")
        resp = auditor_client.get(f"{ENTITIES_URL}?entity_type=system")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["entity_type"] == "system"

    def test_filter_by_inherent_risk_rating(self, auditor_client):
        AuditableEntityFactory(inherent_risk_rating="critical")
        AuditableEntityFactory(inherent_risk_rating="low")
        resp = auditor_client.get(f"{ENTITIES_URL}?inherent_risk_rating=critical")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["inherent_risk_rating"] == "critical"

    def test_filter_by_domain(self, auditor_client):
        domain = AuditableDomainFactory()
        AuditableEntityFactory(domain=domain)
        AuditableEntityFactory()
        resp = auditor_client.get(f"{ENTITIES_URL}?domain={domain.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["domain"] == str(domain.pk)


@pytest.mark.django_db
class TestAuditableEntityDetail:
    def test_retrieve(self, auditor_client):
        entity = AuditableEntityFactory(name="Core Banking")
        resp = auditor_client.get(f"{ENTITIES_URL}{entity.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Core Banking"

    def test_manager_can_update(self, manager_client):
        entity = AuditableEntityFactory()
        resp = manager_client.patch(
            f"{ENTITIES_URL}{entity.pk}/",
            {"inherent_risk_rating": "critical"},
        )
        assert resp.status_code == 200
        assert resp.data["inherent_risk_rating"] == "critical"

    def test_manager_can_delete(self, manager_client):
        entity = AuditableEntityFactory()
        resp = manager_client.delete(f"{ENTITIES_URL}{entity.pk}/")
        assert resp.status_code == 204


# ── /api/v1/subprocesses/ ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSubprocessListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(SUBPROCESSES_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        SubprocessFactory()
        resp = auditor_client.get(SUBPROCESSES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        bp = BusinessProcessFactory()
        resp = auditor_client.post(
            SUBPROCESSES_URL,
            {
                "name": "Invoice Review",
                "business_process": str(bp.pk),
                "sequence_order": 1,
            },
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Invoice Review"
        assert "business_process_name" in resp.data

    def test_filter_by_business_process(self, auditor_client):
        bp = BusinessProcessFactory()
        SubprocessFactory(business_process=bp)
        SubprocessFactory()
        resp = auditor_client.get(f"{SUBPROCESSES_URL}?business_process={bp.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["business_process"] == str(bp.pk)

    def test_filter_by_auditable_entity(self, auditor_client):
        entity = AuditableEntityFactory()
        SubprocessFactory(auditable_entity=entity)
        SubprocessFactory()
        resp = auditor_client.get(f"{SUBPROCESSES_URL}?auditable_entity={entity.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["auditable_entity"] == str(entity.pk)


@pytest.mark.django_db
class TestSubprocessDetail:
    def test_retrieve(self, auditor_client):
        sp = SubprocessFactory(name="Payment Processing")
        resp = auditor_client.get(f"{SUBPROCESSES_URL}{sp.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Payment Processing"

    def test_auditor_can_update(self, auditor_client):
        sp = SubprocessFactory()
        resp = auditor_client.patch(f"{SUBPROCESSES_URL}{sp.pk}/", {"sequence_order": 5})
        assert resp.status_code == 200
        assert resp.data["sequence_order"] == 5

    def test_auditor_can_delete(self, auditor_client):
        sp = SubprocessFactory()
        resp = auditor_client.delete(f"{SUBPROCESSES_URL}{sp.pk}/")
        assert resp.status_code == 204
