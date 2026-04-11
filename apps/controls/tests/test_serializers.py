"""
Serializer tests for the controls app: ControlSerializer, EngagementControlSerializer.
"""
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.controls.serializers import ControlSerializer, EngagementControlSerializer

from conftest import (
    AuditEngagementFactory,
    ControlFactory,
    EngagementControlFactory,
    RiskFactory,
    UserFactory,
)


def _make_request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    drf_request = Request(req)
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestControlSerializer:
    def test_serializes_existing_control(self):
        control = ControlFactory(name="User Access Review")
        data = ControlSerializer(control).data
        assert str(control.pk) == data["id"]
        assert data["name"] == "User Access Review"
        assert "risk_count" in data

    def test_risk_count_zero_by_default(self):
        control = ControlFactory()
        data = ControlSerializer(control).data
        assert data["risk_count"] == 0

    def test_risk_count_increments(self):
        control = ControlFactory()
        control.risks.add(RiskFactory(), RiskFactory())
        data = ControlSerializer(control).data
        assert data["risk_count"] == 2

    def test_create_valid_control(self):
        user = UserFactory(role="auditor")
        data = {
            "name": "Patch Management Control",
            "control_type": "detective",
            "frequency": "weekly",
            "status": "active",
        }
        s = ControlSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        control = s.save(created_by=user)
        assert control.name == "Patch Management Control"

    def test_name_is_required(self):
        user = UserFactory(role="auditor")
        s = ControlSerializer(data={"control_type": "preventive"}, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "name" in s.errors

    def test_invalid_control_type_rejected(self):
        user = UserFactory(role="auditor")
        data = {"name": "Bad Control", "control_type": "nonexistent"}
        s = ControlSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "control_type" in s.errors


@pytest.mark.django_db
class TestEngagementControlSerializer:
    def test_serializes_existing_engagement_control(self):
        ec = EngagementControlFactory()
        data = EngagementControlSerializer(ec).data
        assert str(ec.pk) == data["id"]
        assert "control_detail" in data
        assert data["test_result"] == "not_tested"

    def test_create_valid_engagement_control(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        control = ControlFactory()
        data = {
            "engagement": str(engagement.pk),
            "control": str(control.pk),
            "test_result": "pass",
            "effectiveness_rating": "effective",
        }
        s = EngagementControlSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        ec = s.save(created_by=user)
        assert ec.test_result == "pass"
        assert ec.effectiveness_rating == "effective"

    def test_engagement_required(self):
        user = UserFactory(role="auditor")
        control = ControlFactory()
        data = {"control": str(control.pk)}
        s = EngagementControlSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "engagement" in s.errors

    def test_control_required(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        data = {"engagement": str(engagement.pk)}
        s = EngagementControlSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "control" in s.errors
