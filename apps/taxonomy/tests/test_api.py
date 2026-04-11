"""
API tests for the taxonomy app.

Endpoints covered:
  GET/POST        /api/v1/risk-categories/
  GET/PUT/PATCH/DELETE  /api/v1/risk-categories/<pk>/
  GET/POST        /api/v1/risk-subcategories/
  GET/PUT/PATCH/DELETE  /api/v1/risk-subcategories/<pk>/
  GET/POST        /api/v1/risk-scoring-configs/
  GET/PUT/PATCH/DELETE  /api/v1/risk-scoring-configs/<pk>/

Permission matrix:
  List:   AuditorOrAbove
  Create: AuditManagerOrAbove
  Update: AuditManagerOrAbove
  Delete: AuditManagerOrAbove
"""
import pytest

from conftest import (
    RiskCategoryFactory,
    RiskScoringConfigFactory,
    RiskSubcategoryFactory,
)

CATEGORIES_URL = "/api/v1/risk-categories/"
SUBCATEGORIES_URL = "/api/v1/risk-subcategories/"
SCORING_CONFIGS_URL = "/api/v1/risk-scoring-configs/"


# ── /api/v1/risk-categories/ ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestRiskCategoryListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(CATEGORIES_URL)
        assert resp.status_code == 401

    def test_read_only_cannot_list(self, read_only_client):
        resp = read_only_client.get(CATEGORIES_URL)
        assert resp.status_code == 403

    def test_auditor_can_list(self, auditor_client):
        RiskCategoryFactory()
        resp = auditor_client.get(CATEGORIES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_list_has_pagination(self, auditor_client):
        resp = auditor_client.get(CATEGORIES_URL)
        assert "results" in resp.data
        assert "count" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(CATEGORIES_URL, {"name": "New Cat"})
        assert resp.status_code == 403

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            CATEGORIES_URL,
            {"name": "Operational Risk", "description": "Ops risks"},
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Operational Risk"

    def test_create_includes_subcategory_count(self, manager_client):
        resp = manager_client.post(CATEGORIES_URL, {"name": "Financial"})
        assert resp.status_code == 201
        assert "subcategory_count" in resp.data
        assert resp.data["subcategory_count"] == 0

    def test_create_duplicate_name_returns_400(self, manager_client):
        RiskCategoryFactory(name="UniqueX")
        resp = manager_client.post(CATEGORIES_URL, {"name": "UniqueX"})
        assert resp.status_code == 400

    def test_filter_by_is_active(self, auditor_client):
        RiskCategoryFactory(is_active=True)
        RiskCategoryFactory(is_active=False)
        resp = auditor_client.get(f"{CATEGORIES_URL}?is_active=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_active"] is True


@pytest.mark.django_db
class TestRiskCategoryDetail:
    def test_retrieve(self, auditor_client):
        cat = RiskCategoryFactory(name="Tech Risk")
        resp = auditor_client.get(f"{CATEGORIES_URL}{cat.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Tech Risk"

    def test_auditor_cannot_update(self, auditor_client):
        cat = RiskCategoryFactory()
        resp = auditor_client.patch(f"{CATEGORIES_URL}{cat.pk}/", {"name": "X"})
        assert resp.status_code == 403

    def test_manager_can_update(self, manager_client):
        cat = RiskCategoryFactory(name="Old")
        resp = manager_client.patch(f"{CATEGORIES_URL}{cat.pk}/", {"name": "New"})
        assert resp.status_code == 200
        assert resp.data["name"] == "New"

    def test_manager_can_delete(self, manager_client):
        cat = RiskCategoryFactory()
        resp = manager_client.delete(f"{CATEGORIES_URL}{cat.pk}/")
        assert resp.status_code == 204

    def test_not_found_returns_404(self, auditor_client):
        import uuid
        resp = auditor_client.get(f"{CATEGORIES_URL}{uuid.uuid4()}/")
        assert resp.status_code == 404


# ── /api/v1/risk-subcategories/ ───────────────────────────────────────────────

@pytest.mark.django_db
class TestRiskSubcategoryListCreate:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(SUBCATEGORIES_URL)
        assert resp.status_code == 401

    def test_auditor_can_list(self, auditor_client):
        RiskSubcategoryFactory()
        resp = auditor_client.get(SUBCATEGORIES_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        cat = RiskCategoryFactory()
        resp = manager_client.post(
            SUBCATEGORIES_URL,
            {"category": str(cat.pk), "name": "Payment Fraud"},
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Payment Fraud"
        assert "category_name" in resp.data

    def test_auditor_cannot_create(self, auditor_client):
        cat = RiskCategoryFactory()
        resp = auditor_client.post(
            SUBCATEGORIES_URL,
            {"category": str(cat.pk), "name": "X"},
        )
        assert resp.status_code == 403

    def test_filter_by_category(self, auditor_client):
        cat1 = RiskCategoryFactory()
        cat2 = RiskCategoryFactory()
        RiskSubcategoryFactory(category=cat1)
        RiskSubcategoryFactory(category=cat2)
        resp = auditor_client.get(f"{SUBCATEGORIES_URL}?category={cat1.pk}")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["category"] == str(cat1.pk)


@pytest.mark.django_db
class TestRiskSubcategoryDetail:
    def test_retrieve(self, auditor_client):
        sub = RiskSubcategoryFactory(name="Credit Risk")
        resp = auditor_client.get(f"{SUBCATEGORIES_URL}{sub.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Credit Risk"

    def test_manager_can_delete(self, manager_client):
        sub = RiskSubcategoryFactory()
        resp = manager_client.delete(f"{SUBCATEGORIES_URL}{sub.pk}/")
        assert resp.status_code == 204


# ── /api/v1/risk-scoring-configs/ ─────────────────────────────────────────────

@pytest.mark.django_db
class TestRiskScoringConfigListCreate:
    def test_auditor_can_list(self, auditor_client):
        RiskScoringConfigFactory()
        resp = auditor_client.get(SCORING_CONFIGS_URL)
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_manager_can_create(self, manager_client):
        resp = manager_client.post(
            SCORING_CONFIGS_URL,
            {
                "name": "3x3 Matrix",
                "scoring_method": "multiplicative",
                "likelihood_scale": 3,
                "impact_scale": 3,
                "critical_threshold": 9,
                "high_threshold": 6,
                "medium_threshold": 3,
            },
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "3x3 Matrix"
        assert "scoring_method_display" in resp.data

    def test_filter_by_is_default(self, auditor_client):
        RiskScoringConfigFactory(is_default=True)
        RiskScoringConfigFactory(is_default=False)
        resp = auditor_client.get(f"{SCORING_CONFIGS_URL}?is_default=True")
        assert resp.status_code == 200
        for item in resp.data["results"]:
            assert item["is_default"] is True

    def test_auditor_cannot_create(self, auditor_client):
        resp = auditor_client.post(SCORING_CONFIGS_URL, {"name": "X"})
        assert resp.status_code == 403


@pytest.mark.django_db
class TestRiskScoringConfigDetail:
    def test_retrieve(self, auditor_client):
        config = RiskScoringConfigFactory(name="5x5 Config")
        resp = auditor_client.get(f"{SCORING_CONFIGS_URL}{config.pk}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "5x5 Config"

    def test_manager_can_update_thresholds(self, manager_client):
        config = RiskScoringConfigFactory()
        resp = manager_client.patch(
            f"{SCORING_CONFIGS_URL}{config.pk}/",
            {"critical_threshold": 25},
        )
        assert resp.status_code == 200
        assert resp.data["critical_threshold"] == 25

    def test_manager_can_delete(self, manager_client):
        config = RiskScoringConfigFactory()
        resp = manager_client.delete(f"{SCORING_CONFIGS_URL}{config.pk}/")
        assert resp.status_code == 204
