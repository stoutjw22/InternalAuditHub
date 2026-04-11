"""
Finding permission matrix tests (HTTP layer).

These integration tests exercise the FindingObjectPermission class via real
API requests.  Each test is labelled ALLOWED or DENIED to make the matrix
immediately readable.

Permission matrix covered
--------------------------
ROLE                  | READ draft | READ open | WRITE draft | WRITE open | MgmtResp | DELETE
----------------------|------------|-----------|-------------|------------|----------|-------
admin                 | ALLOWED    | ALLOWED   | ALLOWED     | ALLOWED    | ALLOWED  | ALLOWED
audit_manager (mgr)   | ALLOWED*   | ALLOWED*  | ALLOWED*    | ALLOWED*   | ALLOWED  | ALLOWED*
auditor (team)        | ALLOWED    | ALLOWED   | ALLOWED     | DENIED     | DENIED   | DENIED
auditor (non-team)    | DENIED     | ALLOWED** | DENIED      | DENIED     | DENIED   | DENIED
finding_owner         | DENIED     | ALLOWED   | DENIED      | DENIED     | ALLOWED  | DENIED
risk_owner            | DENIED     | DENIED    | DENIED      | DENIED     | DENIED   | DENIED

*  manager must be the engagement's audit_manager for write access
** auditors see non-draft findings from all engagements (existing behaviour)
"""
import pytest
from rest_framework.test import APIClient

from conftest import (
    AuditEngagementFactory,
    EngagementAuditorFactory,
    FindingFactory,
    UserFactory,
)

FINDINGS_URL = "/api/v1/findings/"


# ── helpers ───────────────────────────────────────────────────────────────────

def make_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def make_team_auditor(engagement):
    user = UserFactory(role="auditor")
    EngagementAuditorFactory(engagement=engagement, auditor=user)
    return user


def make_engagement_manager(engagement):
    manager = UserFactory(role="audit_manager")
    engagement.audit_manager = manager
    engagement.save()
    return manager


# ── READ draft findings ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReadDraftFinding:
    """DRAFT findings are visible only to engagement team members."""

    def test_admin_can_read_draft(self, admin_user):
        finding = FindingFactory(status="draft")
        resp = make_client(admin_user).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_engagement_manager_can_read_draft(self):
        finding = FindingFactory(status="draft")
        manager = make_engagement_manager(finding.engagement)
        resp = make_client(manager).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_team_auditor_can_read_draft(self):
        finding = FindingFactory(status="draft")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_non_team_auditor_cannot_read_draft(self):
        finding = FindingFactory(status="draft")
        other_auditor = UserFactory(role="auditor")  # not assigned
        resp = make_client(other_auditor).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_finding_owner_cannot_read_draft(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="draft", owner=owner)
        resp = make_client(owner).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_risk_owner_cannot_read_draft(self, risk_owner_user):
        finding = FindingFactory(status="draft")
        resp = make_client(risk_owner_user).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED


# ── READ open / in_remediation findings ──────────────────────────────────────

