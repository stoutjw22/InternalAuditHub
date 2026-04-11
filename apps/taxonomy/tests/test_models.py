"""Model tests for the taxonomy app."""
import pytest

from conftest import RiskCategoryFactory, RiskScoringConfigFactory, RiskSubcategoryFactory


@pytest.mark.django_db
class TestRiskCategory:
    def test_str(self):
        cat = RiskCategoryFactory(name="Operational")
        assert str(cat) == "Operational"

    def test_unique_name(self):
        from django.db import IntegrityError

        RiskCategoryFactory(name="Duplicate")
        with pytest.raises(IntegrityError):
            RiskCategoryFactory(name="Duplicate")

    def test_subcategory_count(self):
        cat = RiskCategoryFactory()
        RiskSubcategoryFactory(category=cat)
        RiskSubcategoryFactory(category=cat)
        assert cat.subcategories.count() == 2


@pytest.mark.django_db
class TestRiskSubcategory:
    def test_str(self):
        sub = RiskSubcategoryFactory(name="Fraud")
        assert sub.category.name in str(sub)
        assert "Fraud" in str(sub)

    def test_unique_together_category_name(self):
        from django.db import IntegrityError

        cat = RiskCategoryFactory()
        RiskSubcategoryFactory(category=cat, name="Sub1")
        with pytest.raises(IntegrityError):
            RiskSubcategoryFactory(category=cat, name="Sub1")

    def test_same_name_different_category_allowed(self):
        cat1 = RiskCategoryFactory()
        cat2 = RiskCategoryFactory()
        s1 = RiskSubcategoryFactory(category=cat1, name="Fraud")
        s2 = RiskSubcategoryFactory(category=cat2, name="Fraud")
        assert s1.pk != s2.pk


@pytest.mark.django_db
class TestRiskScoringConfig:
    def test_str_no_default(self):
        config = RiskScoringConfigFactory(name="5x5 Matrix", is_default=False)
        assert str(config) == "5x5 Matrix"

    def test_str_default(self):
        config = RiskScoringConfigFactory(name="Standard", is_default=True)
        assert "[default]" in str(config)

    def test_multiplicative_score(self):
        config = RiskScoringConfigFactory(scoring_method="multiplicative")
        assert config.compute_score(3, 4) == 12

    def test_additive_score(self):
        config = RiskScoringConfigFactory(scoring_method="additive")
        assert config.compute_score(3, 4) == 7

    def test_weighted_score(self):
        config = RiskScoringConfigFactory(
            scoring_method="weighted",
            likelihood_weight="2.00",
            impact_weight="1.00",
        )
        assert config.compute_score(3, 4) == 10.0

    def test_rating_critical(self):
        config = RiskScoringConfigFactory(
            critical_threshold=20,
            high_threshold=12,
            medium_threshold=6,
        )
        assert config.rating_for_score(25) == "Critical"

    def test_rating_high(self):
        config = RiskScoringConfigFactory(
            critical_threshold=20,
            high_threshold=12,
            medium_threshold=6,
        )
        assert config.rating_for_score(15) == "High"

    def test_rating_medium(self):
        config = RiskScoringConfigFactory(
            critical_threshold=20,
            high_threshold=12,
            medium_threshold=6,
        )
        assert config.rating_for_score(8) == "Medium"

    def test_rating_low(self):
        config = RiskScoringConfigFactory(
            critical_threshold=20,
            high_threshold=12,
            medium_threshold=6,
        )
        assert config.rating_for_score(3) == "Low"
