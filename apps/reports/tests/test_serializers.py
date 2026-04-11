"""
Serializer tests for the reports app:
  AuditReportTemplateSerializer, AuditReportSerializer, AuditReportListSerializer.
"""
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.reports.serializers import (
    AuditReportListSerializer,
    AuditReportSerializer,
    AuditReportTemplateSerializer,
)

from conftest import (
    AuditEngagementFactory,
    AuditReportFactory,
    AuditReportTemplateFactory,
    UserFactory,
)


def _make_request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    drf_request = Request(req)
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestAuditReportTemplateSerializer:
    def test_serializes_existing(self):
        template = AuditReportTemplateFactory(name="Risk Report Template")
        data = AuditReportTemplateSerializer(template).data
        assert str(template.pk) == data["id"]
        assert data["name"] == "Risk Report Template"
        assert data["is_active"] is True
        assert "created_by_detail" in data

    def test_create_valid(self):
        user = UserFactory(role="audit_manager")
        data = {
            "name": "New Template",
            "content_template": "# {{engagement_name}}\n\n{{executive_summary}}",
        }
        s = AuditReportTemplateSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        template = s.save()
        assert template.name == "New Template"
        assert template.created_by == user

    def test_name_is_required(self):
        user = UserFactory(role="audit_manager")
        s = AuditReportTemplateSerializer(
            data={"content_template": "body"},
            context={"request": _make_request(user)},
        )
        assert not s.is_valid()
        assert "name" in s.errors


@pytest.mark.django_db
class TestAuditReportSerializer:
    def test_serializes_existing(self):
        report = AuditReportFactory(title="Q1 2026 IT Audit")
        data = AuditReportSerializer(report).data
        assert str(report.pk) == data["id"]
        assert data["title"] == "Q1 2026 IT Audit"
        assert "status_display" in data
        assert "generated_by_detail" in data
        assert "finalized_by_detail" in data

    def test_status_display(self):
        report = AuditReportFactory(status="pending_review")
        data = AuditReportSerializer(report).data
        assert data["status_display"] == "Pending Review"

    def test_create_valid(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "Vendor Audit Report",
            "executive_summary": "All controls tested.",
            "status": "draft",
        }
        s = AuditReportSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        report = s.save()
        assert report.title == "Vendor Audit Report"
        assert report.generated_by == user

    def test_title_is_required(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        s = AuditReportSerializer(
            data={"engagement": str(engagement.pk)},
            context={"request": _make_request(user)},
        )
        assert not s.is_valid()
        assert "title" in s.errors

    def test_generated_by_is_read_only(self):
        """The generated_by field must be auto-set; POSTing it should be ignored."""
        user = UserFactory(role="auditor")
        other_user = UserFactory(role="audit_manager")
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "Forced Generator",
            "generated_by": str(other_user.pk),
        }
        s = AuditReportSerializer(data=data, context={"request": _make_request(user)})
        s.is_valid(raise_exception=True)
        report = s.save()
        # generated_by must be the context user, not other_user
        assert report.generated_by == user


@pytest.mark.django_db
class TestAuditReportListSerializer:
    def test_lightweight_fields(self):
        report = AuditReportFactory()
        data = AuditReportListSerializer(report).data
        assert "id" in data
        assert "title" in data
        assert "status" in data
        assert "engagement_name" in data
        assert "generated_by_name" in data

    def test_does_not_include_full_content(self):
        report = AuditReportFactory(content="Very long content...")
        data = AuditReportListSerializer(report).data
        assert "content" not in data

    def test_engagement_name_populated(self):
        engagement = AuditEngagementFactory(name="Payroll Audit 2026")
        report = AuditReportFactory(engagement=engagement)
        data = AuditReportListSerializer(report).data
        assert data["engagement_name"] == "Payroll Audit 2026"
