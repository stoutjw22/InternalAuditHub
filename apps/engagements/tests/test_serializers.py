"""
Serializer tests for the engagements app:
  AuditEngagementSerializer, AuditEngagementListSerializer,
  EngagementAuditorSerializer, AuditTaskSerializer.
"""
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.engagements.serializers import (
    AuditEngagementListSerializer,
    AuditEngagementSerializer,
    AuditTaskSerializer,
    EngagementAuditorSerializer,
)

from conftest import (
    AuditEngagementFactory,
    AuditTaskFactory,
    EngagementAuditorFactory,
    UserFactory,
)


def _make_request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    drf_request = Request(req)
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestAuditEngagementSerializer:
    def test_serializes_existing(self):
        engagement = AuditEngagementFactory(name="Annual IT Audit")
        data = AuditEngagementSerializer(engagement).data
        assert str(engagement.pk) == data["id"]
        assert data["name"] == "Annual IT Audit"
        assert "assigned_auditors" in data
        assert "status_display" in data

    def test_create_valid(self):
        user = UserFactory(role="audit_manager")
        manager = UserFactory(role="audit_manager")
        data = {
            "name": "Vendor Risk Audit",
            "audit_manager": str(manager.pk),
            "status": "planning",
        }
        s = AuditEngagementSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        engagement = s.save()
        assert engagement.name == "Vendor Risk Audit"
        assert engagement.created_by == user

    def test_audit_manager_required(self):
        user = UserFactory(role="audit_manager")
        data = {"name": "Missing Manager"}
        s = AuditEngagementSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "audit_manager" in s.errors

    def test_name_required(self):
        user = UserFactory(role="audit_manager")
        manager = UserFactory(role="audit_manager")
        data = {"audit_manager": str(manager.pk)}
        s = AuditEngagementSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "name" in s.errors

    def test_status_display_populated(self):
        engagement = AuditEngagementFactory(status="in_progress")
        data = AuditEngagementSerializer(engagement).data
        assert data["status_display"] == "In Progress"


@pytest.mark.django_db
class TestAuditEngagementListSerializer:
    def test_lightweight_fields(self):
        engagement = AuditEngagementFactory()
        data = AuditEngagementListSerializer(engagement).data
        assert "id" in data
        assert "name" in data
        assert "status" in data
        assert "audit_manager_name" in data

    def test_audit_manager_name_populated(self):
        manager = UserFactory(first_name="John", last_name="Manager", role="audit_manager")
        engagement = AuditEngagementFactory(audit_manager=manager)
        data = AuditEngagementListSerializer(engagement).data
        assert "John" in data["audit_manager_name"]

    def test_does_not_include_assigned_auditors(self):
        engagement = AuditEngagementFactory()
        data = AuditEngagementListSerializer(engagement).data
        assert "assigned_auditors" not in data


@pytest.mark.django_db
class TestEngagementAuditorSerializer:
    def test_serializes_existing(self):
        ea = EngagementAuditorFactory()
        data = EngagementAuditorSerializer(ea).data
        assert str(ea.pk) == data["id"]
        assert "auditor_detail" in data

    def test_create_valid(self):
        engagement = AuditEngagementFactory()
        auditor = UserFactory(role="auditor")
        data = {
            "engagement": str(engagement.pk),
            "auditor": str(auditor.pk),
            "role_key": "RoleKey0",
        }
        s = EngagementAuditorSerializer(data=data)
        assert s.is_valid(), s.errors
        ea = s.save()
        assert ea.auditor == auditor


@pytest.mark.django_db
class TestAuditTaskSerializer:
    def test_serializes_existing(self):
        task = AuditTaskFactory(name="Walkthrough Interview")
        data = AuditTaskSerializer(task).data
        assert str(task.pk) == data["id"]
        assert data["name"] == "Walkthrough Interview"
        assert "status_display" in data
        assert "priority_display" in data

    def test_create_valid(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "name": "Document Evidence",
            "status": "todo",
            "priority": "high",
        }
        s = AuditTaskSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        task = s.save()
        assert task.name == "Document Evidence"
        assert task.created_by == user

    def test_name_required(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        s = AuditTaskSerializer(
            data={"engagement": str(engagement.pk)},
            context={"request": _make_request(user)},
        )
        assert not s.is_valid()
        assert "name" in s.errors

    def test_priority_display(self):
        task = AuditTaskFactory(priority="critical")
        data = AuditTaskSerializer(task).data
        assert data["priority_display"] == "Critical"
