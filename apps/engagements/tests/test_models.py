"""
Model tests for the engagements app: AuditEngagement, EngagementAuditor, AuditTask.
"""
import pytest
from django.db import IntegrityError

from conftest import (
    AuditEngagementFactory,
    AuditTaskFactory,
    EngagementAuditorFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestAuditEngagementModel:
    def test_create(self):
        engagement = AuditEngagementFactory()
        assert engagement.pk is not None

    def test_str_includes_name_and_status(self):
        engagement = AuditEngagementFactory(name="Revenue Audit", status="planning")
        result = str(engagement)
        assert "Revenue Audit" in result
        assert "Planning" in result

    def test_default_status_is_planning(self):
        engagement = AuditEngagementFactory()
        assert engagement.status == "planning"

    def test_audit_manager_is_required(self):
        """AuditEngagement.audit_manager cannot be NULL."""
        from apps.engagements.models import AuditEngagement

        with pytest.raises(Exception):
            AuditEngagement.objects.create(name="No Manager")

    def test_protect_manager_deletion(self):
        """Deleting a user who is audit_manager of an engagement must be blocked."""
        from django.db.models import ProtectedError

        engagement = AuditEngagementFactory()
        with pytest.raises(ProtectedError):
            engagement.audit_manager.delete()

    def test_description_defaults_blank(self):
        from apps.engagements.models import AuditEngagement

        manager = UserFactory(role="audit_manager")
        eng = AuditEngagement.objects.create(name="Minimal", audit_manager=manager)
        assert eng.description == ""

    def test_all_status_choices(self):
        for st in ("planning", "in_progress", "review", "completed", "cancelled"):
            eng = AuditEngagementFactory(status=st)
            assert eng.status == st


@pytest.mark.django_db
class TestEngagementAuditorModel:
    def test_create(self):
        ea = EngagementAuditorFactory()
        assert ea.pk is not None

    def test_str_includes_auditor_and_engagement(self):
        ea = EngagementAuditorFactory()
        result = str(ea)
        assert str(ea.auditor) in result
        assert str(ea.engagement) in result

    def test_default_role_key(self):
        ea = EngagementAuditorFactory()
        assert ea.role_key == "RoleKey1"

    def test_unique_together_engagement_auditor(self):
        ea = EngagementAuditorFactory()
        with pytest.raises(IntegrityError):
            EngagementAuditorFactory(engagement=ea.engagement, auditor=ea.auditor)

    def test_different_auditor_same_engagement_allowed(self):
        ea = EngagementAuditorFactory()
        ea2 = EngagementAuditorFactory(engagement=ea.engagement)
        assert ea2.pk is not None

    def test_same_auditor_different_engagement_allowed(self):
        ea = EngagementAuditorFactory()
        ea2 = EngagementAuditorFactory(auditor=ea.auditor)
        assert ea2.pk is not None


@pytest.mark.django_db
class TestAuditTaskModel:
    def test_create(self):
        task = AuditTaskFactory()
        assert task.pk is not None

    def test_str_includes_name_and_engagement(self):
        task = AuditTaskFactory(name="Prepare Workpapers")
        result = str(task)
        assert "Prepare Workpapers" in result

    def test_default_status_is_todo(self):
        task = AuditTaskFactory()
        assert task.status == "todo"

    def test_default_priority_is_medium(self):
        task = AuditTaskFactory()
        assert task.priority == "medium"

    def test_escalation_flag_defaults_false(self):
        task = AuditTaskFactory()
        assert task.escalation_flag is False

    def test_assigned_to_is_optional(self):
        task = AuditTaskFactory(assigned_to=None)
        assert task.assigned_to is None

    def test_all_status_choices(self):
        for st in ("todo", "in_progress", "review", "done", "blocked"):
            task = AuditTaskFactory(status=st)
            assert task.status == st

    def test_all_priority_choices(self):
        for p in ("low", "medium", "high", "critical"):
            task = AuditTaskFactory(priority=p)
            assert task.priority == p
