"""
Role-based and object-level DRF permission classes.

Usage in a view:
    permission_classes = [IsAuditorOrAbove]

Object-level classes (FindingObjectPermission, ReportObjectPermission,
ApprovalObjectPermission) must be used with DRF's standard
has_object_permission() mechanism.  The view must call
self.check_object_permissions(request, obj) or rely on get_object() to
trigger it automatically.

All complex policy logic is delegated to apps.accounts.policies so that
rules can be unit-tested independently of the HTTP layer.
"""
from rest_framework import permissions as drf_permissions
from rest_framework.permissions import BasePermission

from .models import UserRole
from . import policies


# ── Coarse role checks (preserved from EPIC 1) ────────────────────────────────

class IsAdminRole(BasePermission):
    """Only users with the Admin role."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsAuditManagerOrAbove(BasePermission):
    """Audit Managers and Admins."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.ADMIN, UserRole.AUDIT_MANAGER)
        )


class IsAuditorOrAbove(BasePermission):
    """Auditors, Audit Managers, and Admins."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role
            in (UserRole.ADMIN, UserRole.AUDIT_MANAGER, UserRole.AUDITOR)
        )


class IsRiskOwnerOrAbove(BasePermission):
    """Risk Owners, Auditors, Audit Managers, and Admins."""

    _allowed = (
        UserRole.ADMIN,
        UserRole.AUDIT_MANAGER,
        UserRole.AUDITOR,
        UserRole.RISK_OWNER,
    )

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self._allowed
        )


class IsControlOwnerOrAbove(BasePermission):
    """Control Owners, Risk Owners, Auditors, Audit Managers, and Admins."""

    _allowed = (
        UserRole.ADMIN,
        UserRole.AUDIT_MANAGER,
        UserRole.AUDITOR,
        UserRole.RISK_OWNER,
        UserRole.CONTROL_OWNER,
    )

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self._allowed
        )


class IsReportListAllowed(BasePermission):
    """
    Gate for the AuditReport list (GET) endpoint.

    Allows all authenticated roles that may legitimately see reports:
      auditors, managers, admins — team-scoped drafts + all final/archived
      risk_owner, control_owner, finding_owner — final/archived reports only
      read_only — blocked (no report visibility)

    The queryset in AuditReportListCreateView further restricts results.
    """

    _allowed = (
        UserRole.ADMIN,
        UserRole.AUDIT_MANAGER,
        UserRole.AUDITOR,
        UserRole.RISK_OWNER,
        UserRole.CONTROL_OWNER,
        UserRole.FINDING_OWNER,
    )

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self._allowed
        )


class IsFindingListAllowed(BasePermission):
    """
    Gate for the Finding list (GET) endpoint.

    Allows every role that has a legitimate reason to see the list:
      auditors, managers, admins — see team-scoped results
      risk_owner, control_owner, finding_owner — see their own non-draft findings
      read_only — blocked entirely (no finding visibility)

    The queryset in FindingListCreateView further restricts what each role sees.
    """

    _allowed = (
        UserRole.ADMIN,
        UserRole.AUDIT_MANAGER,
        UserRole.AUDITOR,
        UserRole.RISK_OWNER,
        UserRole.CONTROL_OWNER,
        UserRole.FINDING_OWNER,
    )

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self._allowed
        )


class IsOwnerOrAuditorOrAbove(BasePermission):
    """
    Object-level: the owner of the object can always access it.
    Auditors and above can access everything.
    """

    _staff_roles = (UserRole.ADMIN, UserRole.AUDIT_MANAGER, UserRole.AUDITOR)

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.role in self._staff_roles:
            return True
        owner = getattr(obj, "owner", None) or getattr(obj, "created_by", None)
        return owner == request.user


# ── Object-level permission classes (delegate to policies) ────────────────────

class FindingObjectPermission(BasePermission):
    """
    Object-level permission for Finding instances.

    Delegates to the centralized policy functions in apps.accounts.policies:
      GET / HEAD / OPTIONS → policies.can_read_finding()
      DELETE               → policies.can_delete_finding()
      PUT / PATCH          → policies.can_write_finding()
                             UNLESS only management_response is being updated,
                             in which case → policies.can_add_management_response()

    This class is intentionally permissive at the view level (has_permission
    returns True for any authenticated user) so that finding owners and other
    stakeholder roles can reach the object-level check.  The queryset in each
    view already scopes results appropriately.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if request.method in drf_permissions.SAFE_METHODS:
            return policies.can_read_finding(user, obj)

        if request.method == "DELETE":
            return policies.can_delete_finding(user, obj)

        # PUT / PATCH — check if it is a management-response-only update.
        fields_being_updated = set(request.data.keys())
        if fields_being_updated <= {"management_response"}:
            return policies.can_add_management_response(user, obj)

        return policies.can_write_finding(user, obj)


class ReportObjectPermission(BasePermission):
    """
    Object-level permission for AuditReport instances.

    Delegates to the centralized policy functions in apps.accounts.policies:
      GET / HEAD / OPTIONS → policies.can_read_report()
      PUT / PATCH          → policies.can_edit_report()
      DELETE               → policies.can_delete_report()

    Final and Archived reports are immutable — can_edit_report() returns False
    for those states regardless of role (including admin).
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if request.method in drf_permissions.SAFE_METHODS:
            return policies.can_read_report(user, obj)

        if request.method == "DELETE":
            return policies.can_delete_report(user, obj)

        return policies.can_edit_report(user, obj)


class ApprovalObjectPermission(BasePermission):
    """
    Object-level permission for ApprovalRequest instances.

    Read access: the requester, the designated approver, or a manager/admin.
    Decision actions: delegates to policies.can_approve_request() which also
    enforces the self-approval block.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user

        if request.method in drf_permissions.SAFE_METHODS:
            return (
                obj.requested_by_id == user.pk
                or obj.approver_id == user.pk
                or user.role in (UserRole.ADMIN, UserRole.AUDIT_MANAGER)
            )

        # Write / Decision actions
        return policies.can_approve_request(user, obj)
