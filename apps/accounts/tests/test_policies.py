"""
Unit tests for apps.accounts.policies.

Tests cover every policy function with both ALLOWED and DENIED scenarios.
No HTTP layer is involved — these tests exercise the raw policy logic to
give fast, unambiguous feedback when rules change.
"""
import pytest

from apps.accounts import policies
from apps.findings.models import Finding, ApprovalRequest
from apps.reports.models import AuditReport
from conftest import (
    AuditEngagementFactory,
    AuditReportFactory,
    ApprovalRequestFactory,
    EngagementAuditorFactory,
    FindingFactory,
    UserFactory,
)


# ── helpers ───────────────────────────────────────────────────────────────────

def make_team_member(engagement, role="auditor"):
    """Create a user and assign them to the engagement as an auditor."""
    user = UserFactory(role=role)
    EngagementAuditorFactory(engagement=engagement, auditor=user)
    return user


# ── is_engagement_team_member ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestIsEngagementTeamMember:
    def test_admin_is_always_a_member(self, admin_user):
        engagement = AuditEngagementFactory()
        assert policies.is_engagement_team_member(admin_user, engagement) is True

    def test_audit_manager_who_owns_engagement_is_member(self):
        manager = UserFactory(role="audit_manager")
        engagement = AuditEngagementFactory(audit_manager=manager)
        assert policies.is_engagement_team_member(manager, engagement) is True

    def test_assigned_auditor_is_member(self):
        engagement = AuditEngagementFactory()
        auditor = make_team_member(engagement, role="auditor")
        assert policies.is_engagement_team_member(auditor, engagement) is True

    def test_unassigned_auditor_is_not_member(self, auditor_user):
        engagement = AuditEngagementFactory()
        assert policies.is_engagement_team_member(auditor_user, engagement) is False

    def test_different_manager_is_not_member(self):
        engagement = AuditEngagementFactory()
        other_manager = UserFactory(role="audit_manager")
        assert policies.is_engagement_team_member(other_manager, engagement) is False

    def test_finding_owner_is_not_member(self, finding_owner_user):
        engagement = AuditEngagementFactory()
        assert policies.is_engagement_team_member(finding_owner_user, engagement) is False