@pytest.mark.django_db
class TestReadOpenFinding:
    """Non-draft findings extend read access to stakeholders."""

    def test_team_auditor_can_read_open(self):
        finding = FindingFactory(status="open")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_finding_owner_can_read_open(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        resp = make_client(owner).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_finding_owner_can_read_in_remediation(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="in_remediation", owner=owner)
        resp = make_client(owner).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_unrelated_finding_owner_cannot_read_open(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open")  # owner is None
        resp = make_client(owner).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_risk_owner_cannot_read_open_without_link(self, risk_owner_user):
        finding = FindingFactory(status="open")
        resp = make_client(risk_owner_user).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_unauthenticated_cannot_read(self, api_client):
        finding = FindingFactory(status="open")
        resp = api_client.get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 401  # DENIED


# ── READ closed findings ──────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReadClosedFinding:
    def test_team_member_can_read_closed(self):
        finding = FindingFactory(status="closed")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_finding_owner_can_read_closed(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="closed", owner=owner)
        resp = make_client(owner).get(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 200  # ALLOWED


# ── WRITE (PATCH) findings ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestWriteFinding:
    def test_admin_can_patch_draft(self, admin_user):
        finding = FindingFactory(status="draft", title="Old Title")
        resp = make_client(admin_user).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"title": "New Title"}
        )
        assert resp.status_code == 200  # ALLOWED
        assert resp.data["title"] == "New Title"

    def test_team_auditor_can_patch_draft(self):
        finding = FindingFactory(status="draft")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"severity": "high"}
        )
        assert resp.status_code == 200  # ALLOWED

    def test_non_team_auditor_cannot_patch_draft(self):
        finding = FindingFactory(status="draft")
        other_auditor = UserFactory(role="auditor")
        resp = make_client(other_auditor).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"severity": "high"}
        )
        assert resp.status_code == 403  # DENIED

    def test_engagement_manager_can_patch_open(self):
        finding = FindingFactory(status="open")
        manager = make_engagement_manager(finding.engagement)
        resp = make_client(manager).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"status": "in_remediation"}
        )
        assert resp.status_code == 200  # ALLOWED

    def test_team_auditor_cannot_patch_open(self):
        finding = FindingFactory(status="open")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"status": "in_remediation"}
        )
        assert resp.status_code == 403  # DENIED

    def test_finding_owner_cannot_patch_core_fields(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        resp = make_client(owner).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"severity": "low"}
        )
        assert resp.status_code == 403  # DENIED

    def test_nobody_can_patch_closed_finding(self):
        finding = FindingFactory(status="closed")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"status": "open"}
        )
        assert resp.status_code == 403  # DENIED

    def test_nobody_can_patch_risk_accepted(self):
        finding = FindingFactory(status="risk_accepted")
        manager = make_engagement_manager(finding.engagement)
        resp = make_client(manager).patch(
            f"{FINDINGS_URL}{finding.pk}/", {"status": "open"}
        )
        assert resp.status_code == 403  # DENIED


# ── Management response ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestManagementResponse:
    """PATCH with only management_response uses the lighter access rule."""

    def test_finding_owner_can_add_management_response(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        resp = make_client(owner).patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"management_response": "We will remediate by Q3."},
        )
        assert resp.status_code == 200  # ALLOWED
        assert resp.data["management_response"] == "We will remediate by Q3."

    def test_finding_owner_can_update_management_response(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(
            status="in_remediation",
            owner=owner,
            management_response="Initial response.",
        )
        resp = make_client(owner).patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"management_response": "Updated response."},
        )
        assert resp.status_code == 200  # ALLOWED

    def test_audit_manager_can_add_management_response(self):
        manager = UserFactory(role="audit_manager")
        finding = FindingFactory(status="open")
        resp = make_client(manager).patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"management_response": "Management acknowledges."},
        )
        assert resp.status_code == 200  # ALLOWED

    def test_non_owner_auditor_cannot_add_management_response(self):
        auditor = UserFactory(role="auditor")
        finding = FindingFactory(status="open")
        resp = make_client(auditor).patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"management_response": "Trying to write."},
        )
        assert resp.status_code == 403  # DENIED

    def test_wrong_owner_cannot_add_management_response(self):
        other_owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open")
        resp = make_client(other_owner).patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"management_response": "Not my finding."},
        )
        assert resp.status_code == 403  # DENIED

    def test_cannot_add_management_response_to_closed_finding(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="closed", owner=owner)
        resp = make_client(owner).patch(
            f"{FINDINGS_URL}{finding.pk}/",
            {"management_response": "Too late."},
        )
        assert resp.status_code == 403  # DENIED


