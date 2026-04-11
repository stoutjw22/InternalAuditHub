"""
API tests for the frameworks app.

Endpoints covered:
  GET/POST        /api/v1/citation-sources/
  GET/POST        /api/v1/frameworks/
  GET/PATCH/DELETE  /api/v1/frameworks/<pk>/
  GET/POST        /api/v1/framework-requirements/
  GET/PATCH/DELETE  /api/v1/framework-requirements/<pk>/
  GET/POST        /api/v1/control-objectives/
  GET/POST        /api/v1/control-activities/
  GET/POST        /api/v1/control-requirement-mappings/
  GET/PATCH/DELETE  /api/v1/control-requirement-mappings/<pk>/

Permission matrix:
  List:   AuditorOrAbove
  Create citation-sources/frameworks/requirements: AuditManagerOrAbove
  Create objectives/activities/mappings: AuditorOrAbove
"""
import pytest

from conftest import (
    CitationSourceFactory,
    ControlActivityFactory,
    ControlFactory,
    ControlObjectiveFactory,
    ControlRequirementMappingFactory,
    FrameworkFactory,
    FrameworkRequirementFactory,
)

CITATIONS_URL = "/api/v1/citation-sources/"
FRAMEWORKS_URL = "/api/v1/frameworks/"
REQUIREMENTS_URL = "/api/v1/framework-requirements/"
OBJECTIVES_URL = "/api/v1/control-objectives/"
ACTIVITIES_URL = "/api/v1/control-activities/"
MAPPINGS_URL = "/api/v1/control-requirement-mappings/"


# ── /api/v1/citation-sources/ ─────────────────────────────────────────────────

