"""
API tests for the findings app.

Endpoints covered:
  GET/POST  /api/v1/findings/
  GET/PATCH/DELETE  /api/v1/findings/<pk>/
  GET/POST  /api/v1/engagements/<pk>/findings/
  GET/POST  /api/v1/remediations/
  GET/PATCH/DELETE  /api/v1/remediations/<pk>/
  GET/POST  /api/v1/findings/<pk>/remediations/
  GET/POST  /api/v1/approvals/
  POST      /api/v1/approvals/<pk>/decision/

Permission notes:
  - Findings: AuditorOrAbove for read/create; AuditManagerOrAbove for DELETE
  - Finding owners (role=finding_owner): see only their own findings
  - Approvals: any authenticated user can create; manager sees all
"""
import uuid

import pytest

from conftest import (
    AuditEngagementFactory,
    ApprovalRequestFactory,
    FindingFactory,
    RemediationActionFactory,
    UserFactory,
)

FINDINGS_URL = "/api/v1/findings/"
REMEDIATIONS_URL = "/api/v1/remediations/"
APPROVALS_URL = "/api/v1/approvals/"


# ── /api/v1/findings/ ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFindingListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(FINDINGS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(FINDINGS_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        FindingFactory()
        resp = auditor_client.get(FINDINGS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_manager_can_list(self, manager_client):
        FindingFactory()
        resp = manager_client.get(FINDINGS_URL)
        assert resp.status_code == 200

    def test_auditor_can_create(self, auditor_client, auditor_user):
        # EPIC 2: assign the auditor to the engagement team before creating.
        from conftest import EngagementAuditorFactory
        engagement = AuditEngagementFactory()
        EngagementAuditorFactory(engagement=engagement, auditor=auditor_user)
        data = {
            "engagement": str(engagement.pk),
            "title": "Segregation of Duties Gap",
            "description": "The same user can initiate and approve transactions.",
            "severity": "high",
        }
        resp = auditor_client.post(FINDINGS_URL, data)
        assert resp.status_code == 201
        assert resp.data["title"] == "Segregation of Duties Gap"

    def test_read_only_cannot_create(self, read_only_client):
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "Finding",
            "description": "desc",
            "severity": "low",
        }
        resp = read_only_client.post(FINDINGS_URL, data)
        assert resp.status_code == 403

    def test_create_without_title_returns_400(self, auditor_client):
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "description": "No title supplied.",
            "severity": "medium",
        }
        resp = auditor_client.post(FINDINGS_URL, data)
        assert resp.status_code == 400

    def test_filter_by_severity(self, auditor_client):
        FindingFactory(severity="critical")
        FindingFactory(severity="low")
        resp = auditor_client.get(f"{FINDINGS_URL}?severity=critical")
        assert resp.status_code == 200
        for f in resp.data["results"]:
            assert f["severity"] == "critical"

    def test_filter_by_status(self, auditor_client):
        FindingFactory(status="open")
        FindingFactory(status="closed")
        resp = auditor_client.get(f"{FINDINGS_URL}?status=open")
        assert resp.status_code == 200
        for f in resp.data["results"]:
            assert f["status"] == "open"

    def test_finding_owner_can_list_own_non_draft_findings(self, db):
        """
        EPIC 2: finding_owner role may now list the endpoint.
        The queryset is scoped to their own non-draft findings.
        """
        owner = UserFactory(role="finding_owner")
        # Non-draft finding owned by this user — should appear in list.
        FindingFactory(owner=owner, status="open")
        # Draft finding owned by this user — should NOT appear (team-member only).
        FindingFactory(owner=owner, status="draft")
        # Open finding owned by someone else — should NOT appear.
        FindingFactory(status="open")

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=owner)
        resp = client.get(FINDINGS_URL)
        assert resp.status_code == 200
        # Only the one non-draft finding they own should appear.
        assert resp.data["count"] == 1


