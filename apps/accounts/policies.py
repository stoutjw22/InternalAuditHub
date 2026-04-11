"""
Centralized permission/policy service for InternalAuditHub.

Rather than scattering access-control logic across every view, all fine-grained
rules live here.  DRF permission classes in permissions.py delegate to these
functions so views stay thin and testable in isolation.

Policy rules at a glance
-------------------------
Engagement team membership
  An "engagement team member" is any of:
    • Admin (always)
    • The engagement's audit_manager
    • Any user listed in EngagementAuditor for that engagement

Finding access by workflow state
  DRAFT              → engagement team members only
  OPEN / IN_REMEDIATION / RESOLVED
                     → team members  +  finding owner  +  identified_by  +  created_by
  CLOSED / RISK_ACCEPTED
                     → same read set; immutable (no writes except admin)

Management response field
  Only the finding owner OR an audit-manager/admin may update management_response.

Report access by workflow state
  DRAFT / PENDING_REVIEW → engagement team members only
  FINAL / ARCHIVED       → any authenticated user (broad distribution)

Report editability by workflow state
  DRAFT / PENDING_REVIEW → engagement team members may edit
  FINAL / ARCHIVED       → immutable for everyone (including admin)

Finalize report
  Only the engagement's audit_manager or admin.

Approval decisions
  Only the designated approver, an audit-manager, or admin.
  The requester cannot approve their own request (self-approval is blocked).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from apps.accounts.models import User
    from apps.engagements.models import AuditEngagement
    from apps.findings.models import ApprovalRequest, Finding
    from apps.reports.models import AuditReport


# ── Engagement team membership ────────────────────────────────────────────────

def is_engagement_team_member(user: "User", engagement: "AuditEngagement") -> bool:
    """
    Return True if *user* belongs to the engagement team.

    Includes:
      • Admins (always)
      • The engagement's designated audit_manager
      • Any user listed in EngagementAuditor for the engagement
    """
    from apps.accounts.models import UserRole
    from apps.engagements.models import EngagementAuditor

    if user.role == UserRole.ADMIN:
        return True
    if engagement.audit_manager_id == user.pk:
        return True
    return EngagementAuditor.objects.filter(
        engagement=engagement, auditor=user
    ).exists()


# ── Findings ──────────────────────────────────────────────────────────────────

def can_read_finding(user: "User", finding: "Finding") -> bool:
    """
    Decide whether *user* may read *finding*.

    Rules:
    - Admin: always
    - Engagement team member: always
    - Draft findings: team members only (no access for external owners)
    - Non-draft: finding owner / identified_by / created_by may also read
    """
    from apps.accounts.models import UserRole
    from apps.findings.models import Finding as FindingModel

    if user.role == UserRole.ADMIN:
        return True

    engagement = finding.engagement
    if is_engagement_team_member(user, engagement):
        return True

    # Draft findings are internal working documents — team members only.
    if finding.status == FindingModel.FindingStatus.DRAFT:
        return False

    # Non-draft: stakeholders who are linked to this finding may read it.
    return user.pk in (
        finding.owner_id,
        finding.identified_by_id,
        finding.created_by_id,
    )


def can_write_finding(user: "User", finding: "Finding") -> bool:
    """
    Decide whether *user* may modify core fields of *finding*.

    This does NOT cover management_response — use can_add_management_response().

    Rules:
    - Closed / Risk Accepted: immutable for everyone except admin.
    - Draft: any engagement team member may edit.
    - Open / In Remediation / Resolved: only the engagement's audit_manager or admin.
    """
    from apps.accounts.models import UserRole
    from apps.findings.models import Finding as FindingModel

    if user.role == UserRole.ADMIN:
        return True

    immutable = (
        FindingModel.FindingStatus.CLOSED,
        FindingModel.FindingStatus.RISK_ACCEPTED,
    )
    if finding.status in immutable:
        return False

    engagement = finding.engagement

    if not is_engagement_team_member(user, engagement):
        return False

    if finding.status == FindingModel.FindingStatus.DRAFT:
        # Any team member may edit a draft.
        return True

    # Open / In Remediation / Resolved: only the engagement manager (or admin above).
    return engagement.audit_manager_id == user.pk


def can_add_management_response(user: "User", finding: "Finding") -> bool:
    """
    The management_response field may only be updated by:
      • The finding owner (the business stakeholder responsible for remediation)
      • Any audit manager or admin

    Note: closed/risk-accepted findings block this through can_write_finding(),
    but management_response is intentionally writeable on open/in_remediation
    findings to allow the owner to respond while an audit manager progresses
    the finding status.
    """
    from apps.accounts.models import UserRole
    from apps.findings.models import Finding as FindingModel

    # Immutable states: block even management response updates
    immutable = (
        FindingModel.FindingStatus.CLOSED,
        FindingModel.FindingStatus.RISK_ACCEPTED,
    )
    if finding.status in immutable and user.role != UserRole.ADMIN:
        return False

    if user.role in (UserRole.ADMIN, UserRole.AUDIT_MANAGER):
        return True
    return finding.owner_id == user.pk


def can_delete_finding(user: "User", finding: "Finding") -> bool:
    """
    Hard-delete is restricted:
      • Admin: always
      • Engagement audit_manager: yes, unless the finding is closed
      • Others: no
    """
    from apps.accounts.models import UserRole
    from apps.findings.models import Finding as FindingModel

    if user.role == UserRole.ADMIN:
        return True
    if finding.status == FindingModel.FindingStatus.CLOSED:
        return False
    return finding.engagement.audit_manager_id == user.pk


# ── Reports ───────────────────────────────────────────────────────────────────

def can_read_report(user: "User", report: "AuditReport") -> bool:
    """
    Draft / Pending Review: engagement team members only.
    Final / Archived: any authenticated user (broad distribution intended).
    """
    from apps.accounts.models import UserRole
    from apps.reports.models import AuditReport as ReportModel

    if user.role == UserRole.ADMIN:
        return True

    wide_dist = (
        ReportModel.ReportStatus.FINAL,
        ReportModel.ReportStatus.ARCHIVED,
    )
    if report.status in wide_dist:
        return user.is_authenticated

    return is_engagement_team_member(user, report.engagement)


def can_edit_report(user: "User", report: "AuditReport") -> bool:
    """
    Final and Archived reports are immutable for everyone (including admin).
    Otherwise: engagement team members only.

    Note: blocking even admins from editing final reports is intentional —
    a finalized report is a governance artifact that must not be silently changed.
    If correction is needed, archive the report and create a new one.
    """
    from apps.reports.models import AuditReport as ReportModel

    immutable = (
        ReportModel.ReportStatus.FINAL,
        ReportModel.ReportStatus.ARCHIVED,
    )
    if report.status in immutable:
        return False

    from apps.accounts.models import UserRole

    if user.role == UserRole.ADMIN:
        return True
    return is_engagement_team_member(user, report.engagement)


def can_delete_report(user: "User", report: "AuditReport") -> bool:
    """
    Only the engagement's audit_manager or admin may delete a report,
    and only while it is still in draft / pending_review state.
    """
    from apps.accounts.models import UserRole
    from apps.reports.models import AuditReport as ReportModel

    immutable = (
        ReportModel.ReportStatus.FINAL,
        ReportModel.ReportStatus.ARCHIVED,
    )
    if report.status in immutable:
        return False

    if user.role == UserRole.ADMIN:
        return True
    return report.engagement.audit_manager_id == user.pk


def can_finalize_report(user: "User", report: "AuditReport") -> bool:
    """Only the engagement's audit_manager or admin may finalise a report."""
    from apps.accounts.models import UserRole

    if user.role == UserRole.ADMIN:
        return True
    return report.engagement.audit_manager_id == user.pk


# ── Approvals ─────────────────────────────────────────────────────────────────

def can_approve_request(user: "User", approval: "ApprovalRequest") -> bool:
    """
    Only the designated approver, an admin, or an audit manager may act
    on an approval request.

    Self-approval is explicitly blocked: the requester cannot approve
    their own request even if they hold an audit manager role.
    """
    from apps.accounts.models import UserRole

    # Self-approval is never allowed.
    if approval.requested_by_id == user.pk:
        return False

    if user.role in (UserRole.ADMIN, UserRole.AUDIT_MANAGER):
        return True
    return approval.approver_id == user.pk
