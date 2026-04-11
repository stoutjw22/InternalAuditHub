"""
API tests for the core app.

Endpoints covered:
  GET/POST  /api/v1/business-processes/
  GET/PATCH/DELETE  /api/v1/business-processes/<pk>/
  GET/POST  /api/v1/business-objectives/
  GET/PATCH/DELETE  /api/v1/business-objectives/<pk>/
  GET       /api/v1/audit-logs/              — read-only, manager+ only

Permission notes:
  List business-processes:  AuditManagerOrAbove for write, authenticated for read
  Business-objectives:      AuditManagerOrAbove for write, AuditorOrAbove for read
  AuditLogs:                AuditManagerOrAbove (read-only)
"""
import pytest

from conftest import (
    BusinessObjectiveFactory,
    BusinessProcessFactory,
    UserFactory,
)

BP_URL = "/api/v1/business-processes/"
OBJ_URL = "/api/v1/business-objectives/"
LOGS_URL = "/api/v1/audit-logs/"


# ── Business Processes ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBusinessProcessListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(BP_URL)
        assert resp.status_code == 401

    def test_manager_can_list(self, manager_client):
        BusinessProcessFactory()
        resp = manager_client.get(BP_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_auditor_can_list(self, auditor_client):
        BusinessProcessFactory()
        resp = auditor_client.get(BP_URL)
        assert resp.status_code == 200

    def test_manager_can_create(self, manager_client):
        data = {"name": "Procurement", "description": "All purchasing activities."}
        resp = manager_client.post(BP_URL, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Procurement"

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(BP_URL, {"name": "X"})
        assert resp.status_code == 403

    def test_create_missing_name_returns_400(self, manager_client):
        resp = manager_client.post(BP_URL, {"description": "No name here."})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestBusinessProcessDetail:
    def test_retrieve_by_manager(self, manager_client):
        bp = BusinessProcessFactory(name="HR Process")
        resp = manager_client.get(f"{BP_URL}{bp.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "HR Process"

    def test_update_by_manager(self, manager_client):
        bp = BusinessProcessFactory()
        resp = manager_client.patch(f"{BP_URL}{bp.pk}/", {"is_active": False})
        assert resp.status_code == 200
        assert resp.data["is_active"] is False

    def test_delete_by_manager(self, manager_client):
        bp = BusinessProcessFactory()
        resp = manager_client.delete(f"{BP_URL}{bp.pk}/")
        assert resp.status_code == 204

    def test_auditor_cannot_update(self, auditor_client):
        bp = BusinessProcessFactory()
        resp = auditor_client.patch(f"{BP_URL}{bp.pk}/", {"name": "X"})
        assert resp.status_code == 403


# ── Business Objectives ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestBusinessObjectiveListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(OBJ_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        BusinessObjectiveFactory()
        resp = auditor_client.get(OBJ_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_manager_can_create(self, manager_client):
        data = {"name": "Improve Controls", "description": "Strengthen the control environment."}
        resp = manager_client.post(OBJ_URL, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Improve Controls"

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(OBJ_URL, {"name": "X"})
        assert resp.status_code == 403

    def test_filter_by_business_process(self, auditor_client):
        bp = BusinessProcessFactory()
        BusinessObjectiveFactory(business_process=bp)
        BusinessObjectiveFactory()  # no process
        resp = auditor_client.get(f"{OBJ_URL}?business_process={bp.pk}")
        assert resp.status_code == 200
        assert resp.data["count"] == 1


@pytest.mark.django_db
class TestBusinessObjectiveDetail:
    def test_retrieve_by_auditor(self, auditor_client):
        obj = BusinessObjectiveFactory(name="Cost Reduction")
        resp = auditor_client.get(f"{OBJ_URL}{obj.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Cost Reduction"

    def test_update_by_manager(self, manager_client):
        obj = BusinessObjectiveFactory(name="Old Name")
        resp = manager_client.patch(f"{OBJ_URL}{obj.pk}/", {"name": "New Name"})
        assert resp.status_code == 200
        assert resp.data["name"] == "New Name"

    def test_auditor_cannot_update(self, auditor_client):
        obj = BusinessObjectiveFactory()
        resp = auditor_client.patch(f"{OBJ_URL}{obj.pk}/", {"name": "X"})
        assert resp.status_code == 403

    def test_delete_by_manager(self, manager_client):
        obj = BusinessObjectiveFactory()
        resp = manager_client.delete(f"{OBJ_URL}{obj.pk}/")
        assert resp.status_code == 204


# ── Audit Logs ────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestAuditLogList:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(LOGS_URL)
        assert resp.status_code == 401

    def test_auditor_cannot_list(self, auditor_client):
        resp = auditor_client.get(LOGS_URL)
        assert resp.status_code == 403

    def test_manager_can_list(self, manager_client):
        resp = manager_client.get(LOGS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_admin_can_list(self, admin_client):
        resp = admin_client.get(LOGS_URL)
        assert resp.status_code == 200

    def test_logs_created_by_mutations(self, manager_client):
        """Creating a business process should add an audit log entry."""
        from apps.core.models import AuditLog

        before = AuditLog.objects.count()
        manager_client.post(BP_URL, {"name": "Logged Process"})
        after = AuditLog.objects.count()
        assert after > before
