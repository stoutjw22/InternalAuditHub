"""
Audit signal handlers for InternalAuditHub.

Every high-value model in the system is wired here with pre_save / post_save /
post_delete receivers that write rich AuditLog entries (entity_id, entity_name,
old/new field diffs) via the audit service.

Registration
------------
These receivers are connected in CoreConfig.ready() (apps/core/apps.py) so
they are only registered once, after all app models are fully loaded.

Deduplication
-------------
Each post_save / post_delete handler calls audit.mark_logged() so that
AuditLogMiddleware knows a rich entry already exists and can skip its coarse
fallback entry for that request.

Covered models
--------------
  Finding         apps.findings
  Risk            apps.risks
  AuditEngagement apps.engagements
  EngagementAuditor apps.engagements
  Control         apps.controls
  User            apps.accounts
  AuditReport     apps.reports
"""
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.core.audit import (
    capture_snapshot,
    get_current_request,
    log_create,
    log_delete,
    log_update,
    mark_logged,
)

# Lazy imports of model classes happen at module-level here (inside ready()),
# so all app registries are already fully populated by the time this runs.
from apps.accounts.models import User
from apps.controls.models import Control
from apps.engagements.models import AuditEngagement, EngagementAuditor
from apps.findings.models import Finding
from apps.reports.models import AuditReport
from apps.risks.models import Risk


def _user_from_request():
    """Return the authenticated User for the current request, or None."""
    request = get_current_request()
    if request is None:
        return None
    user = getattr(request, "user", None)
    if user is None or not getattr(user, "is_authenticated", False):
        return None
    return user


# ---------------------------------------------------------------------------
# Generic pre_save helper
# ---------------------------------------------------------------------------

def _attach_old_snapshot(instance, sender):
    """
    If this is an UPDATE (not a new insert), fetch the current DB row and
    attach its snapshot to the instance so the post_save handler can diff it.
    """
    if instance._state.adding:
        return  # New instance — no old state to capture
    try:
        old = sender.objects.get(pk=instance.pk)
        instance._audit_old_snapshot = capture_snapshot(old)
    except sender.DoesNotExist:
        instance._audit_old_snapshot = None


# ============================================================================
# Finding
# ============================================================================

@receiver(pre_save, sender=Finding, dispatch_uid="audit_finding_pre_save")
def finding_pre_save(sender, instance, **kwargs):
    _attach_old_snapshot(instance, sender)


@receiver(post_save, sender=Finding, dispatch_uid="audit_finding_post_save")
def finding_post_save(sender, instance, created, **kwargs):
    request = get_current_request()
    user = _user_from_request()
    if created:
        log_create(instance, user=user, request=request)
    else:
        old = getattr(instance, "_audit_old_snapshot", None)
        if old is not None:
            log_update(instance, old, user=user, request=request)
    mark_logged()


@receiver(post_delete, sender=Finding, dispatch_uid="audit_finding_post_delete")
def finding_post_delete(sender, instance, **kwargs):
    request = get_current_request()
    log_delete(instance, user=_user_from_request(), request=request)
    mark_logged()


# ============================================================================
# Risk
# ============================================================================

@receiver(pre_save, sender=Risk, dispatch_uid="audit_risk_pre_save")
def risk_pre_save(sender, instance, **kwargs):
    _attach_old_snapshot(instance, sender)


@receiver(post_save, sender=Risk, dispatch_uid="audit_risk_post_save")
def risk_post_save(sender, instance, created, **kwargs):
    request = get_current_request()
    user = _user_from_request()
    if created:
        log_create(instance, user=user, request=request)
    else:
        old = getattr(instance, "_audit_old_snapshot", None)
        if old is not None:
            log_update(instance, old, user=user, request=request)
    mark_logged()


@receiver(post_delete, sender=Risk, dispatch_uid="audit_risk_post_delete")
def risk_post_delete(sender, instance, **kwargs):
    request = get_current_request()
    log_delete(instance, user=_user_from_request(), request=request)
    mark_logged()


# ============================================================================
# AuditEngagement
# ============================================================================

