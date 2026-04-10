"""
Role-based DRF permission classes.

Usage in a view:
    permission_classes = [IsAuditorOrAbove]
"""
from rest_framework.permissions import BasePermission

from .models import UserRole


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
