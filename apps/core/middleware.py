"""
AuditLogMiddleware — records mutating API requests to the AuditLog table.

Only POST/PUT/PATCH/DELETE requests are logged; GET requests are skipped
to avoid flooding the table (sensitive GETs can be logged explicitly in views).
"""
import json
import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

LOGGED_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
# Paths that should never be logged (e.g. token refresh, health checks)
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
    """Best-effort: derive an entity name from the URL path."""
    parts = [p for p in path.strip("/").split("/") if p and not _is_uuid_or_id(p)]
    return parts[-1].replace("-", "_") if parts else "unknown"


def _is_uuid_or_id(segment: str) -> bool:
    return segment.isdigit() or (len(segment) == 36 and segment.count("-") == 4)


class AuditLogMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.method not in LOGGED_METHODS:
            return response
        if request.path in SKIP_PATHS:
            return response
        if not request.path.startswith("/api/"):
            return response
        # Only log successful mutations
        if response.status_code >= 400:
            return response

        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return response

        action_map = {
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete",
        }

        try:
            from .models import AuditLog  # avoid circular import at module level

            AuditLog.objects.create(
                user=user,
                action=action_map.get(request.method, "unknown"),
                entity_type=_infer_entity_type(request.path),
                entity_id="",
                ip_address=_get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            )
        except Exception:
            # Never let audit logging break a real request
            logger.exception("AuditLogMiddleware failed to write log entry")

        return response