@pytest.mark.django_db
class TestCitationSourceListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(CITATIONS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        CitationSourceFactory()
        resp = auditor_client.get(CITATIONS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            CITATIONS_URL,
            {"name": "NIST SP 800-53 Rev 5", "source_type": "standard", "publisher": "NIST"},
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "NIST SP 800-53 Rev 5"
        assert "source_type_display" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(CITATIONS_URL, {"name": "X", "source_type": "standard"})
        assert resp.status_code == 403

    def test_filter_by_source_type(self, auditor_client):
        CitationSourceFactory(source_type="regulation")
        CitationSourceFactory(source_type="standard")
        resp = auditor_client.get(f"{CITATIONS_URL}?source_type=regulation")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["source_type"] == "regulation"


# ── /api/v1/frameworks/ ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestFrameworkListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(FRAMEWORKS_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        FrameworkFactory()
        resp = auditor_client.get(FRAMEWORKS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            FRAMEWORKS_URL,
            {
                "name": "SOC 2 Trust Services Criteria",
                "short_name": "SOC2",
                "framework_type": "security",
                "version": "2022",
            },
        )
        assert resp.status_code == 201
        assert resp.data["short_name"] == "SOC2"
        assert "requirement_count" in resp.data
        assert "framework_type_display" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(
            FRAMEWORKS_URL,
            {"name": "ISO", "short_name": "ISO27001", "framework_type": "security"},
        )
        assert resp.status_code == 403

    def test_filter_by_framework_type(self, auditor_client):
        FrameworkFactory(framework_type="security")
        FrameworkFactory(framework_type="privacy")
        resp = auditor_client.get(f"{FRAMEWORKS_URL}?framework_type=security")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["framework_type"] == "security"

    def test_filter_by_is_active(self, auditor_client):
        FrameworkFactory(is_active=True)
        FrameworkFactory(is_active=False)
        resp = auditor_client.get(f"{FRAMEWORKS_URL}?is_active=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_active"] is True


@pytest.mark.django_db
class TestFrameworkDetail:
    def test_retrieve(self, auditor_client):
        fw = FrameworkFactory(short_name="PCI", version="4.0")
        resp = auditor_client.get(f"{FRAMEWORKS_URL}{fw.pk}/")
        assert resp.status_code == 200
        assert resp.data["short_name"] == "PCI"

    def test_manager_can_update(self, manager_client):
        fw = FrameworkFactory(is_active=True)
        resp = manager_client.patch(f"{FRAMEWORKS_URL}{fw.pk}/", {"is_active": False})
        assert resp.status_code == 200
        assert resp.data["is_active"] is False

    def test_auditor_cannot_update(self, auditor_client):
        fw = FrameworkFactory()
        resp = auditor_client.patch(f"{FRAMEWORKS_URL}{fw.pk}/", {"version": "2.0"})
        assert resp.status_code == 403

    def test_manager_can_delete(self, manager_client):
        fw = FrameworkFactory()
        resp = manager_client.delete(f"{FRAMEWORKS_URL}{fw.pk}/")
        assert resp.status_code == 204


# ── /api/v1/framework-requirements/ ──────────────────────────────────────────

@pytest.mark.django_db
class TestFrameworkRequirementListCreate:
    def test_auditor_can_list(self, auditor_client):
        FrameworkRequirementFactory()
        resp = auditor_client.get(REQUIREMENTS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        fw = FrameworkFactory()
        resp = manager_client.post(
            REQUIREMENTS_URL,
            {
                "framework": str(fw.pk),
                "requirement_id": "CC6.1",
                "title": "Logical and Physical Access Controls",
                "requirement_type": "criterion",
            },
        )
        assert resp.status_code == 201
        assert resp.data["requirement_id"] == "CC6.1"
        assert "framework_name" in resp.data
        assert "requirement_type_display" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        fw = FrameworkFactory()
        resp = auditor_client.post(
            REQUIREMENTS_URL,
            {"framework": str(fw.pk), "requirement_id": "X", "title": "Y"},
        )
        assert resp.status_code == 403

    def test_filter_by_framework(self, auditor_client):
        fw1 = FrameworkFactory()
        fw2 = FrameworkFactory()
        FrameworkRequirementFactory(framework=fw1)
        FrameworkRequirementFactory(framework=fw2)
        resp = auditor_client.get(f"{REQUIREMENTS_URL}?framework={fw1.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["framework"] == str(fw1.pk)

    def test_filter_by_requirement_type(self, auditor_client):
        FrameworkRequirementFactory(requirement_type="control")
        FrameworkRequirementFactory(requirement_type="policy")
        resp = auditor_client.get(f"{REQUIREMENTS_URL}?requirement_type=control")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["requirement_type"] == "control"

    def test_filter_by_parent(self, auditor_client):
        fw = FrameworkFactory()
        parent = FrameworkRequirementFactory(framework=fw)
        child = FrameworkRequirementFactory(framework=fw, parent=parent)
        resp = auditor_client.get(f"{REQUIREMENTS_URL}?parent={parent.pk}")
        assert resp.status_code == 200
        ids = [r["id"] for r in resp.data["results"]]
        assert str(child.pk) in ids


@pytest.mark.django_db
class TestFrameworkRequirementDetail:
    def test_retrieve_includes_child_count(self, auditor_client):
        fw = FrameworkFactory()
        parent = FrameworkRequirementFactory(framework=fw)
        FrameworkRequirementFactory(framework=fw, parent=parent)
        resp = auditor_client.get(f"{REQUIREMENTS_URL}{parent.pk}/")
        assert resp.status_code == 200
        assert resp.data["child_count"] == 1

    def test_manager_can_update(self, manager_client):
        req = FrameworkRequirementFactory(is_active=True)
        resp = manager_client.patch(f"{REQUIREMENTS_URL}{req.pk}/", {"is_active": False})
        assert resp.status_code == 200
        assert resp.data["is_active"] is False

    def test_manager_can_delete(self, manager_client):
        req = FrameworkRequirementFactory()
        resp = manager_client.delete(f"{REQUIREMENTS_URL}{req.pk}/")
        assert resp.status_code == 204


# ── /api/v1/control-objectives/ ───────────────────────────────────────────────

@pytest.mark.django_db
class TestControlObjectiveListCreate:
    def test_auditor_can_list(self, auditor_client):
        ControlObjectiveFactory()
        resp = auditor_client.get(OBJECTIVES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        req = FrameworkRequirementFactory()
        resp = auditor_client.post(
            OBJECTIVES_URL,
            {
                "name": "Ensure access is restricted to authorised users",
                "reference_code": "CO-001",
                "framework_requirements": [str(req.pk)],
            },
        )
        assert resp.status_code == 201
        assert resp.data["reference_code"] == "CO-001"
        assert "requirement_count" in resp.data

    def test_filter_by_is_active(self, auditor_client):
        ControlObjectiveFactory(is_active=True)
        ControlObjectiveFactory(is_active=False)
        resp = auditor_client.get(f"{OBJECTIVES_URL}?is_active=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_active"] is True


# ── /api/v1/control-activities/ ───────────────────────────────────────────────

@pytest.mark.django_db
class TestControlActivityListCreate:
    def test_auditor_can_list(self, auditor_client):
        ControlActivityFactory()
        resp = auditor_client.get(ACTIVITIES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        ctrl = ControlFactory()
        obj = ControlObjectiveFactory()
        resp = auditor_client.post(
            ACTIVITIES_URL,
            {
                "name": "Monthly access review",
                "control": str(ctrl.pk),
                "control_objective": str(obj.pk),
                "activity_type": "detective",
                "frequency": "monthly",
            },
        )
        assert resp.status_code == 201
        assert resp.data["activity_type"] == "detective"
        assert "activity_type_display" in resp.data

    def test_filter_by_activity_type(self, auditor_client):
        ControlActivityFactory(activity_type="preventive")
        ControlActivityFactory(activity_type="detective")
        resp = auditor_client.get(f"{ACTIVITIES_URL}?activity_type=preventive")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["activity_type"] == "preventive"


# ── /api/v1/control-requirement-mappings/ ────────────────────────────────────

@pytest.mark.django_db
class TestControlRequirementMappingListCreate:
    def test_auditor_can_list(self, auditor_client):
        ControlRequirementMappingFactory()
        resp = auditor_client.get(MAPPINGS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_auditor_can_create(self, auditor_client):
        ctrl = ControlFactory()
        req = FrameworkRequirementFactory()
        resp = auditor_client.post(
            MAPPINGS_URL,
            {
                "control": str(ctrl.pk),
                "framework_requirement": str(req.pk),
                "mapping_type": "satisfies",
                "notes": "Fully satisfies the requirement.",
            },
        )
        assert resp.status_code == 201
        assert resp.data["mapping_type"] == "satisfies"
        assert "mapping_type_display" in resp.data
        assert "control_name" in resp.data
        assert "requirement_display" in resp.data

    def test_duplicate_mapping_returns_400(self, auditor_client):
        mapping = ControlRequirementMappingFactory()
        resp = auditor_client.post(
            MAPPINGS_URL,
            {
                "control": str(mapping.control.pk),
                "framework_requirement": str(mapping.framework_requirement.pk),
                "mapping_type": "addresses",
            },
        )
        assert resp.status_code == 400

    def test_filter_by_control(self, auditor_client):
        ctrl = ControlFactory()
        ControlRequirementMappingFactory(control=ctrl)
        ControlRequirementMappingFactory()
        resp = auditor_client.get(f"{MAPPINGS_URL}?control={ctrl.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["control"] == str(ctrl.pk)

    def test_filter_by_mapping_type(self, auditor_client):
        ControlRequirementMappingFactory(mapping_type="satisfies")
        ControlRequirementMappingFactory(mapping_type="addresses")
        resp = auditor_client.get(f"{MAPPINGS_URL}?mapping_type=satisfies")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["mapping_type"] == "satisfies"


@pytest.mark.django_db
class TestControlRequirementMappingDetail:
    def test_retrieve(self, auditor_client):
        mapping = ControlRequirementMappingFactory(mapping_type="compensates")
        resp = auditor_client.get(f"{MAPPINGS_URL}{mapping.pk}/")
        assert resp.status_code == 200
        assert resp.data["mapping_type"] == "compensates"

    def test_auditor_can_update(self, auditor_client):
        mapping = ControlRequirementMappingFactory(mapping_type="satisfies")
        resp = auditor_client.patch(
            f"{MAPPINGS_URL}{mapping.pk}/",
            {"mapping_type": "partially_satisfies"},
        )
        assert resp.status_code == 200
        assert resp.data["mapping_type"] == "partially_satisfies"

    def test_auditor_can_delete(self, auditor_client):
        mapping = ControlRequirementMappingFactory()
        resp = auditor_client.delete(f"{MAPPINGS_URL}{mapping.pk}/")
        assert resp.status_code == 204
