"""
Centralized audit-logging service for InternalAuditHub.

Usage
-----
Service functions are the canonical way to write AuditLog rows.

    from apps.core import audit

    # In a signal handler or view:
    audit.log_create(instance, user=request.user, request=request)
    audit.log_update(instance, old_snapshot, user=request.user, request=request)
    audit.log_delete(instance, user=request.user, request=request)

    # For explicit workflow events:
    audit.log_approval_decision(approval, "approved", user=request.user, request=request)

Design goals
------------
* log_event() NEVER raises — audit failures must not break real requests.
* Sensitive fields are redacted before any value reaches the database.
* Thread-local context lets signal handlers retrieve the current request
  (set by AuditContextMiddleware) without it being passed through every call.
* mark_logged() / was_logged() let AuditLogMiddleware skip a fallback entry
  when a signal handler has already produced a rich log row.
"""
from __future__ import annotations

import logging
import threading

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Sensitive-field redaction
# ---------------------------------------------------------------------------

# Substrings that, when found (case-insensitive) in a field name, cause the
# value to be replaced with "[REDACTED]".  Keep this list conservative —
# false positives hide audit-relevant data.
SENSITIVE_FIELDS: frozenset[str] = frozenset(
    {
        "password",
        "token",
        "secret",
        "private_key",
        "credential",
        "azure_oid",
        "last_login_ip",
    }
)


def _is_sensitive(field_name: str) -> bool:
    fn = field_name.lower()
    for sf in SENSITIVE_FIELDS:
        if sf in fn:
            return True
    return False


def redact(data: dict | None) -> dict | None:
    """
    Return a shallow copy of *data* with sensitive field values replaced by
    '[REDACTED]'.  Returns None unchanged.
    """
    if not data:
        return data
    return {
        k: "[REDACTED]" if _is_sensitive(k) else v
        for k, v in data.items()
    }


# ---------------------------------------------------------------------------
# Model snapshot / diff helpers
# ---------------------------------------------------------------------------

