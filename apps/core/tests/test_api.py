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

    def test_log_entry_has_entity_id(self, manager_client):
        """
        Log entries produced for signal-covered entities must have a non-empty
        entity_id (populated by the signal handler, not the middleware).
        """
        from apps.core.models import AuditLog

        # Risk is signal-covered; entity_id should be the risk's UUID.
        AuditLog.objects.all().delete()
        resp = manager_client.post(
            "/api/v1/risks/",
            {
                "name": "ID Test Risk",
                "description": "verify entity_id",
                "category": "operational",
                "inherent_likelihood": 1,
                "inherent_impact": 1,
            },
        )
        assert resp.status_code == 201
        log = AuditLog.objects.filter(entity_type="risk", action="create").latest("timestamp")
        assert log.entity_id != "", "entity_id must be the risk UUID"
        assert log.entity_id == str(resp.data["id"])

    def test_log_entry_has_entity_name(self, manager_client):
        """Log entries must carry a human-readable entity_name."""
        from apps.core.models import AuditLog

        AuditLog.objects.all().delete()
        resp = manager_client.post(
            "/api/v1/risks/",
            {
                "name": "Named Risk Entry",
                "description": "verify entity_name",
                "category": "operational",
                "inherent_likelihood": 1,
                "inherent_impact": 1,
            },
        )
        assert resp.status_code == 201
        log = AuditLog.objects.filter(entity_type="risk", action="create").latest("timestamp")
        assert "Named Risk Entry" in log.entity_name

    def test_approval_decision_logs_approve_event(self, manager_client):
        """
        POST /api/v1/approvals/<pk>/decision/ {decision: approved} must produce
        an AuditLog entry with action='approve'.
        """
        from apps.core.models import AuditLog
        from conftest import ApprovalRequestFactory, UserFactory

        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=approver, status="pending")

        # Use the approver's client
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=approver)

        AuditLog.objects.all().delete()
        resp = client.post(
            f"/api/v1/approvals/{approval.pk}/decision/",
            {"decision": "approved", "review_notes": "LGTM"},
        )
        assert resp.status_code == 200, resp.data

        log = AuditLog.objects.filter(action="approve").latest("timestamp")
        assert log.entity_type == "approvalrequest"
        assert log.entity_id == str(approval.pk)
        assert log.new_values["decision"] == "approved"

    def test_approval_decision_logs_reject_event(self, manager_client):
        """POST with decision=rejected must produce action='reject' log."""
        from apps.core.models import AuditLog
        from conftest import ApprovalRequestFactory, UserFactory

        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=approver, status="pending")

        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=approver)

        AuditLog.objects.all().delete()
        resp = client.post(
            f"/api/v1/approvals/{approval.pk}/decision/",
            {"decision": "rejected", "review_notes": "Needs more work"},
        )
        assert resp.status_code == 200, resp.data

        log = AuditLog.objects.filter(action="reject").latest("timestamp")
        assert log.entity_type == "approvalrequest"
        assert log.new_values["decision"] == "rejected"
