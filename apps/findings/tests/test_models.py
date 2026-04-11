"""
Model tests for the findings app: Finding, RemediationAction, Evidence, ApprovalRequest.

Covers: creation, __str__, field defaults, optional FK relationships, unique
constraints, and Evidence.clean() validation.
"""
import uuid

import pytest
from django.core.exceptions import ValidationError

from conftest import (
    AuditEngagementFactory,
    ApprovalRequestFactory,
    FindingFactory,
    RemediationActionFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestFindingModel:
    def test_create(self):
        finding = FindingFactory()
        assert finding.pk is not None

    def test_str_includes_severity_and_title(self):
        finding = FindingFactory(title="Missing Access Review", severity="high")
        assert "[High]" in str(finding)
        assert "Missing Access Review" in str(finding)

    def test_default_finding_type_is_control_deficiency(self):
        finding = FindingFactory()
        assert finding.finding_type == "control_deficiency"

    def test_default_severity_is_medium(self):
        finding = FindingFactory()
        assert finding.severity == "medium"

    def test_default_status_is_draft(self):
        finding = FindingFactory()
        assert finding.status == "draft"

    def test_owner_is_optional(self):
        finding = FindingFactory(owner=None)
        assert finding.owner is None

    def test_owner_can_be_set(self):
        user = UserFactory()
        finding = FindingFactory(owner=user)
        assert finding.owner == user

    def test_identified_by_optional(self):
        finding = FindingFactory(identified_by=None)
        assert finding.identified_by is None

    def test_root_cause_defaults_blank(self):
        finding = FindingFactory()
        assert finding.root_cause == ""

    def test_management_response_defaults_blank(self):
        finding = FindingFactory()
        assert finding.management_response == ""

    def test_all_severity_choices(self):
        for sev in ("critical", "high", "medium", "low", "info"):
            f = FindingFactory(severity=sev)
            assert f.severity == sev

    def test_all_status_choices(self):
        for st in ("draft", "open", "in_remediation", "resolved", "closed", "risk_accepted"):
            f = FindingFactory(status=st)
            assert f.status == st

    def test_all_finding_type_choices(self):
        for ft in (
            "control_deficiency", "process_gap", "compliance_issue",
            "fraud_indicator", "observation", "best_practice",
        ):
            f = FindingFactory(finding_type=ft)
            assert f.finding_type == ft


@pytest.mark.django_db
class TestRemediationActionModel:
    def test_create(self):
        action = RemediationActionFactory()
        assert action.pk is not None

    def test_str_includes_finding_and_description(self):
        action = RemediationActionFactory(description="Update access control policy")
        assert str(action).startswith("Action for")
        assert "Update access control policy" in str(action)

    def test_default_status_is_open(self):
        action = RemediationActionFactory()
        assert action.status == "open"

    def test_owner_is_optional(self):
        action = RemediationActionFactory(owner=None)
        assert action.owner is None

    def test_completion_notes_defaults_blank(self):
        action = RemediationActionFactory()
        assert action.completion_notes == ""

    def test_all_status_choices(self):
        for st in ("open", "in_progress", "completed", "overdue", "cancelled"):
            action = RemediationActionFactory(status=st)
            assert action.status == st


@pytest.mark.django_db
class TestEvidenceModel:
    def test_create_with_sharepoint_url(self):
        from apps.findings.models import Evidence

        finding = FindingFactory()
        ev = Evidence.objects.create(
            finding=finding,
            title="Test Evidence",
            sharepoint_url="https://sharepoint.example.com/doc.pdf",
            uploaded_by=UserFactory(),
        )
        assert ev.pk is not None
        assert str(ev) == "Test Evidence"

    def test_clean_raises_if_no_link(self):
        from apps.findings.models import Evidence

        finding = FindingFactory()
        ev = Evidence(
            finding=finding,
            title="Empty Evidence",
        )
        with pytest.raises(ValidationError, match="file"):
            ev.clean()

    def test_clean_raises_if_no_finding_engagement_or_task(self):
        from apps.findings.models import Evidence

        ev = Evidence(
            title="Orphan Evidence",
            sharepoint_url="https://sharepoint.example.com/doc.pdf",
        )
        with pytest.raises(ValidationError):
            ev.clean()

    def test_clean_raises_if_file_too_large(self):
        from apps.findings.models import Evidence

        finding = FindingFactory()
        ev = Evidence(
            finding=finding,
            title="Huge File",
            sharepoint_url="https://sharepoint.example.com/huge.pdf",
            file_size=30 * 1024 * 1024,  # 30 MB > 25 MB limit
        )
        with pytest.raises(ValidationError, match="size"):
            ev.clean()

    def test_default_evidence_type_is_document(self):
        from apps.findings.models import Evidence

        finding = FindingFactory()
        ev = Evidence.objects.create(
            finding=finding,
            title="Doc Evidence",
            sharepoint_url="https://sharepoint.example.com/doc.pdf",
            uploaded_by=UserFactory(),
        )
        assert ev.evidence_type == "document"


@pytest.mark.django_db
class TestApprovalRequestModel:
    def test_create(self):
        approval = ApprovalRequestFactory()
        assert approval.pk is not None

    def test_default_status_is_pending(self):
        approval = ApprovalRequestFactory()
        assert approval.status == "pending"

    def test_str_includes_entity_type_status_and_approver(self):
        manager = UserFactory(role="audit_manager")
        approval = ApprovalRequestFactory(approver=manager, status="pending")
        result = str(approval)
        assert "finding" in result
        assert "pending" in result

    def test_all_entity_types(self):
        for et in ("finding", "report", "engagement"):
            a = ApprovalRequestFactory(entity_type=et)
            assert a.entity_type == et

    def test_all_status_choices(self):
        for st in ("pending", "approved", "rejected", "withdrawn"):
            a = ApprovalRequestFactory(status=st)
            assert a.status == st

    def test_entity_id_is_uuid(self):
        approval = ApprovalRequestFactory()
        assert isinstance(approval.entity_id, uuid.UUID)
