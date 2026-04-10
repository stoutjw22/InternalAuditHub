"""
Engagement models: AuditEngagement, EngagementAuditor, AuditTask.

An AuditEngagement is the top-level container for an audit.
It links to Risks and Controls through separate through-tables
(EngagementRisk, EngagementControl) defined in the risks/controls apps.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditEngagement(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", _("Planning")
        IN_PROGRESS = "in_progress", _("In Progress")
        REVIEW = "review", _("Under Review")
        COMPLETED = "completed", _("Completed")
        CANCELLED = "cancelled", _("Cancelled")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PLANNING, db_index=True
    )
    audit_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="managed_engagements",
        help_text="Responsible audit manager.",
    )
    business_process = models.ForeignKey(
        "core.BusinessProcess",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engagements",
    )
    business_objective = models.ForeignKey(
        "core.BusinessObjective",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="engagements",
    )
    scope = models.TextField(blank=True, help_text="What is included/excluded.")
    objectives = models.TextField(blank=True, help_text="Stated goals of this engagement.")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_engagements",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "engagements_audit_engagement"
        verbose_name = _("Audit Engagement")
        verbose_name_plural = _("Audit Engagements")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["audit_manager"]),
            models.Index(fields=["start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_status_display()})"


class EngagementAuditor(models.Model):
    """
    Through-table: auditors assigned to an engagement.
    Separate from AuditEngagement.audit_manager (the lead).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(
        AuditEngagement,
        on_delete=models.CASCADE,
        related_name="assigned_auditors",
    )
    auditor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="audit_assignments",
    )
    role_note = models.CharField(
        max_length=200,
        blank=True,
        help_text="Optional note on this auditor's specific role.",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="auditor_assignments_made",
    )

    class Meta:
        db_table = "engagements_engagement_auditor"
        verbose_name = _("Engagement Auditor")
        verbose_name_plural = _("Engagement Auditors")
        unique_together = ("engagement", "auditor")

    def __str__(self) -> str:
        return f"{self.auditor} → {self.engagement}"


class AuditTask(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", _("To Do")
        IN_PROGRESS = "in_progress", _("In Progress")
        REVIEW = "review", _("Under Review")
        DONE = "done", _("Done")
        BLOCKED = "blocked", _("Blocked")

    class Priority(models.TextChoices):
        LOW = "low", _("Low")
        MEDIUM = "medium", _("Medium")
        HIGH = "high", _("High")
        CRITICAL = "critical", _("Critical")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(
        AuditEngagement,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.TODO, db_index=True
    )
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.MEDIUM
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "engagements_audit_task"
        verbose_name = _("Audit Task")
        verbose_name_plural = _("Audit Tasks")
        ordering = ["due_date", "priority"]
        indexes = [
            models.Index(fields=["engagement", "status"]),
            models.Index(fields=["assigned_to", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} [{self.engagement}]"
