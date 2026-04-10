"""
Report models: AuditReportTemplate, AuditReport.

A template stores a reusable content skeleton (Markdown/HTML).
An AuditReport is generated for a specific engagement, optionally
using a template, and goes through Draft → Final with an approval gate.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditReportTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sharepoint_template_url = models.URLField(
        blank=True,
        help_text="SharePoint URL where the source template document is stored.",
    )
    # Markdown/HTML template with {{placeholder}} variables
    content_template = models.TextField(
        help_text=(
            "Report template body. Supports Markdown. "
            "Use {{engagement_name}}, {{audit_manager}}, {{findings_summary}} etc. as placeholders."
        )
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_report_templates",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reports_audit_report_template"
        verbose_name = _("Audit Report Template")
        verbose_name_plural = _("Audit Report Templates")
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class AuditReport(models.Model):
    class ReportStatus(models.TextChoices):
        DRAFT = "draft", _("Draft")
        PENDING_REVIEW = "pending_review", _("Pending Review")
        FINAL = "final", _("Final")
        ARCHIVED = "archived", _("Archived")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    engagement = models.ForeignKey(
        "engagements.AuditEngagement",
        on_delete=models.CASCADE,
        related_name="reports",
    )
    template = models.ForeignKey(
        AuditReportTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reports",
    )
    title = models.CharField(max_length=300)
    executive_summary = models.TextField(blank=True)
    # Main report body (Markdown/rich text)
    content = models.TextField(blank=True, help_text="Full report content (Markdown supported).")
    status = models.CharField(
        max_length=20, choices=ReportStatus.choices, default=ReportStatus.DRAFT, db_index=True
    )
    # Distribution list — stored as comma-separated emails; extend to M2M if needed
    distribution_list = models.TextField(
        blank=True,
        help_text="Comma-separated email addresses of report recipients.",
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="generated_reports",
    )
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finalized_reports",
    )
    finalized_at = models.DateTimeField(null=True, blank=True)
    sharepoint_report_url = models.URLField(
        blank=True,
        help_text="SharePoint URL where the finalised report document is stored.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reports_audit_report"
        verbose_name = _("Audit Report")
        verbose_name_plural = _("Audit Reports")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["engagement", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.get_status_display()})"
