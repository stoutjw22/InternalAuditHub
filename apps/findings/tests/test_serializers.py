"""
Serializer tests for the findings app:
  FindingSerializer, FindingListSerializer, RemediationActionSerializer,
  EvidenceSerializer, ApprovalRequestSerializer.

Covers: read serialization, create via serializer, validation errors,
read-only fields, and computed/method fields.
"""
import pytest
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.findings.serializers import (
    ApprovalRequestSerializer,
    FindingSerializer,
    FindingListSerializer,
    RemediationActionSerializer,
)

from conftest import (
    AuditEngagementFactory,
    ApprovalRequestFactory,
    FindingFactory,
    RemediationActionFactory,
    UserFactory,
)


def _make_request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    drf_request = Request(req)
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestFindingSerializer:
    def test_serializes_existing_finding(self):
        finding = FindingFactory()
        data = FindingSerializer(finding).data
        assert str(finding.pk) == data["id"]
        assert data["title"] == finding.title
        assert "severity_display" in data
        assert "status_display" in data
        assert "finding_type_display" in data
        assert "remediation_actions" in data
        assert "evidence_files" in data

    def test_create_valid_finding(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "Access Control Weakness",
            "description": "Users have excessive privileges.",
            "severity": "high",
        }
        s = FindingSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        finding = s.save(created_by=user)
        assert finding.title == "Access Control Weakness"
        assert finding.created_by == user

    def test_identified_by_defaults_to_request_user(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        data = {
            "engagement": str(engagement.pk),
            "title": "Missing Logging",
            "description": "System logs are not retained.",
            "severity": "medium",
        }
        s = FindingSerializer(data=data, context={"request": _make_request(user)})
        s.is_valid(raise_exception=True)
        finding = s.save(created_by=user)
        assert finding.identified_by == user

    def test_title_is_required(self):
        user = UserFactory(role="auditor")
        engagement = AuditEngagementFactory()
        data = {"engagement": str(engagement.pk), "description": "desc", "severity": "low"}
        s = FindingSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "title" in s.errors

    def test_engagement_is_required(self):
        user = UserFactory(role="auditor")
        data = {"title": "Finding", "description": "desc", "severity": "low"}
        s = FindingSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "engagement" in s.errors

    def test_severity_display_field(self):
        finding = FindingFactory(severity="critical")
        data = FindingSerializer(finding).data
        assert data["severity_display"] == "Critical"


@pytest.mark.django_db
class TestFindingListSerializer:
    def test_lightweight_fields_present(self):
        finding = FindingFactory(severity="high", status="open")
        data = FindingListSerializer(finding).data
        assert "title" in data
        assert "severity" in data
        assert "status" in data
        assert "severity_display" in data

    def test_does_not_include_remediation_actions(self):
        finding = FindingFactory()
        data = FindingListSerializer(finding).data
        assert "remediation_actions" not in data

    def test_owner_name_blank_when_no_owner(self):
        finding = FindingFactory(owner=None)
        data = FindingListSerializer(finding).data
        assert data["owner_name"] == ""

    def test_owner_name_populated(self):
        user = UserFactory(first_name="Jane", last_name="Doe")
        finding = FindingFactory(owner=user)
        data = FindingListSerializer(finding).data
        assert "Jane" in data["owner_name"]


@pytest.mark.django_db
class TestRemediationActionSerializer:
    def test_serializes_existing_action(self):
        action = RemediationActionFactory()
        data = RemediationActionSerializer(action).data
        assert str(action.pk) == data["id"]
        assert data["status"] == "open"
        assert "status_display" in data
        assert "finding_title" in data

    def test_finding_title_populated(self):
        finding = FindingFactory(title="Password Policy Gap")
        action = RemediationActionFactory(finding=finding)
        data = RemediationActionSerializer(action).data
        assert data["finding_title"] == "Password Policy Gap"

    def test_create_valid_action(self):
        user = UserFactory(role="auditor")
        finding = FindingFactory()
        data = {
            "finding": str(finding.pk),
            "description": "Implement multi-factor authentication.",
            "status": "open",
        }
        s = RemediationActionSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        action = s.save(created_by=user)
        assert action.description.startswith("Implement")

    def test_description_is_required(self):
        user = UserFactory(role="auditor")
        finding = FindingFactory()
        data = {"finding": str(finding.pk), "status": "open"}
        s = RemediationActionSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "description" in s.errors


@pytest.mark.django_db
class TestApprovalRequestSerializer:
    def test_serializes_existing_approval(self):
        approval = ApprovalRequestFactory()
        data = ApprovalRequestSerializer(approval).data
        assert str(approval.pk) == data["id"]
        assert data["status"] == "pending"
        assert "status_display" in data
        assert "requested_by_detail" in data
        assert "approver_detail" in data

    def test_requested_by_auto_set_from_context(self):
        user = UserFactory(role="auditor")
        approver = UserFactory(role="audit_manager")
        import uuid as uuid_mod

        data = {
            "entity_type": "finding",
            "entity_id": str(uuid_mod.uuid4()),
            "entity_name": "Test Finding",
            "approver": str(approver.pk),
        }
        s = ApprovalRequestSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        approval = s.save()
        assert approval.requested_by == user

    def test_entity_type_required(self):
        user = UserFactory(role="auditor")
        import uuid as uuid_mod

        approver = UserFactory(role="audit_manager")
        data = {
            "entity_id": str(uuid_mod.uuid4()),
            "entity_name": "X",
            "approver": str(approver.pk),
        }
        s = ApprovalRequestSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "entity_type" in s.errors
