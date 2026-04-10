"""
Custom DRF exception handler.

Returns a consistent JSON envelope for all errors:

    {
        "error": {
            "code": "validation_error",
            "message": "...",
            "fields": { "field_name": ["error detail"] }   // validation only
        }
    }
"""
import logging

from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied as DRFPermissionDenied,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    # Convert Django core exceptions to DRF equivalents
    if isinstance(exc, DjangoValidationError):
        exc = ValidationError(detail=exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
    elif isinstance(exc, Http404):
        exc = ValidationError(detail="Not found.", code="not_found")
    elif isinstance(exc, PermissionDenied):
        exc = DRFPermissionDenied()

    response = drf_default_handler(exc, context)

    if response is None:
        # Unhandled exception — let Django's 500 handler deal with it
        logger.exception("Unhandled exception in API view", exc_info=exc)
        return Response(
            {"error": {"code": "server_error", "message": "An unexpected error occurred."}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    code = getattr(exc, "default_code", "error")
    message = str(exc.detail) if hasattr(exc, "detail") else str(exc)
    payload: dict = {"error": {"code": code, "message": message}}

    # Add field-level errors for validation failures
    if isinstance(exc, ValidationError) and isinstance(exc.detail, dict):
        payload["error"]["fields"] = exc.detail
        payload["error"]["message"] = "Validation failed."

    response.data = payload
    return response