def _json_safe(value):
    """Convert a model field value to a JSON-serialisable Python primitive."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    # Handles: UUID, datetime, date, Decimal, FieldFile (returns name), etc.
    return str(value)


def capture_snapshot(instance) -> dict:
    """
    Serialise all concrete fields of *instance* to a JSON-safe dict and
    redact any sensitive fields.

    ForeignKey fields appear as '<field>_id' (the raw FK column value).
    Auto-generated timestamps (created_at / updated_at) are included so that
    diffs can detect when *only* updated_at changed (e.g. a no-op save).
    """
    data = {
        field.attname: _json_safe(field.value_from_object(instance))
        for field in instance._meta.concrete_fields
    }
    return redact(data)


def diff_snapshots(
    old: dict | None,
    new: dict | None,
) -> tuple[dict | None, dict | None]:
    """
    Return *(old_diff, new_diff)* containing only the keys whose values differ
    between *old* and *new*.

    If either snapshot is None the full snapshot is returned as-is (useful
    when old state couldn't be fetched before delete).
    """
    if old is None or new is None:
        return old, new
    all_keys = set(old) | set(new)
    changed = {k for k in all_keys if old.get(k) != new.get(k)}
    return (
        {k: old[k] for k in changed if k in old},
        {k: new[k] for k in changed if k in new},
    )


# ---------------------------------------------------------------------------
# Thread-local request context
# ---------------------------------------------------------------------------

_audit_local = threading.local()


def set_current_request(request) -> None:
    """Store the current Django request in thread-local storage."""
    _audit_local.request = request
    _audit_local.logged = False


def get_current_request():
    """Retrieve the current Django request (None outside a request context)."""
    return getattr(_audit_local, "request", None)


def clear_audit_context() -> None:
    """Reset all thread-local audit state at the end of a request."""
    _audit_local.request = None
    _audit_local.logged = False


def mark_logged() -> None:
    """
    Signal handlers call this after writing a log entry so that
    AuditLogMiddleware knows a rich entry already exists for this request
    and can skip writing a coarse fallback entry.
    """
    _audit_local.logged = True


def was_logged() -> bool:
    """Return True if a signal handler already logged this request."""
    return getattr(_audit_local, "logged", False)


# ---------------------------------------------------------------------------
# IP / user-agent extraction
# ---------------------------------------------------------------------------

def _get_client_ip(request) -> str | None:
    if request is None:
        return None
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _request_user(request):
    """Return the authenticated user from *request*, or None."""
    if request is None:
        return None
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    return user


# ---------------------------------------------------------------------------
# Low-level log writer
# ---------------------------------------------------------------------------

def log_event(
    *,
    action: str,
    entity_type: str,
    entity_id: str = "",
    entity_name: str = "",
    user=None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    request=None,
    ip_address: str | None = None,
    user_agent: str = "",
) -> None:
    """
    Write a single AuditLog row.

    This function **never raises** — any exception is caught and logged via
    the standard logging framework so that audit failures never break real
    requests.

    Parameters
    ----------
    action:       One of AuditLog.Action choices (create/update/delete/…)
    entity_type:  Lowercased model class name, e.g. 'finding', 'risk'
    entity_id:    String PK of the object (UUID or int as string)
    entity_name:  Human-readable label, e.g. str(instance)
    user:         User instance; falls back to request.user if None
    old_values:   JSON-safe dict of old field values (for update/delete)
    new_values:   JSON-safe dict of new field values (for create/update)
    request:      Django HttpRequest (used to extract ip_address / user_agent
                  and user if not supplied explicitly)
    ip_address:   Override; derived from request if not given
    user_agent:   Override; derived from request if not given
    """
    try:
        from .models import AuditLog  # local import avoids circular dependency

        # Resolve user from request if not provided
        if user is None:
            user = _request_user(request)

        # Resolve network context from request if not provided
        if ip_address is None:
            ip_address = _get_client_ip(request)
        if not user_agent and request is not None:
            user_agent = request.META.get("HTTP_USER_AGENT", "")

        AuditLog.objects.create(
            user=user,
            action=action,
            entity_type=str(entity_type)[:100],
            entity_id=str(entity_id)[:36] if entity_id else "",
            entity_name=str(entity_name)[:200] if entity_name else "",
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address or None,
            user_agent=(user_agent or "")[:500],
        )
    except Exception:
        logger.exception(
            "audit.log_event failed (action=%s entity_type=%s entity_id=%s) — suppressing",
            action,
            entity_type,
            entity_id,
        )


# ---------------------------------------------------------------------------
# Semantic helpers
# ---------------------------------------------------------------------------

def log_create(instance, *, user=None, request=None) -> None:
    """Log a CREATE event with a full snapshot as new_values."""
    log_event(
        action="create",
        entity_type=instance.__class__.__name__.lower(),
        entity_id=str(instance.pk) if instance.pk is not None else "",
        entity_name=str(instance)[:200],
        user=user,
        new_values=capture_snapshot(instance),
        request=request,
    )


def log_update(instance, old_snapshot: dict, *, user=None, request=None) -> None:
    """
    Log an UPDATE event with only the changed fields in old_values / new_values.

    Skips writing a log entry if no fields actually changed (e.g. a no-op
    save where only updated_at moved — we intentionally exclude that case by
    comparing the full snapshot).
    """
    new_snapshot = capture_snapshot(instance)
    old_diff, new_diff = diff_snapshots(old_snapshot, new_snapshot)

    # Remove updated_at from diff to avoid noise on touch-only saves
    for diff in (old_diff, new_diff):
        if diff:
            diff.pop("updated_at", None)

    if not old_diff and not new_diff:
        return  # Nothing meaningful changed

    log_event(
        action="update",
        entity_type=instance.__class__.__name__.lower(),
        entity_id=str(instance.pk) if instance.pk is not None else "",
        entity_name=str(instance)[:200],
        user=user,
        old_values=old_diff,
        new_values=new_diff,
        request=request,
    )


def log_delete(instance, *, user=None, request=None) -> None:
    """Log a DELETE event with the pre-deletion snapshot as old_values."""
    log_event(
        action="delete",
        entity_type=instance.__class__.__name__.lower(),
        entity_id=str(instance.pk) if instance.pk is not None else "",
        entity_name=str(instance)[:200],
        user=user,
        old_values=capture_snapshot(instance),
        request=request,
    )


def log_sensitive_read(
    entity_type: str,
    entity_id: str,
    entity_name: str,
    *,
    user=None,
    request=None,
) -> None:
    """Log a VIEW event for sensitive reads (exports, evidence downloads, etc.)."""
    log_event(
        action="view",
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        user=user,
        request=request,
    )


def log_export(
    entity_type: str,
    entity_id: str,
    entity_name: str,
    *,
    user=None,
    request=None,
) -> None:
    """Log an EXPORT event."""
    log_event(
        action="export",
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        user=user,
        request=request,
    )


def log_approval_decision(
    approval,
    decision: str,
    *,
    user=None,
    request=None,
) -> None:
    """
    Log an explicit APPROVE or REJECT event for an ApprovalRequest.

    *decision* must be 'approved' or 'rejected'; these map to the AuditLog
    action values 'approve' and 'reject'.
    """
    action = "approve" if decision == "approved" else "reject"
    log_event(
        action=action,
        entity_type="approvalrequest",
        entity_id=str(approval.pk),
        entity_name=str(approval),
        user=user,
        new_values={
            "decision": decision,
            "review_notes": getattr(approval, "review_notes", ""),
            "entity_type": approval.entity_type,
            "entity_id": str(approval.entity_id),
            "entity_name": approval.entity_name,
        },
        request=request,
    )
