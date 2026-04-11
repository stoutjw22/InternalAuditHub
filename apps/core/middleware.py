"""
Audit middleware for InternalAuditHub.

Two middleware classes work together:

AuditContextMiddleware
    Stores the current HttpRequest in thread-local storage so that signal
    handlers (which have no access to the request) can retrieve it when
    writing AuditLog entries.  Must come *before* AuditLogMiddleware in
    the MIDDLEWARE setting.

AuditLogMiddleware
    Coarse fallback logger.  Writes a minimal AuditLog entry for any
    mutating API request that was NOT already handled by a signal handler.
    Signal handlers call audit.mark_logged() to set a thread-local flag;
    this middleware checks that flag and skips writing a duplicate entry.

Together they ensure:
  • Rich, diff-based log entries for signal-covered entities (Finding, Risk,
    AuditEngagement, Control, User, AuditReport, EngagementAuditor).
  • A coarse fallback entry for every other successful mutation, so nothing
    is silently dropped.
"""
import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

LOGGED_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

# Paths that should never be logged (token endpoints, health-check).
SKIP_PATHS = frozenset(
    {
        "/api/v1/auth/token/",
        "/api/v1/auth/token/refresh/",
        "/api/v1/auth/token/blacklist/",
        "/health/",
    }
)


def _get_client_ip(request) -> str | None:
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _infer_entity_type(path: str) -> str:
    """Best-effort: derive an entity name from the URL path segments."""
    parts = [p for p in path.strip("/").split("/") if p and not _is_uuid_or_id(p)]
    return parts[-1].replace("-", "_") if parts else "unknown"


def _infer_entity_id(path: str) -> str:
    """
    Extract a UUID or numeric ID from the URL path.
    Returns the last UUID-shaped or all-digit segment, or empty string.
    """
    for segment in reversed(path.strip("/").split("/")):
        if _is_uuid_or_id(segment):
            return segment
    return ""


def _is_uuid_or_id(segment: str) -> bool:
    return segment.isdigit() or (len(segment) == 36 and segment.count("-") == 4)


# ---------------------------------------------------------------------------
# AuditContextMiddleware  (new-style callable middleware)
# ---------------------------------------------------------------------------

class AuditContextMiddleware:
    """
    Store the current request in thread-local storage for the duration of
    the request/response cycle so that signal handlers can access it.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from apps.core.audit import clear_audit_context, set_current_request

        set_current_request(request)
        try:
            response = self.get_response(request)
        finally:
            clear_audit_context()
        return response


# ---------------------------------------------------------------------------
# AuditLogMiddleware  (fallback logger)
# ---------------------------------------------------------------------------

class AuditLogMiddleware(MiddlewareMixin):
    """
    Fallback audit logger.

    Only fires when:
      1. The request method is a mutating verb (POST/PUT/PATCH/DELETE).
      2. The path is an API path not in SKIP_PATHS.
      3. The response was successful (status < 400).
      4. The user is authenticated.
      5. No signal handler already logged this request (was_logged() is False).
    """

    def process_response(self, request, response):
        if request.method not in LOGGED_METHODS:
            return response
        if request.path in SKIP_PATHS:
            return response
        if not request.path.startswith("/api/"):
            return response
        if response.status_code >= 400:
            return response

        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return response

        try:
            from apps.core.audit import was_logged

            # A signal handler already wrote a rich log entry — skip fallback.
            if was_logged():
                return response

            action_map = {
                "POST": "create",
                "PUT": "update",
                "PATCH": "update",
                "DELETE": "delete",
            }

            from .models import AuditLog

            AuditLog.objects.create(
                user=user,
                action=action_map.get(request.method, "update"),
                entity_type=_infer_entity_type(request.path),
                entity_id=_infer_entity_id(request.path),
                ip_address=_get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            )
        except Exception:
            # Never let audit logging break a real request.
            logger.exception("AuditLogMiddleware failed to write fallback log entry")

        return response
