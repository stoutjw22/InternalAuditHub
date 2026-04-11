"""
Serializer tests for the risks app: RiskSerializer, EngagementRiskSerializer.

Covers: read serialization, create via serializer, validation errors,
computed read-only fields, and created_by auto-population.
"""
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.risks.serializers import EngagementRiskSerializer, RiskSerializer

from conftest import (
    AuditEngagementFactory,
    EngagementRiskFactory,
    RiskFactory,
    UserFactory,
)


def _make_request(user):
    """Wrap a user in a minimal DRF Request object for serializer context."""
    factory = APIRequestFactory()
    django_request = factory.get("/")
    drf_request = Request(django_request)
    # Bypass DRF authentication — set the user directly on the private attr.
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestRiskSerializer:
    def test_serializes_existing_risk(self):
        risk = RiskFactory(inherent_likelihood=4, inherent_impact=3)
        data = RiskSerializer(risk).data
        assert str(risk.pk) == data["id"]
        assert data["name"] == risk.name
        assert data["category"] == "operational"

    def test_includes_computed_inherent_score(self):
        risk = RiskFactory(inherent_likelihood=4, inherent_impact=5)
        data = RiskSerializer(risk).data
        assert data["inherent_score"] == 20

    def test_includes_risk_rating(self):
        risk = RiskFactory(inherent_likelihood=5, inherent_impact=4)
        assert RiskSerializer(risk).data["risk_rating"] == "Critical"

    def test_includes_category_display(self):
        risk = RiskFactory(category="financial")
        data = RiskSerializer(risk).data
        assert data["category_display"] == "Financial"

    def test_residual_score_is_none_when_unset(self):
        risk = RiskFactory(residual_likelihood=None, residual_impact=None)
        assert RiskSerializer(risk).data["residual_score"] is None

    def test_residual_score_computed_when_set(self):
        risk = RiskFactory(residual_likelihood=2, residual_impact=3)
        assert RiskSerializer(risk).data["residual_score"] == 6

    def test_create_valid_risk(self):
        user = UserFactory(role="auditor")
        data = {
            "name": "Vendor Concentration Risk",
            "category": "financial",
            "inherent_likelihood": 4,
            "inherent_impact": 3,
        }
        serializer = RiskSerializer(data=data, context={"request": _make_request(user)})
        assert serializer.is_valid(), serializer.errors
        risk = serializer.save()
        assert risk.name == "Vendor Concentration Risk"
        assert risk.created_by == user

    def test_created_by_auto_set_from_context(self):
        user = UserFactory(role="auditor")
        data = {"name": "Test Risk", "inherent_likelihood": 2, "inherent_impact": 2}
        serializer = RiskSerializer(data=data, context={"request": _make_request(user)})
        serializer.is_valid(raise_exception=True)
        risk = serializer.save()
        assert risk.created_by == user

    def test_invalid_likelihood_zero_rejected(self):
        user = UserFactory(role="auditor")
        data = {"name": "Bad Risk", "inherent_likelihood": 0, "inherent_impact": 3}
        s = RiskSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "inherent_likelihood" in s.errors

    def test_invalid_likelihood_above_5_rejected(self):
        user = UserFactory(role="auditor")
        data = {"name": "Bad Risk", "inherent_likelihood": 6, "inherent_impact": 3}
        s = RiskSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "inherent_likelihood" in s.errors

    def test_invalid_impact_zero_rejected(self):
        user = UserFactory(role="auditor")
        data = {"name": "Bad Risk", "inherent_likelihood": 3, "inherent_impact": 0}
        s = RiskSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "inherent_impact" in s.errors

    def test_invalid_impact_above_5_rejected(self):
        user = UserFactory(role="auditor")
        data = {"name": "Bad Risk", "inherent_likelihood": 3, "inherent_impact": 6}
        s = RiskSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "inherent_impact" in s.errors

    def test_id_is_read_only(self):
        """POSTing an explicit id must not be honoured."""
        import uuid

        user = UserFactory(role="auditor")
        fixed_id = str(uuid.uuid4())
        data = {
            "id": fixed_id,
            "name": "Risk With Forced ID",
            "inherent_likelihood": 2,
            "inherent_impact": 2,
        }
        s = RiskSerializer(data=data, context={"request": _make_request(user)})
        s.is_valid(raise_exception=True)
        risk = s.save()
        # The auto-generated UUID must differ from the supplied one.
        assert str(risk.pk) != fixed_id

    def test_name_is_required(self):
        user = UserFactory(role="auditor")
        data = {"inherent_likelihood": 3, "inherent_impact": 3}
        s = RiskSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "name" in s.errors


@pytest.mark.django_db
class TestEngagementRiskSerializer:
    def test_serializes_existing_engagement_risk(self):
        er = EngagementRiskFactory()
        data = EngagementRiskSerializer(er).data
        assert str(er.pk) == data["id"]
        assert "risk_detail" in data
        assert data["objective_name"] == ""
        assert data["objective_id"] == ""

    def test_objective_name_populated_when_objective_set(self):
        from conftest import BusinessObjectiveFactory

        obj = BusinessObjectiveFactory(name="Revenue Growth")
        er = EngagementRiskFactory(objective=obj)
        data = EngagementRiskSerializer(er).data
        assert data["objective_name"] == "Revenue Growth"

    def test_create_valid_engagement_risk(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        risk = RiskFactory()
        data = {
            "engagement": str(engagement.pk),
            "risk": str(risk.pk),
            "is_in_scope": True,
        }
        s = EngagementRiskSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        er = s.save(created_by=user)
        assert er.engagement == engagement
        assert er.risk == risk

    def test_engagement_required(self):
        user = UserFactory(role="auditor")
        risk = RiskFactory()
        data = {"risk": str(risk.pk), "is_in_scope": True}
        s = EngagementRiskSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "engagement" in s.errors