# ── can_read_finding ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanReadFinding:
    def test_admin_can_read_any_finding(self, admin_user):
        finding = FindingFactory(status="draft")
        assert policies.can_read_finding(admin_user, finding) is True

    def test_team_member_can_read_draft(self):
        finding = FindingFactory(status="draft")
        auditor = make_team_member(finding.engagement)
        assert policies.can_read_finding(auditor, finding) is True

    def test_non_team_member_cannot_read_draft(self, auditor_user):
        finding = FindingFactory(status="draft")
        # auditor_user is not on the engagement team
        assert policies.can_read_finding(auditor_user, finding) is False

    def test_finding_owner_cannot_read_draft(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="draft", owner=owner)
        assert policies.can_read_finding(owner, finding) is False

    def test_finding_owner_can_read_open_finding(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        assert policies.can_read_finding(owner, finding) is True

    def test_finding_owner_can_read_in_remediation_finding(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="in_remediation", owner=owner)
        assert policies.can_read_finding(owner, finding) is True

    def test_identified_by_can_read_open_finding(self):
        identifier = UserFactory(role="auditor")
        finding = FindingFactory(status="open", identified_by=identifier)
        assert policies.can_read_finding(identifier, finding) is True

    def test_created_by_can_read_open_finding(self):
        creator = UserFactory(role="auditor")
        finding = FindingFactory(status="open", created_by=creator)
        assert policies.can_read_finding(creator, finding) is True

    def test_unrelated_user_cannot_read_open_finding(self):
        finding = FindingFactory(status="open")
        stranger = UserFactory(role="finding_owner")
        assert policies.can_read_finding(stranger, finding) is False

    def test_team_member_can_read_closed_finding(self):
        finding = FindingFactory(status="closed")
        auditor = make_team_member(finding.engagement)
        assert policies.can_read_finding(auditor, finding) is True

    def test_owner_can_read_closed_finding(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="closed", owner=owner)
        assert policies.can_read_finding(owner, finding) is True


# ── can_write_finding ─────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanWriteFinding:
    def test_admin_can_write_any_status(self, admin_user):
        for s in ("draft", "open", "in_remediation", "resolved", "closed", "risk_accepted"):
            finding = FindingFactory(status=s)
            assert policies.can_write_finding(admin_user, finding) is True, f"failed for {s}"

    def test_team_member_can_edit_draft(self):
        finding = FindingFactory(status="draft")
        auditor = make_team_member(finding.engagement)
        assert policies.can_write_finding(auditor, finding) is True

    def test_non_team_member_cannot_edit_draft(self, auditor_user):
        finding = FindingFactory(status="draft")
        assert policies.can_write_finding(auditor_user, finding) is False

    def test_engagement_manager_can_edit_open(self):
        manager = UserFactory(role="audit_manager")
        finding = FindingFactory(status="open")
        # Make manager the engagement's audit_manager
        finding.engagement.audit_manager = manager
        finding.engagement.save()
        assert policies.can_write_finding(manager, finding) is True

    def test_assigned_auditor_cannot_edit_open(self):
        finding = FindingFactory(status="open")
        auditor = make_team_member(finding.engagement)
        # Team member but not the manager — cannot edit non-draft
        assert policies.can_write_finding(auditor, finding) is False

    def test_nobody_can_edit_closed(self, auditor_user):
        finding = FindingFactory(status="closed")
        auditor = make_team_member(finding.engagement)
        assert policies.can_write_finding(auditor, finding) is False

    def test_nobody_can_edit_risk_accepted(self):
        finding = FindingFactory(status="risk_accepted")
        auditor = make_team_member(finding.engagement)
        assert policies.can_write_finding(auditor, finding) is False

    def test_finding_owner_cannot_write_core_fields(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        assert policies.can_write_finding(owner, finding) is False


# ── can_add_management_response ───────────────────────────────────────────────

@pytest.mark.django_db
class TestCanAddManagementResponse:
    def test_finding_owner_can_add_management_response(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        assert policies.can_add_management_response(owner, finding) is True

    def test_audit_manager_can_add_management_response(self):
        manager = UserFactory(role="audit_manager")
        finding = FindingFactory(status="open")
        assert policies.can_add_management_response(manager, finding) is True

    def test_admin_can_add_management_response(self, admin_user):
        finding = FindingFactory(status="open")
        assert policies.can_add_management_response(admin_user, finding) is True

    def test_non_owner_auditor_cannot_add_management_response(self):
        auditor = UserFactory(role="auditor")
        finding = FindingFactory(status="open")
        assert policies.can_add_management_response(auditor, finding) is False

    def test_wrong_owner_cannot_add_management_response(self):
        other_owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open")
        assert policies.can_add_management_response(other_owner, finding) is False

    def test_cannot_add_management_response_to_closed_finding(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="closed", owner=owner)
        assert policies.can_add_management_response(owner, finding) is False

    def test_cannot_add_management_response_to_risk_accepted(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="risk_accepted", owner=owner)
        assert policies.can_add_management_response(owner, finding) is False


# ── can_delete_finding ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanDeleteFinding:
    def test_admin_can_delete_any(self, admin_user):
        for s in ("draft", "open", "closed"):
            finding = FindingFactory(status=s)
            assert policies.can_delete_finding(admin_user, finding) is True, f"failed for {s}"

    def test_engagement_manager_can_delete_draft(self):
        manager = UserFactory(role="audit_manager")
        finding = FindingFactory(status="draft")
        finding.engagement.audit_manager = manager
        finding.engagement.save()
        assert policies.can_delete_finding(manager, finding) is True

    def test_engagement_manager_cannot_delete_closed(self):
        manager = UserFactory(role="audit_manager")
        finding = FindingFactory(status="closed")
        finding.engagement.audit_manager = manager
        finding.engagement.save()
        assert policies.can_delete_finding(manager, finding) is False

    def test_auditor_cannot_delete(self):
        finding = FindingFactory(status="draft")
        auditor = make_team_member(finding.engagement)
        assert policies.can_delete_finding(auditor, finding) is False

    def test_finding_owner_cannot_delete(self):
        owner = UserFactory(role="finding_owner")
        finding = FindingFactory(status="open", owner=owner)
        assert policies.can_delete_finding(owner, finding) is False


# ── can_read_report ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanReadReport:
    def test_admin_can_read_any_status(self, admin_user):
        for s in ("draft", "pending_review", "final", "archived"):
            report = AuditReportFactory(status=s)
            assert policies.can_read_report(admin_user, report) is True, f"failed for {s}"

    def test_team_member_can_read_draft(self):
        report = AuditReportFactory(status="draft")
        auditor = make_team_member(report.engagement)
        assert policies.can_read_report(auditor, report) is True

    def test_non_member_cannot_read_draft(self):
        report = AuditReportFactory(status="draft")
        stranger = UserFactory(role="auditor")
        assert policies.can_read_report(stranger, report) is False

    def test_any_authenticated_user_can_read_final(self):
        report = AuditReportFactory(status="final")
        stranger = UserFactory(role="finding_owner")
        assert policies.can_read_report(stranger, report) is True

    def test_any_authenticated_user_can_read_archived(self):
        report = AuditReportFactory(status="archived")
        stranger = UserFactory(role="risk_owner")
        assert policies.can_read_report(stranger, report) is True

    def test_non_member_cannot_read_pending_review(self):
        report = AuditReportFactory(status="pending_review")
        stranger = UserFactory(role="auditor")
        assert policies.can_read_report(stranger, report) is False


# ── can_edit_report ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanEditReport:
    def test_admin_can_edit_draft(self, admin_user):
        report = AuditReportFactory(status="draft")
        assert policies.can_edit_report(admin_user, report) is True

    def test_team_member_can_edit_draft(self):
        report = AuditReportFactory(status="draft")
        auditor = make_team_member(report.engagement)
        assert policies.can_edit_report(auditor, report) is True

    def test_team_member_can_edit_pending_review(self):
        report = AuditReportFactory(status="pending_review")
        auditor = make_team_member(report.engagement)
        assert policies.can_edit_report(auditor, report) is True

    def test_nobody_can_edit_final_report(self, admin_user):
        """Final reports are immutable — even admins cannot edit them."""
        report = AuditReportFactory(status="final")
        assert policies.can_edit_report(admin_user, report) is False

    def test_nobody_can_edit_archived_report(self, admin_user):
        report = AuditReportFactory(status="archived")
        assert policies.can_edit_report(admin_user, report) is False

    def test_non_member_cannot_edit_draft(self):
        report = AuditReportFactory(status="draft")
        stranger = UserFactory(role="auditor")
        assert policies.can_edit_report(stranger, report) is False


# ── can_finalize_report ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanFinalizeReport:
    def test_admin_can_finalize(self, admin_user):
        report = AuditReportFactory(status="pending_review")
        assert policies.can_finalize_report(admin_user, report) is True

    def test_engagement_manager_can_finalize(self):
        manager = UserFactory(role="audit_manager")
        report = AuditReportFactory(status="pending_review")
        report.engagement.audit_manager = manager
        report.engagement.save()
        assert policies.can_finalize_report(manager, report) is True

    def test_different_manager_cannot_finalize(self):
        report = AuditReportFactory(status="pending_review")
        other_manager = UserFactory(role="audit_manager")
        assert policies.can_finalize_report(other_manager, report) is False

    def test_auditor_cannot_finalize(self):
        report = AuditReportFactory(status="pending_review")
        auditor = make_team_member(report.engagement)
        assert policies.can_finalize_report(auditor, report) is False


# ── can_approve_request ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestCanApproveRequest:
    def test_designated_approver_can_approve(self):
        approver = UserFactory(role="audit_manager")
        requester = UserFactory(role="auditor")
        approval = ApprovalRequestFactory(
            requested_by=requester, approver=approver, status="pending"
        )
        assert policies.can_approve_request(approver, approval) is True

    def test_admin_can_approve_others_request(self, admin_user):
        requester = UserFactory(role="auditor")
        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(
            requested_by=requester, approver=approver, status="pending"
        )
        assert policies.can_approve_request(admin_user, approval) is True

    def test_any_audit_manager_can_approve(self):
        manager = UserFactory(role="audit_manager")
        requester = UserFactory(role="auditor")
        approver = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(
            requested_by=requester, approver=approver, status="pending"
        )
        assert policies.can_approve_request(manager, approval) is True

    def test_self_approval_is_blocked(self):
        """The requester cannot approve their own request — even as a manager."""
        manager = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(
            requested_by=manager, approver=manager, status="pending"
        )
        assert policies.can_approve_request(manager, approval) is False

    def test_admin_self_approval_is_blocked(self, admin_user):
        approval = ApprovalRequestFactory(
            requested_by=admin_user, approver=admin_user, status="pending"
        )
        assert policies.can_approve_request(admin_user, approval) is False

    def test_random_auditor_cannot_approve(self):
        requester = UserFactory(role="auditor")
        approver = UserFactory(role="audit_manager")
        other_auditor = UserFactory(role="auditor")
        approval = ApprovalRequestFactory(
            requested_by=requester, approver=approver, status="pending"
        )
        assert policies.can_approve_request(other_auditor, approval) is False

    def test_finding_owner_designated_as_approver_can_approve(self):
        """Any role may be designated as approver if explicitly set."""
        requester = UserFactory(role="auditor")
        owner_approver = UserFactory(role="finding_owner")
        approval = ApprovalRequestFactory(
            requested_by=requester, approver=owner_approver, status="pending"
        )
        assert policies.can_approve_request(owner_approver, approval) is True
