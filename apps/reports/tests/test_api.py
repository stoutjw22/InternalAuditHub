"""
API tests for the reports app.

Endpoints covered:
  GET/POST  /api/v1/report-templates/
  GET/PATCH/DELETE  /api/v1/report-templates/<pk>/
  GET/POST  /api/v1/reports/
  GET/PATCH/DELETE  /api/v1/reports/<pk>/
  POST  /api/v1/reports/<pk>/finalize/
  GET   /api/v1/engagements/<pk>/reports/

Permission notes:
  Templates: list=AuditorOrAbove, create/update/delete=AuditManagerOrAbove
  Reports:   list/create/update=AuditorOrAbove, delete=AuditManagerOrAbove
  Finalize:  AuditManagerOrAbove only
"""
import pytest

from conftest import (
    AuditEngagementFactory,
    AuditReportFactory,
    AuditReportTemplateFactory,
    UserFactory,
)

TEMPLATES_URL = "/api/v1/report-templates/"
REPORTS_URL = "/api/v1/reports/"


# ── /api/v1/report-templates/ ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestReportTemplateListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(TEMPLATES_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        AuditReportTemplateFactory()
        resp = auditor_client.get(TEMPLATES_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(TEMPLATES_URL)
        assert resp.status_code == 403

    def test_manager_can_create(self, manager_client):
        data = {
            "name": "Standard Controls Template",
            "content_template": "# {{engagement_name}}\n\n## Findings\n\n{{findings_summary}}",
        }
        resp = manager_client.post(TEMPLATES_URL, data)
        assert resp.status_code == 201
        assert resp.data["name"] == "Standard Controls Template"

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(TEMPLATES_URL, {"name": "X", "content_template": "body"})
        assert resp.status_code == 403

    def test_create_missing_name_returns_400(self, manager_client):
        resp = manager_client.post(TEMPLATES_URL, {"content_template": "body"})
        assert resp.status_code == 400


@pytest.mark.django_db
class TestReportTemplateDetail:
    def test_retrieve_by_manager(self, manager_client):
        """Detail view requires IsAuditManagerOrAbove (not just auditor)."""
        tmpl = AuditReportTemplateFactory(name="My Template")
        resp = manager_client.get(f"{TEMPLATES_URL}{tmpl.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "My Template"

    def test_retrieve_by_auditor_gets_403(self, auditor_client):
        tmpl = AuditReportTemplateFactory()
        resp = auditor_client.get(f"{TEMPLATES_URL}{tmpl.pk}/")
        assert resp.status_code == 403

    def test_update_by_manager(self, manager_client):
        tmpl = AuditReportTemplateFactory(is_active=True)
        resp = manager_client.patch(f"{TEMPLATES_URL}{tmpl.pk}/", {"is_active": False})
        assert resp.status_code == 200
        assert resp.data["is_active"] is False

    def test_auditor_cannot_update(self, auditor_client):
        tmpl = AuditReportTemplateFactory()
        resp = auditor_client.patch(f"{TEMPLATES_URL}{tmpl.pk}/", {"name": "X"})
        assert resp.status_code == 403

    def test_delete_by_manager(self, manager_client):
        tmpl = AuditReportTemplateFactory()
        resp = manager_client.delete(f"{TEMPLATES_URL}{tmpl.pk}/")
        assert resp.status_code == 204

    def test_auditor_cannot_delete(self, auditor_client):
        tmpl = AuditReportTemplateFactory()
        resp = auditor_client.delete(f"{TEMPLATES_URL}{tmpl.pk}/")
        assert resp.status_code == 403


# ── /api/v1/reports/ ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestReportListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(REPORTS_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(REPORTS_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        AuditReportFactory()
        resp = auditor_client.get(REPORTS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_auditor_can_create(self, auditor_client):
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "IT General Controls Report",
            "executive_summary": "No critical findings.",
        }
        resp = auditor_client.post(REPORTS_URL, data)
        assert resp.status_code == 201
        assert resp.data["title"] == "IT General Controls Report"

    def test_read_only_cannot_create(self, read_only_client):
        engagement = AuditEngagementFactory()
        resp = read_only_client.post(
            REPORTS_URL,
            {"engagement": str(engagement.pk), "title": "X"},
        )
        assert resp.status_code == 403

    def test_filter_by_status(self, auditor_client):
        AuditReportFactory(status="draft")
        AuditReportFactory(status="final")
        resp = auditor_client.get(f"{REPORTS_URL}?status=draft")
        assert resp.status_code == 200
        for r in resp.data["results"]:
            assert r["status"] == "draft"

    def test_filter_by_engagement(self, auditor_client):
        report = AuditReportFactory()
        AuditReportFactory()
        resp = auditor_client.get(f"{REPORTS_URL}?engagement={report.engagement.pk}")
        assert resp.status_code == 200
        assert resp.data["count"] == 1


@pytest.mark.django_db
class TestReportDetail:
    def test_retrieve_by_auditor(self, auditor_client):
        report = AuditReportFactory(title="Detailed Report")
        resp = auditor_client.get(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 200
        assert resp.data["title"] == "Detailed Report"

    def test_update_by_auditor(self, auditor_client):
        report = AuditReportFactory(status="draft")
        resp = auditor_client.patch(
            f"{REPORTS_URL}{report.pk}/",
            {"status": "pending_review"},
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "pending_review"

    def test_delete_requires_manager(self, auditor_client, manager_client):
        report = AuditReportFactory()
        resp = auditor_client.delete(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 403
        resp = manager_client.delete(f"{REPORTS_URL}{report.pk}/")
        assert resp.status_code == 204


# ── /api/v1/reports/<pk>/finalize/ ────────────────────────────────────────────

@pytest.mark.django_db
class TestFinalizeReport:
    def test_manager_can_finalize(self, manager_client, manager_user):
        report = AuditReportFactory(status="pending_review")
        resp = manager_client.post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 200
        assert resp.data["status"] == "final"
        assert resp.data["finalized_by"] is not None

    def test_auditor_cannot_finalize(self, auditor_client):
        report = AuditReportFactory(status="pending_review")
        resp = auditor_client.post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 403

    def test_already_final_returns_400(self, manager_client):
        report = AuditReportFactory(status="final")
        resp = manager_client.post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 400

    def test_unauthenticated_gets_401(self, api_client):
        report = AuditReportFactory()
        resp = api_client.post(f"{REPORTS_URL}{report.pk}/finalize/")
        assert resp.status_code == 401


# ── /api/v1/engagements/<pk>/reports/ (nested) ────────────────────────────────

@pytest.mark.django_db
class TestReportNested:
    def test_list_scoped_to_engagement(self, auditor_client):
        report = AuditReportFactory()
        AuditReportFactory()  # different engagement
        url = f"/api/v1/engagements/{report.engagement.pk}/reports/"
        resp = auditor_client.get(url)
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert str(item["engagement"]) == str(report.engagement.pk)

    def test_create_via_nested_route(self, auditor_client):
        engagement = AuditEngagementFactory()
        url = f"/api/v1/engagements/{engagement.pk}/reports/"
        data = {
            "engagement": str(engagement.pk),  # serializer requires it in body
            "title": "Nested Report",
            "executive_summary": "Created via nested route.",
        }
        resp = auditor_client.post(url, data)
        assert resp.status_code == 201
        assert str(resp.data["engagement"]) == str(engagement.pk)
