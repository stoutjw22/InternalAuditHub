"""
Report permission matrix tests (HTTP layer).

These integration tests exercise ReportObjectPermission and FinalizeReportView
access controls via real API requests.

Permission matrix covered
--------------------------
ROLE                     | READ draft | READ final | EDIT draft | EDIT final | FINALIZE | DELETE draft
-------------------------|------------|------------|------------|------------|----------|-------------
admin                    | ALLOWED    | ALLOWED    | ALLOWED    | DENIED*    | ALLOWED  | ALLOWED*
engagement manager       | ALLOWED    | ALLOWED    | ALLOWED    | DENIED*    | ALLOWED  | ALLOWED*
team auditor             | ALLOWED    | ALLOWED    | ALLOWED    | DENIED*    | DENIED   | DENIED
non-team auditor         | DENIED     | ALLOWED    | DENIED     | DENIED*    | DENIED   | DENIED
finding_owner            | DENIED     | ALLOWED    | DENIED     | DENIED*    | DENIED   | DENIED
unauthenticated          | 401        | 401        | 401        | 401        | 401      | 401

* Final/Archived reports are immutable for everyone — including admins.
  Engagement managers can delete only if the report is not yet final.
"""
import pytest
from rest_framework.test import APIClient

from conftest import (
    AuditEngagementFactory,
    AuditReportFactory,
    EngagementAuditorFactory,
    UserFactory,
)

REPORTS_URL = "/api/v1/reports/"


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


# ── READ draft reports ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReadDraftReport:
    """DRAFT reports are only visible to engagement team members."""

    def test_admin_can_read_draft(self, admin_user):
        report = AuditReportFactory(status="draft")
        resp = make_client(admin_user).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_engagement_manager_can_read_draft(self):
        report = AuditReportFactory(status="draft")
        manager = make_engagement_manager(report.engagement)
        resp = make_client(manager).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_team_auditor_can_read_draft(self):
        report = AuditReportFactory(status="draft")
        auditor = make_team_auditor(report.engagement)
        resp = make_client(auditor).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_non_team_auditor_cannot_read_draft(self):
        report = AuditReportFactory(status="draft")
        stranger = UserFactory(role="auditor")
        resp = make_client(stranger).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_finding_owner_cannot_read_draft(self, finding_owner_user):
        report = AuditReportFactory(status="draft")
        resp = make_client(finding_owner_user).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_unauthenticated_cannot_read_draft(self, api_client):
        report = AuditReportFactory(status="draft")
        resp = api_client.get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 401


# ── READ final / archived reports ─────────────────────────────────────────────

@pytest.mark.django_db
class TestReadFinalReport:
    """FINAL and ARCHIVED reports have broad distribution."""

    def test_any_authenticated_user_can_read_final(self, finding_owner_user):
        report = AuditReportFactory(status="final")
        resp = make_client(finding_owner_user).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_non_team_auditor_can_read_final(self):
        report = AuditReportFactory(status="final")
        stranger = UserFactory(role="auditor")
        resp = make_client(stranger).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_risk_owner_can_read_final(self, risk_owner_user):
        report = AuditReportFactory(status="final")
        resp = make_client(risk_owner_user).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED

    def test_any_authenticated_user_can_read_archived(self):
        report = AuditReportFactory(status="archived")
        user = UserFactory(role="read_only")
        resp = make_client(user).get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200  # ALLOWED