# ── DELETE findings ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeleteFinding:
    def test_admin_can_delete_any_finding(self, admin_user):
        finding = FindingFactory(status="open")
        resp = make_client(admin_user).delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 204  # ALLOWED

    def test_engagement_manager_can_delete_draft(self):
        finding = FindingFactory(status="draft")
        manager = make_engagement_manager(finding.engagement)
        resp = make_client(manager).delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 204  # ALLOWED

    def test_engagement_manager_cannot_delete_closed(self):
        finding = FindingFactory(status="closed")
        manager = make_engagement_manager(finding.engagement)
        resp = make_client(manager).delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_team_auditor_cannot_delete(self):
        finding = FindingFactory(status="draft")
        auditor = make_team_auditor(finding.engagement)
        resp = make_client(auditor).delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_finding_owner_cannot_delete(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        resp = make_client(owner).delete(f"{FINDINGS_URL}{finding.pk}/")
        assert resp.status_code == 403  # DENIED


# ── CREATE finding (engagement team membership) ───────────────────────────────

@pytest.mark.django_db
class TestCreateFindingTeamMembership:
    """Findings may only be created by engagement team members."""

    def test_engagement_manager_can_create_finding(self):
        manager = UserFactory(role="audit_manager")
        engagement = AuditEngagementFactory(audit_manager=manager)
        data = {
            "engagement": str(engagement.pk),
            "title": "Manager Finding",
            "description": "Created by the engagement manager.",
            "severity": "high",
        }
        resp = make_client(manager).post(FINDINGS_URL, data)
        assert resp.status_code == 201  # ALLOWED

    def test_team_auditor_can_create_finding(self):
        engagement = AuditEngagementFactory()
        auditor = make_team_auditor(engagement)
        data = {
            "engagement": str(engagement.pk),
            "title": "Team Finding",
            "description": "Created by a team auditor.",
            "severity": "medium",
        }
        resp = make_client(auditor).post(FINDINGS_URL, data)
        assert resp.status_code == 201  # ALLOWED

    def test_non_team_auditor_cannot_create_finding(self):
        engagement = AuditEngagementFactory()
        other_auditor = UserFactory(role="auditor")
        data = {
            "engagement": str(engagement.pk),
            "title": "Non-team Finding",
            "description": "Not on the team.",
            "severity": "low",
        }
        resp = make_client(other_auditor).post(FINDINGS_URL, data)
        assert resp.status_code == 403  # DENIED

    def test_admin_can_create_finding_for_any_engagement(self, admin_user):
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "Admin Finding",
            "description": "Admin can create for any engagement.",
            "severity": "critical",
        }
        resp = make_client(admin_user).post(FINDINGS_URL, data)
        assert resp.status_code == 201  # ALLOWED


# ── Approval decision self-approval block ────────────────────────────────────

@pytest.mark.django_db
class TestApprovalSelfApprovalBlock:
    def test_requester_cannot_approve_own_request(self):
        manager = UserFactory(role="audit_manager")
        approval_req = __import__(
            "conftest", fromlist=["ApprovalRequestFactory"]
        ).ApprovalRequestFactory(requested_by=manager, approver=manager, status="pending")
        resp = make_client(manager).post(
            f"/api/v1/approvals/{approval_req.pk}/decision/",
            {"decision": "approved"},
        )
        assert resp.status_code == 403  # DENIED — self-approval blocked

    def test_different_manager_can_approve(self):
        requester = UserFactory(role="auditor")
        approver = UserFactory(role="audit_manager")
        approval_req = __import__(
            "conftest", fromlist=["ApprovalRequestFactory"]
        ).ApprovalRequestFactory(
            requested_by=requester, approver=approver, status="pending"
        )
        other_manager = UserFactory(role="audit_manager")
        resp = make_client(other_manager).post(
            f"/api/v1/approvals/{approval_req.pk}/decision/",
            {"decision": "approved"},
        )
        assert resp.status_code == 200  # ALLOWED

    def test_finding_owner_cannot_approve_without_designation(self):
        requester = UserFactory(role="auditor")
        approver = UserFactory(role="audit_manager")
        stranger = UserFactory(role="finding_owner")
        approval_req = __import__(
            "conftest", fromlist=["ApprovalRequestFactory"]
        ).ApprovalRequestFactory(
            requested_by=requester, approver=approver, status="pending"
        )
        resp = make_client(stranger).post(
            f"/api/v1/approvals/{approval_req.pk}/decision/",
            {"decision": "approved"},
        )
        assert resp.status_code == 403  # DENIED
