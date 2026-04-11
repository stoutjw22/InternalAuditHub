"""
API tests for the engagements app.

Endpoints covered:
  GET/POST  /api/v1/engagements/
  GET/PATCH/DELETE  /api/v1/engagements/<pk>/
  GET/POST  /api/v1/engagement-auditors/
  GET/DELETE  /api/v1/engagement-auditors/<pk>/
  GET/POST  /api/v1/engagements/<pk>/auditors/
  DELETE  /api/v1/engagements/<pk>/auditors/<pk>/
  GET/POST  /api/v1/engagements/<pk>/tasks/
  GET/PATCH/DELETE  /api/v1/engagements/<pk>/tasks/<pk>/

Permission notes:
  List engagements: AuditorOrAbove (non-managers see only assigned engagements)
  Create/Update/Delete: AuditManagerOrAbove for engagement management
"""
import pytest

from conftest import (
    AuditEngagementFactory,
    AuditTaskFactory,
    EngagementAuditorFactory,
    UserFactory,
)

ENGAGEMENTS_URL = "/api/v1/engagements/"
ENG_AUDITORS_URL = "/api/v1/engagement-auditors/"


# ── /api/v1/engagements/ ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEngagementListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(ENGAGEMENTS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(ENGAGEMENTS_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        AuditEngagementFactory()
        resp = auditor_client.get(ENGAGEMENTS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_manager_can_list_all(self, manager_client):
        AuditEngagementFactory()
        resp = manager_client.get(ENGAGEMENTS_URL)
        assert resp.status_code == 200

    def test_auditor_sees_only_assigned_engagements(self, db):
        """Auditors who are not assigned to an engagement should not see it."""
        auditor = UserFactory(role="auditor")
        manager = UserFactory(role="audit_manager")
        assigned_eng = AuditEngagementFactory(audit_manager=manager)
        unassigned_eng = AuditEngagementFactory(audit_manager=manager)
        # Assign auditor to one engagement only
        EngagementAuditorFactory(engagement=assigned_eng, auditor=auditor)

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=auditor)
        resp = client.get(ENGAGEMENTS_URL)
        assert resp.status_code == 200
        pks = [e["id"] for e in resp.data["results"]]
        assert str(assigned_eng.pk) in pks
        assert str(unassigned_eng.pk) not in pks

    def test_manager_can_create(self, manager_client, manager_user):
        data = {
            "name": "Q1 Controls Audit",
            "audit_manager": str(manager_user.pk),
            "status": "planning",
        }
        resp = manager_client.post(ENGAGEMENTS_URL, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Q1 Controls Audit"

    def test_auditor_cannot_create(self, auditor_client, manager_user):
        data = {
            "name": "Unauthorised Engagement",
            "audit_manager": str(manager_user.pk),
        }
        resp = auditor_client.post(ENGAGEMENTS_URL, data)
        assert resp.status_code == 403

    def test_filter_by_status(self, manager_client):
        AuditEngagementFactory(status="planning")
        AuditEngagementFactory(status="completed")
        resp = manager_client.get(f"{ENGAGEMENTS_URL}?status=planning")
        assert resp.status_code == 200
        for e in resp.data["results"]:
            assert e["status"] == "planning"


@pytest.mark.django_db
class TestEngagementDetail:
    def test_retrieve_by_manager(self, manager_client):
        eng = AuditEngagementFactory(name="Payroll Audit")
        resp = manager_client.get(f"{ENGAGEMENTS_URL}{eng.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Payroll Audit"

    def test_update_by_manager(self, manager_client):
        eng = AuditEngagementFactory(status="planning")
        resp = manager_client.patch(
            f"{ENGAGEMENTS_URL}{eng.pk}/",
            {"status": "in_progress"},
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "in_progress"

    def test_delete_by_manager(self, manager_client):
        eng = AuditEngagementFactory()
        resp = manager_client.delete(f"{ENGAGEMENTS_URL}{eng.pk}/")
        assert resp.status_code == 204

    def test_auditor_cannot_delete(self, auditor_client):
        eng = AuditEngagementFactory()
        resp = auditor_client.delete(f"{ENGAGEMENTS_URL}{eng.pk}/")
        assert resp.status_code == 403


# ── /api/v1/engagement-auditors/ (flat) ───────────────────────────────────────

@pytest.mark.django_db
class TestEngagementAuditorFlat:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(ENG_AUDITORS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        EngagementAuditorFactory()
        resp = auditor_client.get(ENG_AUDITORS_URL)
        assert resp.status_code == 200

    def test_manager_can_create(self, manager_client):
        engagement = AuditEngagementFactory()
        auditor = UserFactory(role="auditor")
        data = {
            "engagement": str(engagement.pk),
            "auditor": str(auditor.pk),
            "role_key": "RoleKey1",
        }
        resp = manager_client.post(ENG_AUDITORS_URL, data)
        assert resp.status_code == 201

    def test_duplicate_assignment_returns_400(self, manager_client):
        ea = EngagementAuditorFactory()
        data = {
            "engagement": str(ea.engagement.pk),
            "auditor": str(ea.auditor.pk),
        }
        resp = manager_client.post(ENG_AUDITORS_URL, data)
        assert resp.status_code == 400

    def test_manager_can_delete(self, manager_client):
        ea = EngagementAuditorFactory()
        resp = manager_client.delete(f"{ENG_AUDITORS_URL}{ea.pk}/")
        assert resp.status_code == 204


# ── /api/v1/engagements/<pk>/auditors/ (nested) ───────────────────────────────

@pytest.mark.django_db
class TestEngagementAuditorNested:
    def test_list_scoped_to_engagement(self, manager_client):
        ea = EngagementAuditorFactory()
        EngagementAuditorFactory()
        url = f"{ENGAGEMENTS_URL}{ea.engagement.pk}/auditors/"
        resp = manager_client.get(url)
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["engagement"]) == str(ea.engagement.pk)

    def test_create_auditor_assignment(self, manager_client):
        engagement = AuditEngagementFactory()
        auditor = UserFactory(role="auditor")
        url = f"{ENGAGEMENTS_URL}{engagement.pk}/auditors/"
        resp = manager_client.post(url, {"engagement": str(engagement.pk), "auditor": str(auditor.pk)})
        assert resp.status_code == 201

    def test_delete_assignment(self, manager_client):
        ea = EngagementAuditorFactory()
        url = f"{ENGAGEMENTS_URL}{ea.engagement.pk}/auditors/{ea.pk}/"
        resp = manager_client.delete(url)
        assert resp.status_code == 204

    def test_auditor_cannot_assign_others(self, auditor_client):
        engagement = AuditEngagementFactory()
        new_auditor = UserFactory(role="auditor")
        url = f"{ENGAGEMENTS_URL}{engagement.pk}/auditors/"
        resp = auditor_client.post(url, {"auditor": str(new_auditor.pk)})
        assert resp.status_code == 403


# ── /api/v1/engagements/<pk>/tasks/ ───────────────────────────────────────────

@pytest.mark.django_db
class TestAuditTaskNested:
    def test_list_tasks_for_engagement(self, auditor_client):
        task = AuditTaskFactory()
        AuditTaskFactory()  # different engagement
        url = f"{ENGAGEMENTS_URL}{task.engagement.pk}/tasks/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["engagement"]) == str(task.engagement.pk)

    def test_create_task(self, auditor_client):
        engagement = AuditEngagementFactory()
        url = f"{ENGAGEMENTS_URL}{engagement.pk}/tasks/"
        data = {"engagement": str(engagement.pk), "name": "Interview Management", "status": "todo", "priority": "high"}
        resp = auditor_client.post(url, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Interview Management"
        assert str(resp.data["engagement"]) == str(engagement.pk)

    def test_retrieve_task(self, auditor_client):
        task = AuditTaskFactory(name="Examine Records")
        url = f"{ENGAGEMENTS_URL}{task.engagement.pk}/tasks/{task.pk}/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        assert resp.data["name"] == "Examine Records"

    def test_update_task_status(self, auditor_client):
        task = AuditTaskFactory(status="todo")
        url = f"{ENGAGEMENTS_URL}{task.engagement.pk}/tasks/{task.pk}/"
        resp = auditor_client.patch(url, {"status": "done"})
        assert resp.status_code == 200
        assert resp.data["status"] == "done"

    def test_delete_task(self, auditor_client):
        task = AuditTaskFactory()
        url = f"{ENGAGEMENTS_URL}{task.engagement.pk}/tasks/{task.pk}/"
        resp = auditor_client.delete(url)
        assert resp.status_code == 204

    def test_read_only_cannot_access_tasks(self, read_only_client):
        task = AuditTaskFactory()
        url = f"{ENGAGEMENTS_URL}{task.engagement.pk}/tasks/"
        resp = read_only_client.get(url)
        assert resp.status_code == 403