# ── EDIT reports ──────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestEditReport:
    def test_admin_can_edit_draft(self, admin_user):
        report = AuditReportFactory(status="draft", title="Original")
        resp = make_client(admin_user).patch(
            f"{REPORTS_URL}{report.pk}/", {"title": "Updated"}
        )
        assert resp.status_code == 200  # ALLOWED
        assert resp.data["title"] == "Updated"

    def test_engagement_manager_can_edit_draft(self):
        report = AuditReportFactory(status="draft")
        manager = make_engagement_manager(report.engagement)
        resp = make_client(manager).patch(
            f"{REPORTS_URL}{report.pk}/", {"executive_summary": "Updated summary."}
        )
        assert resp.status_code == 200  # ALLOWED

    def test_team_auditor_can_edit_draft(self):
        report = AuditReportFactory(status="draft")
        auditor = make_team_auditor(report.engagement)
        resp = make_client(auditor).patch(
            f"{REPORTS_URL}{report.pk}/", {"executive_summary": "Auditor summary."}
        )
        assert resp.status_code == 200  # ALLOWED

    def test_non_team_auditor_cannot_edit_draft(self):
        report = AuditReportFactory(status="draft")
        stranger = UserFactory(role="auditor")
        resp = make_client(stranger).patch(
            f"{REPORTS_URL}{report.pk}/", {"executive_summary": "Should not work."}
        )
        assert resp.status_code == 403  # DENIED

    def test_nobody_can_edit_final_report(self, admin_user):
        """Final reports are immutable — even admins cannot edit them."""
        report = AuditReportFactory(status="final")
        resp = make_client(admin_user).patch(
            f"{REPORTS_URL}{report.pk}/", {"title": "Post-final edit"}
        )
        assert resp.status_code == 403  # DENIED

    def test_nobody_can_edit_archived_report(self, admin_user):
        report = AuditReportFactory(status="archived")
        resp = make_client(admin_user).patch(
            f"{REPORTS_URL}{report.pk}/", {"title": "Post-archive edit"}
        )
        assert resp.status_code == 403  # DENIED

    def test_engagement_manager_cannot_edit_final(self):
        report = AuditReportFactory(status="final")
        manager = make_engagement_manager(report.engagement)
        resp = make_client(manager).patch(
            f"{REPORTS_URL}{report.pk}/", {"title": "Should be blocked."}
        )
        assert resp.status_code == 403  # DENIED


# ── DELETE reports ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestDeleteReport:
    def test_engagement_manager_can_delete_draft(self):
        report = AuditReportFactory(status="draft")
        manager = make_engagement_manager(report.engagement)
        resp = make_client(manager).delete(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 204  # ALLOWED

    def test_admin_can_delete_draft(self, admin_user):
        report = AuditReportFactory(status="draft")
        resp = make_client(admin_user).delete(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 204  # ALLOWED

    def test_team_auditor_cannot_delete(self):
        report = AuditReportFactory(status="draft")
        auditor = make_team_auditor(report.engagement)
        resp = make_client(auditor).delete(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 403  # DENIED

    def test_nobody_can_delete_final(self, admin_user):
        report = AuditReportFactory(status="final")
        resp = make_client(admin_user).delete(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 403  # DENIED


# ── FINALIZE report ───────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFinalizeReport:
    def test_engagement_manager_can_finalize(self):
        report = AuditReportFactory(status="pending_review")
        manager = make_engagement_manager(report.engagement)
        resp = make_client(manager).post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 200  # ALLOWED
        assert resp.data["status"] == "final"

    def test_admin_can_finalize(self, admin_user):
        report = AuditReportFactory(status="pending_review")
        resp = make_client(admin_user).post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 200  # ALLOWED

    def test_different_manager_cannot_finalize(self):
        """An audit manager who is NOT this engagement's manager cannot finalise."""
        report = AuditReportFactory(status="pending_review")
        other_manager = UserFactory(role="audit_manager")
        resp = make_client(other_manager).post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 403  # DENIED

    def test_team_auditor_cannot_finalize(self):
        report = AuditReportFactory(status="pending_review")
        auditor = make_team_auditor(report.engagement)
        resp = make_client(auditor).post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 403  # DENIED

    def test_already_final_returns_400(self):
        report = AuditReportFactory(status="final")
        manager = make_engagement_manager(report.engagement)
        resp = make_client(manager).post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 400


# ── Report list scoping ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReportListScoping:
    """
    The list endpoint scopes results so draft reports are only shown to
    team members, while final/archived reports appear for all authenticated users.
    """

    def test_non_member_does_not_see_draft_in_list(self):
        AuditReportFactory(status="draft")
        stranger = UserFactory(role="auditor")
        resp = make_client(stranger).get(REPORTS_URL)
        assert resp.status_code == 200
        for r in resp.data["results"]:
            assert r["status"] != "draft"

    def test_non_member_sees_final_in_list(self):
        AuditReportFactory(status="final")
        stranger = UserFactory(role="auditor")
        resp = make_client(stranger).get(REPORTS_URL)
        assert resp.status_code == 200
        assert any(r["status"] == "final" for r in resp.data["results"])

    def test_team_member_sees_draft_in_list(self):
        report = AuditReportFactory(status="draft")
        auditor = make_team_auditor(report.engagement)
        resp = make_client(auditor).get(REPORTS_URL)
        assert resp.status_code == 200
        ids = [str(r["id"]) for r in resp.data["results"]]
        assert str(report.pk) in ids
