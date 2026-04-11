"""
Serializer tests for the core app:
  BusinessProcessSerializer, BusinessObjectiveSerializer, AuditLogSerializer.
"""
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.core.serializers import (
    AuditLogSerializer,
    BusinessObjectiveSerializer,
    BusinessProcessSerializer,
)

from conftest import (
    BusinessObjectiveFactory,
    BusinessProcessFactory,
    UserFactory,
)


def _make_request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    drf_request = Request(req)
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestBusinessProcessSerializer:
    def test_serializes_existing(self):
        bp = BusinessProcessFactory(name="Finance Process")
        data = BusinessProcessSerializer(bp).data
        assert str(bp.pk) == data["id"]
        assert data["name"] == "Finance Process"
        assert data["is_active"] is True

    def test_create_valid(self):
        user = UserFactory(role="audit_manager")
        data = {"name": "New Process", "description": "Describes the new process."}
        s = BusinessProcessSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        bp = s.save(created_by=user)
        assert bp.name == "New Process"

    def test_name_is_required(self):
        user = UserFactory(role="audit_manager")
        s = BusinessProcessSerializer(data={}, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "name" in s.errors


@pytest.mark.django_db
class TestBusinessObjectiveSerializer:
    def test_serializes_existing(self):
        obj = BusinessObjectiveFactory(name="Reduce Costs")
        data = BusinessObjectiveSerializer(obj).data
        assert str(obj.pk) == data["id"]
        assert data["name"] == "Reduce Costs"

    def test_owner_name_field(self):
        user = UserFactory(first_name="Alice", last_name="Brown")
        obj = BusinessObjectiveFactory(owner=user)
        data = BusinessObjectiveSerializer(obj).data
        assert "owner_name" in data
        assert "Alice" in data["owner_name"]

    def test_owner_name_blank_when_no_owner(self):
        obj = BusinessObjectiveFactory(owner=None)
        data = BusinessObjectiveSerializer(obj).data
        assert data["owner_name"] == ""

    def test_create_valid(self):
        user = UserFactory(role="audit_manager")
        bp = BusinessProcessFactory()
        data = {"name": "New Objective", "business_process": str(bp.pk)}
        s = BusinessObjectiveSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        obj = s.save(created_by=user)
        assert obj.name == "New Objective"
        assert obj.business_process == bp

    def test_name_required(self):
        user = UserFactory(role="audit_manager")
        s = BusinessObjectiveSerializer(data={}, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "name" in s.errors


@pytest.mark.django_db
class TestAuditLogSerializer:
    def test_serializes_audit_log(self):
        from apps.core.models import AuditLog

        user = UserFactory(email="logger@example.com")
        log = AuditLog.objects.create(
            user=user,
            action="create",
            entity_type="risk",
            entity_id="test-id",
        )
        data = AuditLogSerializer(log).data
        assert str(log.pk) == data["id"]
        assert data["action"] == "create"
        assert "user_email" in data
        assert data["user_email"] == "logger@example.com"

    def test_user_fields_blank_when_no_user(self):
        from apps.core.models import AuditLog

        log = AuditLog.objects.create(action="login", entity_type="user")
        data = AuditLogSerializer(log).data
        assert data["user_email"] == ""
        assert data["user_name"] == ""
