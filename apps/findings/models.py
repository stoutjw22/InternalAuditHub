"""
Findings models: Finding, RemediationAction, Evidence, ApprovalRequest.

A Finding documents an issue identified during an audit engagement.
Each finding can have multiple remediation actions and supporting evidence.
An ApprovalRequest gates the closure of findings and completion of reports.
"""
import os
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

# Allowed MIME types for evidence uploads
ALLOWED_EVIDENCE_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "image/gif",
    "text/plain",
    "text/csv",
}
MAX_EVIDENCE_SIZE_MB = 25


def _evidence_upload_path(instance, filename):
    """Store evidence under media/evidence/<engagement_id>/<uuid>/<filename>."""
    ext = os.path.splitext(filename)[1].lower()
    safe_name = f"{uuid.uuid4()}{ext}"
    engagement_id = (
        str(instance.engagement_id)
        if instance.engagement_id
        else str(instance.finding.engagement_id)
        if instance.finding_id
        else "misc"
    )
    return f"evidence/{engagement_id}/{safe_name}"


class Finding(models.Model):
    class FindingType(models.TextChoices):
        CONTROL_DEFICIENCY = "control_deficiency", _("Control Deficiency")
        PROCESS_GAP = "process_gap", _("Process Gap")
        COMPLIANCE_ISSUE = "compliance_issue", _("Compliance Issue")
        FRAUD_INDICATOR = "fraud_indicator", _("Fraud Indicator")
        OBSERVATION = "observation", _("Observation")
        BEST_PRACTICE = "best_practice", _("Best Practice Recommendation")

    class Severity(models.TextChoices):
        CRITICAL = "critical", _("Critical")
        HIGH = "high", _("High")
        MEDIUM = "medium", _("Medium")
        LOW = "low", _("Low")
        INFO = "info", _("Informational")

    class FindingStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        OPEN = "open", _("Open")
        IN_REMEDIATION = "in_remediation", _("In Remediation")
        RESOLVED = "resolved", _("Resolved")
        CLOSED = "closed", _("Closed")
        RISK_ACCEPTED = "risk_accepted", _("Risk Accepted")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(
        "engagements.AuditEngagement",
        on_delete=models.CASCADE,
        related_name="findings",
    )
    title = models.CharField(max_length=300)
    description = models.TextField(help_text="Detailed description of the finding.")
    finding_type = models.CharField(
        max_length=25, choices=FindingType.choices, default=FindingType.CONTROL_DEFICIENCY
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.MEDIUM, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=FindingStatus.choices, default=FindingStatus.DRAFT, db_index=True
    )
    root_cause = models.TextField(blank=True)
    management_response = models.TextField(
        blank=True, help_text="Response from management regarding this finding."
    )
    # Optional links to the control / risk that generated this finding
    control = models.ForeignKey(
        "controls.Control",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="findings",
    )
    risk = models.ForeignKey(
        "risks.Risk",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="findings",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_findings",
        help_text="Person responsible for remediation.",
    )
    identified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="identified_findings",
    )
    identified_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True, help_text="Target remediation date.")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_findings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "findings_finding"
        verbose_name = _("Finding")
        verbose_name_plural = _("Findings")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["engagement", "severity"]),
            models.Index(fields=["status", "severity"]),
            models.Index(fields=["owner"]),
            models.Index(fields=["due_date"]),
        ]

    def __str__(self) -> str:
        return f"[{self.get_severity_display()}] {self.title}"


class RemediationAction(models.Model):
    class ActionStatus(models.TextChoices):
        OPEN = "open", _("Open")
        IN_PROGRESS = "in_progress", _("In Progress")
        COMPLETED = "completed", _("Completed")
        OVERDUE = "overdue", _("Overdue")
        CANCELLED = "cancelled", _("Cancelled")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    finding = models.ForeignKey(
        Finding,
        on_delete=models.CASCADE,
        related_name="remediation_actions",
    )
    description = models.TextField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_remediation_actions",
    )
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=ActionStatus.choices, default=ActionStatus.OPEN, db_index=True
    )
    completion_notes = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_remediation_actions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "findings_remediation_action"
        verbose_name = _("Remediation Action")
        verbose_name_plural = _("Remediation Actions")
        ordering = ["due_date"]

    def __str__(self) -> str:
        return f"Action for {self.finding}: {self.description[:60]}"


class Evidence(models.Model):
    """Uploaded file evidence attached to a finding, engagement, or task."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # At least one of finding / engagement / task must be set
    finding = models.ForeignKey(
        Finding,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="evidence_files",
    )
    engagement = models.ForeignKey(
        "engagements.AuditEngagement",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="evidence_files",
    )
    task = models.ForeignKey(
        "engagements.AuditTask",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="evidence_files",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=_evidence_upload_path)
    original_filename = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField(default=0, help_text="Size in bytes.")
    content_type = models.CharField(max_length=100, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_evidence",
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "findings_evidence"
        verbose_name = _("Evidence")
        verbose_name_plural = _("Evidence Files")
        ordering = ["-uploaded_at"]

    def __str__(self) -> str:
        return self.title

    def clean(self):
        if not (self.finding_id or self.engagement_id or self.task_id):
            raise ValidationError("Evidence must be linked to a finding, engagement, or task.")
        if self.file_size > MAX_EVIDENCE_SIZE_MB * 1024 * 1024:
            raise ValidationError(f"File exceeds maximum allowed size of {MAX_EVIDENCE_SIZE_MB} MB.")


class ApprovalRequest(models.Model):
    """
    Workflow gate: anything that needs sign-off before advancing status.
    Supports findings (close approval) and reports (finalise approval).
    """

    class EntityType(models.TextChoices):
        FINDING = "finding", _("Finding")
        REPORT = "report", _("Audit Report")
        ENGAGEMENT = "engagement", _("Audit Engagement")

    class ApprovalStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        APPROVED = "approved", _("Approved")
        REJECTED = "rejected", _("Rejected")
        WITHDRAWN = "withdrawn", _("Withdrawn")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=20, choices=EntityType.choices, db_index=True)
    entity_id = models.UUIDField(help_text="UUID of the object being approved.")
    entity_name = models.CharField(max_length=300, blank=True)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval_requests_sent",
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="approval_requests_received",
    )
    status = models.CharField(
        max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING, db_index=True
    )
    request_notes = models.TextField(blank=True)
    review_notes = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "findings_approval_request"
        verbose_name = _("Approval Request")
        verbose_name_plural = _("Approval Requests")
        ordering = ["-requested_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["approver", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.entity_type} approval ({self.status}) → {self.approver}"
