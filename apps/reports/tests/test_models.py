"""
Model tests for the reports app: AuditReportTemplate, AuditReport.
"""
import pytest

from conftest import (
    AuditEngagementFactory,
    AuditReportFactory,
    AuditReportTemplateFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestAuditReportTemplateModel:
    def test_create(self):
        template = AuditReportTemplateFactory()
        assert template.pk is not None

    def test_str_returns_name(self):
        template = AuditReportTemplateFactory(name="Standard Audit Template")
        assert str(template) == "Standard Audit Template"

    def test_default_is_active(self):
        template = AuditReportTemplateFactory()
        assert template.is_active is True

    def test_content_template_can_be_blank_via_model(self):
        from apps.reports.models import AuditReportTemplate

        # content_template has no blank=True, so DB write with empty should be fine at ORM level
        template = AuditReportTemplate.objects.create(
            name="Empty Template",
            content_template="",
        )
        assert template.pk is not None

    def test_sharepoint_template_url_defaults_blank(self):
        template = AuditReportTemplateFactory()
        assert template.sharepoint_template_url == ""

    def test_created_by_is_optional(self):
        template = AuditReportTemplateFactory(created_by=None)
        assert template.created_by is None


@pytest.mark.django_db
class TestAuditReportModel:
    def test_create(self):
        report = AuditReportFactory()
        assert report.pk is not None

    def test_str_includes_title_and_status(self):
        report = AuditReportFactory(title="Annual IT Audit Report", status="draft")
        result = str(report)
        assert "Annual IT Audit Report" in result
        assert "Draft" in result

    def test_default_status_is_draft(self):
        report = AuditReportFactory()
        assert report.status == "draft"

    def test_template_is_optional(self):
        report = AuditReportFactory(template=None)
        assert report.template is None

    def test_template_can_be_set(self):
        template = AuditReportTemplateFactory()
        report = AuditReportFactory(template=template)
        assert report.template == template

    def test_finalized_by_defaults_null(self):
        report = AuditReportFactory()
        assert report.finalized_by is None

    def test_finalized_at_defaults_null(self):
        report = AuditReportFactory()
        assert report.finalized_at is None

    def test_sharepoint_url_defaults_blank(self):
        report = AuditReportFactory()
        assert report.sharepoint_report_url == ""

    def test_all_status_choices(self):
        for st in ("draft", "pending_review", "final", "archived"):
            report = AuditReportFactory(status=st)
            assert report.status == st

    def test_cascades_on_engagement_delete(self):
        from apps.reports.models import AuditReport

        engagement = AuditEngagementFactory()
        report = AuditReportFactory(engagement=engagement)
        # Need to delete engagement risks, findings, etc. first if they exist
        # Just delete via the ORM; cascade should handle it
        from apps.engagements.models import AuditEngagement

        AuditEngagement.objects.filter(pk=engagement.pk).delete()
        assert not AuditReport.objects.filter(pk=report.pk).exists()