@pytest.mark.django_db
class TestFindingDetail:
    def test_retrieve(self, auditor_client, auditor_user):
        # EPIC 2: auditor must be on the team to read a draft finding.
        from conftest import EngagementAuditorFactory
        finding = FindingFactory(title="Known Finding", status="draft")
        EngagementAuditorFactory(engagement=finding.engagement, auditor=auditor_user)
        resp = auditor_client.get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200
        assert resp.data["title"] == "Known Finding"

    def test_retrieve_includes_nested_data(self, auditor_client, auditor_user):
        # EPIC 2: auditor must be on the team to read a draft finding.
        from conftest import EngagementAuditorFactory
        finding = FindingFactory(status="draft")
        EngagementAuditorFactory(engagement=finding.engagement, auditor=auditor_user)
        RemediationActionFactory(finding=finding)
        resp = auditor_client.get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200
        assert len(resp.data["remediation_actions"]) == 1

    def test_partial_update_by_auditor(self, auditor_client, auditor_user):
        # EPIC 2: auditor must be on the engagement team to edit a draft finding.
        from conftest import EngagementAuditorFactory
        finding = FindingFactory(status="draft")
        EngagementAuditorFactory(engagement=finding.engagement, auditor=auditor_user)
        resp = auditor_client.patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"severity": "high"},
        )
        assert resp.status_code == 200
        assert resp.data["severity"] == "high"

    def test_delete_requires_manager(self, auditor_client, auditor_user, manager_user):
        # EPIC 2: the deleting manager must be THIS engagement's audit_manager.
        from conftest import EngagementAuditorFactory
        from rest_framework.test import APIClient
        finding = FindingFactory(status="open")
        finding.engagement.audit_manager = manager_user
        finding.engagement.save()
        EngagementAuditorFactory(engagement=finding.engagement, auditor=auditor_user)

        manager_client = APIClient()
        manager_client.force_authenticate(user=manager_user)

        # Auditor cannot delete
        resp = auditor_client.delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403
        # Engagement manager can delete
        resp = manager_client.delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 204

    def test_unauthenticated_retrieve_returns_401(self, api_client):
        finding = FindingFactory()
        resp = api_client.get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 401


# ── /api/v1/engagements/<pk>/findings/ ────────────────────────────────────────

@pytest.mark.django_db
class TestFindingNested:
    def test_list_scoped_to_engagement(self, auditor_client, auditor_user):
        # EPIC 2: assign auditor to the engagement so they can see its findings.
        from conftest import EngagementAuditorFactory
        f1 = FindingFactory(status="open")  # use open so the auditor can read it
        EngagementAuditorFactory(engagement=f1.engagement, auditor=auditor_user)
        FindingFactory(status="open")  # different engagement — not visible to this auditor
        url = f"/api/v1/engagements/{f1.engagement.pk}/findings/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        # List endpoint uses FindingListSerializer which doesn't include `engagement`.
        # Verify we get only 1 result (the scoped finding).
        assert resp.data["count"] == 1

    def test_create_sets_engagement_from_url(self, auditor_client, auditor_user):
        # EPIC 2: auditor must be on the team to create findings via nested route.
        from conftest import EngagementAuditorFactory
        engagement = AuditEngagementFactory()
        EngagementAuditorFactory(engagement=engagement, auditor=auditor_user)
        url = f"/api/v1/engagements/{engagement.pk}/findings/"
        data = {
            "engagement": str(engagement.pk),  # serializer requires it in body
            "title": "Nested Finding",
            "description": "Created via nested route.",
            "severity": "medium",
        }
        resp = auditor_client.post(url, data)
        assert resp.status_code == 201
        assert str(resp.data["engagement"]) == str(engagement.pk)