@receiver(pre_save, sender=AuditEngagement, dispatch_uid="audit_engagement_pre_save")
def engagement_pre_save(sender, instance, **kwargs):
    _attach_old_snapshot(instance, sender)


@receiver(post_save, sender=AuditEngagement, dispatch_uid="audit_engagement_post_save")
def engagement_post_save(sender, instance, created, **kwargs):
    request = get_current_request()
    user = _user_from_request()
    if created:
        log_create(instance, user=user, request=request)
    else:
        old = getattr(instance, "_audit_old_snapshot", None)
        if old is not None:
            log_update(instance, old, user=user, request=request)
    mark_logged()


@receiver(post_delete, sender=AuditEngagement, dispatch_uid="audit_engagement_post_delete")
def engagement_post_delete(sender, instance, **kwargs):
    request = get_current_request()
    log_delete(instance, user=_user_from_request(), request=request)
    mark_logged()


# ============================================================================
# EngagementAuditor  (team assignments — create / remove only, no diffs)
# ============================================================================

@receiver(post_save, sender=EngagementAuditor, dispatch_uid="audit_engagement_auditor_post_save")
def engagement_auditor_post_save(sender, instance, created, **kwargs):
    if not created:
        return  # Only log assignments; changes are not meaningful
    request = get_current_request()
    log_create(instance, user=_user_from_request(), request=request)
    mark_logged()


@receiver(post_delete, sender=EngagementAuditor, dispatch_uid="audit_engagement_auditor_post_delete")
def engagement_auditor_post_delete(sender, instance, **kwargs):
    request = get_current_request()
    log_delete(instance, user=_user_from_request(), request=request)
    mark_logged()


# ============================================================================
# Control
# ============================================================================

@receiver(pre_save, sender=Control, dispatch_uid="audit_control_pre_save")
def control_pre_save(sender, instance, **kwargs):
    _attach_old_snapshot(instance, sender)


@receiver(post_save, sender=Control, dispatch_uid="audit_control_post_save")
def control_post_save(sender, instance, created, **kwargs):
    request = get_current_request()
    user = _user_from_request()
    if created:
        log_create(instance, user=user, request=request)
    else:
        old = getattr(instance, "_audit_old_snapshot", None)
        if old is not None:
            log_update(instance, old, user=user, request=request)
    mark_logged()


@receiver(post_delete, sender=Control, dispatch_uid="audit_control_post_delete")
def control_post_delete(sender, instance, **kwargs):
    request = get_current_request()
    log_delete(instance, user=_user_from_request(), request=request)
    mark_logged()


# ============================================================================
# User  (role changes, activation / deactivation — security-critical)
# ============================================================================

@receiver(pre_save, sender=User, dispatch_uid="audit_user_pre_save")
def user_pre_save(sender, instance, **kwargs):
    _attach_old_snapshot(instance, sender)


@receiver(post_save, sender=User, dispatch_uid="audit_user_post_save")
def user_post_save(sender, instance, created, **kwargs):
    request = get_current_request()
    user = _user_from_request()
    if created:
        log_create(instance, user=user, request=request)
    else:
        old = getattr(instance, "_audit_old_snapshot", None)
        if old is not None:
            log_update(instance, old, user=user, request=request)
    mark_logged()


# ============================================================================
# AuditReport  (status changes, finalization)
# ============================================================================

@receiver(pre_save, sender=AuditReport, dispatch_uid="audit_report_pre_save")
def report_pre_save(sender, instance, **kwargs):
    _attach_old_snapshot(instance, sender)


@receiver(post_save, sender=AuditReport, dispatch_uid="audit_report_post_save")
def report_post_save(sender, instance, created, **kwargs):
    request = get_current_request()
    user = _user_from_request()
    if created:
        log_create(instance, user=user, request=request)
    else:
        old = getattr(instance, "_audit_old_snapshot", None)
        if old is not None:
            log_update(instance, old, user=user, request=request)
    mark_logged()


@receiver(post_delete, sender=AuditReport, dispatch_uid="audit_report_post_delete")
def report_post_delete(sender, instance, **kwargs):
    request = get_current_request()
    log_delete(instance, user=_user_from_request(), request=request)
    mark_logged()