# ── /api/v1/remediations/ ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRemediationActionFlat:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(REMEDIATIONS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        RemediationActionFactory()
        resp = auditor_client.get(REMEDIATIONS_URL)
        assert resp.status_code == 200

    def test_auditor_can_create(self, auditor_client):
        finding = FindingFactory()
        data = {
            "finding": str(finding.pk),
            "description": "Enable audit logging on all systems.",
            "status": "open",
        }
        resp = auditor_client.post(REMEDIATIONS_URL, data)
        assert resp.status_code == 201
        assert resp.data["description"] == "Enable audit logging on all systems."

    def test_partial_update(self, auditor_client):
        action = RemediationActionFactory(status="open")
        resp = auditor_client.patch(
            f"{REMEDIATIONS_URL}{action.pk}/",
            {"status": "completed"},
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "completed"

    def test_delete(self, auditor_client):
        action = RemediationActionFactory()
        resp = auditor_client.delete(f"{REMEDIATIONS_URL}{action.pk}/")
        assert resp.status_code == 204


# ── /api/v1/findings/<pk>/remediations/ ───────────────────────────────────────

@pytest.mark.django_db
class TestRemediationActionNested:
    def test_list_scoped_to_finding(self, auditor_client):
        action = RemediationActionFactory()
        RemediationActionFactory()  # different finding
        url = f"{FINDINGS_URL}{action.finding.pk}/remediations/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["finding"]) == str(action.finding.pk)

    def test_create_nested(self, auditor_client):
        finding = FindingFactory()
        url = f"{FINDINGS_URL}{finding.pk}/remediations/"
        data = {"finding": str(finding.pk), "description": "Review and tighten firewall rules."}
        resp = auditor_client.post(url, data)
        assert resp.status_code == 201
        assert str(resp.data["finding"]) == str(finding.pk)


# ── /api/v1/approvals/ ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestApprovalRequestListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(APPROVALS_URL)
        assert resp.status_code == 401

    def test_authenticated_can_list(self, auditor_client):
        resp = auditor_client.get(APPROVALS_URL)
        assert resp.status_code == 200

    def test_create_approval_request(self, auditor_client, auditor_user):
        approver = UserFactory(role="audit_manager")
        data = {
            "entity_type": "finding",
            "entity_id": str(uuid.uuid4()),
            "entity_name": "SQL Injection Finding",
            "approver": str(approver.pk),
        }
        resp = auditor_client.post(APPROVALS_URL, data)
        assert resp.status_code == 201
        assert resp.data["status"] == "pending"
        assert str(resp.data["requested_by"]) == str(auditor_user.pk)

    def test_non_manager_sees_only_own_approvals(self, db):
        auditor_a = UserFactory(role="auditor")
        auditor_b = UserFactory(role="auditor")
        manager = UserFactory(role="audit_manager")
        # Create approval for auditor_a
        ApprovalRequestFactory(requested_by=auditor_a, approver=manager)
        # Create approval for auditor_b
        ApprovalRequestFactory(requested_by=auditor_b, approver=manager)

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=auditor_a)
        resp = client.get(APPROVALS_URL)
        assert resp.status_code == 200
        # Should only see their own
        assert resp.data["count"] == 1

    def test_manager_sees_all_approvals(self, manager_client):
        manager = UserFactory(role="audit_manager")
        ApprovalRequestFactory(approver=manager)
        ApprovalRequestFactory(approver=manager)
        resp = manager_client.get(APPROVALS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 2


# ── /api/v1/approvals/<pk>/decision/ ──────────────────────────────────────────

@pytest.mark.django_db
class TestApprovalDecision:
    def test_approver_can_approve(self, db):
        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=approver, status="pending")

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=approver)
        resp = client.post(
            f"{APPROVALS_URL}{approval.pk}/decision/",
            {"decision": "approved", "review_notes": "Looks good."},
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "approved"

    def test_approver_can_reject(self, db):
        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=approver, status="pending")

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=approver)
        resp = client.post(
            f"{APPROVALS_URL}{approval.pk}/decision/",
            {"decision": "rejected", "review_notes": "Missing evidence."},
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "rejected"

    def test_non_approver_cannot_decide(self, auditor_client):
        approval = ApprovalRequestFactory(status="pending")
        resp = auditor_client.post(
            f"{APPROVALS_URL}{approval.pk}/decision/",
            {"decision": "approved"},
        )
        assert resp.status_code == 403

    def test_invalid_decision_value_returns_400(self, db):
        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=approver, status="pending")

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=approver)
        resp = client.post(
            f"{APPROVALS_URL}{approval.pk}/decision/",
            {"decision": "maybe"},
        )
        assert resp.status_code == 400

    def test_already_decided_approval_returns_400(self, db):
        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=approver, status="approved")

        from rest_framework.test import APIClient

        client = APIClient()
        client.force_authenticate(user=approver)
        resp = client.post(
            f"{APPROVALS_URL}{approval.pk}/decision/",
            {"decision": "rejected"},
        )
        assert resp.status_code == 400
