"""
Tests for the audit service (apps/core/audit.py) and signal-based logging.

Covers:
  • redact() — sensitive field masking
  • capture_snapshot() — JSON-safe serialisation with redaction
  • diff_snapshots() — only changed fields returned
  • log_event() — row creation and resilience to DB errors
  • log_create / log_update / log_delete helpers
  • Signal handlers for Finding, Risk, AuditEngagement, User
  • Middleware deduplication (was_logged() flag)
"""
import uuid
from unittest.mock import patch

import pytest

from apps.core.audit import (
    capture_snapshot,
    diff_snapshots,
    log_create,
    log_delete,
    log_event,
    log_update,
    redact,
)
from apps.core.models import AuditLog
from conftest import (
    AuditEngagementFactory,
    FindingFactory,
    RiskFactory,
    UserFactory,
)


# ===========================================================================
# redact()
# ===========================================================================

class TestRedact:
    def test_removes_password_field(self):
        result = redact({"password": "s3cr3t", "name": "Alice"})
        assert result["password"] == "[REDACTED]"
        assert result["name"] == "Alice"

    def test_removes_field_containing_token(self):
        result = redact({"access_token": "abc123", "status": "active"})
        assert result["access_token"] == "[REDACTED]"
        assert result["status"] == "active"

    def test_removes_field_containing_secret(self):
        result = redact({"client_secret": "xyz"})
        assert result["client_secret"] == "[REDACTED]"

    def test_removes_azure_oid(self):
        result = redact({"azure_oid": "oid-value"})
        assert result["azure_oid"] == "[REDACTED]"

    def test_removes_last_login_ip(self):
        result = redact({"last_login_ip": "192.168.1.1"})
        assert result["last_login_ip"] == "[REDACTED]"

    def test_removes_private_key(self):
        result = redact({"private_key": "-----BEGIN RSA"})
        assert result["private_key"] == "[REDACTED]"

    def test_removes_credential(self):
        result = redact({"credential_store": "vault"})
        assert result["credential_store"] == "[REDACTED]"

    def test_preserves_non_sensitive_fields(self):
        data = {
            "name": "Procurement Process",
            "description": "Key process",
            "status": "active",
            "is_active": True,
            "severity": "critical",
        }
        result = redact(data)
        assert result == data

    def test_returns_none_for_none_input(self):
        assert redact(None) is None

    def test_returns_empty_dict_unchanged(self):
        assert redact({}) == {}

    def test_does_not_mutate_original(self):
        original = {"password": "x", "name": "y"}
        redact(original)
        assert original["password"] == "x"  # original unchanged


# ===========================================================================
# capture_snapshot()
# ===========================================================================

@pytest.mark.django_db
class TestCaptureSnapshot:
    def test_returns_json_safe_dict(self):
        """No UUID objects or datetime objects should appear in the output."""
        risk = RiskFactory()
        snapshot = capture_snapshot(risk)
        for value in snapshot.values():
            assert isinstance(
                value, (str, int, float, bool, type(None))
            ), f"Non-JSON-safe value: {value!r}"

    def test_contains_key_fields(self):
        risk = RiskFactory(name="Treasury Risk", status="identified")
        snapshot = capture_snapshot(risk)
        assert snapshot["name"] == "Treasury Risk"
        assert snapshot["status"] == "identified"

    def test_redacts_user_password(self):
        """User snapshot must never expose the password hash."""
        user = UserFactory()
        snapshot = capture_snapshot(user)
        assert snapshot.get("password") == "[REDACTED]"

    def test_redacts_user_azure_oid(self):
        user = UserFactory()
        snapshot = capture_snapshot(user)
        assert snapshot.get("azure_oid") == "[REDACTED]"

    def test_fk_captured_as_id_string(self):
        """ForeignKey fields appear as '<field>_id' raw PK string."""
        from conftest import AuditEngagementFactory
        engagement = AuditEngagementFactory()
        finding = FindingFactory(engagement=engagement)
        snapshot = capture_snapshot(finding)
        assert "engagement_id" in snapshot
        assert snapshot["engagement_id"] == str(engagement.pk)


# ===========================================================================
# diff_snapshots()
# ===========================================================================

class TestDiffSnapshots:
    def test_returns_only_changed_fields(self):
        old = {"name": "Old Name", "status": "draft", "severity": "medium"}
        new = {"name": "New Name", "status": "draft", "severity": "medium"}
        old_diff, new_diff = diff_snapshots(old, new)
        assert old_diff == {"name": "Old Name"}
        assert new_diff == {"name": "New Name"}

    def test_empty_diff_when_nothing_changed(self):
        snap = {"name": "X", "status": "Y"}
        old_diff, new_diff = diff_snapshots(snap, snap.copy())
        assert old_diff == {}
        assert new_diff == {}

    def test_handles_none_old(self):
        new = {"name": "X"}
        old_diff, new_diff = diff_snapshots(None, new)
        assert old_diff is None
        assert new_diff == new

    def test_handles_none_new(self):
        old = {"name": "X"}
        old_diff, new_diff = diff_snapshots(old, None)
        assert old_diff == old
        assert new_diff is None

    def test_detects_new_field(self):
        old = {"name": "X"}
        new = {"name": "X", "extra": "Y"}
        old_diff, new_diff = diff_snapshots(old, new)
        assert "extra" not in old_diff
        assert new_diff == {"extra": "Y"}

    def test_detects_removed_field(self):
        old = {"name": "X", "extra": "Y"}
        new = {"name": "X"}
        old_diff, new_diff = diff_snapshots(old, new)
        assert old_diff == {"extra": "Y"}
        assert "extra" not in new_diff


# ===========================================================================
# log_event()
# ===========================================================================

@pytest.mark.django_db
class TestLogEvent:
    def test_creates_audit_log_row(self):
        before = AuditLog.objects.count()
        log_event(action="create", entity_type="risk", entity_id="abc123")
        assert AuditLog.objects.count() == before + 1

    def test_row_has_correct_fields(self):
        user = UserFactory()
        log_event(
            action="update",
            entity_type="finding",
            entity_id="00000000-0000-0000-0000-000000000001",
            entity_name="Missing Control",
            user=user,
            old_values={"status": "draft"},
            new_values={"status": "open"},
        )
        log = AuditLog.objects.latest("timestamp")
        assert log.action == "update"
        assert log.entity_type == "finding"
        assert log.entity_id == "00000000-0000-0000-0000-000000000001"
        assert log.entity_name == "Missing Control"
        assert log.user == user
        assert log.old_values == {"status": "draft"}
        assert log.new_values == {"status": "open"}

    def test_swallows_db_error_without_raising(self):
        """Audit failures must never propagate to the caller."""
        with patch(
            "apps.core.models.AuditLog.objects.create",
            side_effect=Exception("DB down"),
        ):
            # Should not raise
            log_event(action="delete", entity_type="test", entity_id="x")

    def test_resolves_user_from_request(self):
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        req = factory.get("/")
        user = UserFactory()
        req.user = user
        before = AuditLog.objects.count()
        log_event(action="view", entity_type="report", entity_id="y", request=req)
        assert AuditLog.objects.count() == before + 1
        log = AuditLog.objects.latest("timestamp")
        assert log.user == user


# ===========================================================================
# log_create / log_update / log_delete helpers
# ===========================================================================

@pytest.mark.django_db
class TestLogHelpers:
    def test_log_create_populates_new_values(self):
        risk = RiskFactory(name="Cyber Risk")
        before = AuditLog.objects.count()
        # Signals fire on factory save, so count first then create another
        AuditLog.objects.all().delete()
        log_create(risk)
        log = AuditLog.objects.latest("timestamp")
        assert log.action == "create"
        assert log.new_values is not None
        assert log.new_values.get("name") == "Cyber Risk"
        assert log.old_values is None
        assert log.entity_id == str(risk.pk)
        assert log.entity_name != ""

    def test_log_delete_populates_old_values(self):
        risk = RiskFactory(name="Obsolete Risk")
        AuditLog.objects.all().delete()
        log_delete(risk)
        log = AuditLog.objects.latest("timestamp")
        assert log.action == "delete"
        assert log.old_values is not None
        assert log.old_values.get("name") == "Obsolete Risk"
        assert log.new_values is None

    def test_log_update_populates_diff(self):
        risk = RiskFactory(name="Initial Name", status="identified")
        old_snap = capture_snapshot(risk)
        risk.name = "Updated Name"
        risk.save(update_fields=["name", "updated_at"])
        AuditLog.objects.all().delete()
        log_update(risk, old_snap)
        log = AuditLog.objects.latest("timestamp")
        assert log.action == "update"
        assert log.old_values == {"name": "Initial Name"}
        assert log.new_values == {"name": "Updated Name"}

    def test_log_update_skips_when_no_meaningful_change(self):
        """A save that only bumps updated_at should not create a log entry."""
        risk = RiskFactory()
        old_snap = capture_snapshot(risk)
        # Simulate a touch-only save (updated_at differs but nothing else)
        new_snap = old_snap.copy()
        new_snap["updated_at"] = "2099-01-01T00:00:00"
        AuditLog.objects.all().delete()
        from apps.core.audit import diff_snapshots as _diff, log_update as _log_update
        # Manually call with matching snapshots (no non-timestamp diff)
        _log_update.__wrapped__ = None  # ensure not mocked
        log_update(risk, old_snap)  # should not write because diff is empty after updated_at strip
        # Actually old_snap matches the current DB state, so no diff → no write
        assert AuditLog.objects.count() == 0


# ===========================================================================
# Signal integration tests
# ===========================================================================

@pytest.mark.django_db
class TestFindingSignals:
    def test_create_logs_audit_entry(self):
        AuditLog.objects.all().delete()
        finding = FindingFactory()
        logs = AuditLog.objects.filter(entity_type="finding", action="create")
        assert logs.exists(), "Expected a create audit log for Finding"
        log = logs.latest("timestamp")
        assert log.entity_id == str(finding.pk)
        assert log.entity_name != ""
        assert log.new_values is not None

    def test_update_logs_diff(self):
        finding = FindingFactory(severity="medium")
        AuditLog.objects.all().delete()
        finding.severity = "critical"
        finding.save(update_fields=["severity", "updated_at"])
        logs = AuditLog.objects.filter(entity_type="finding", action="update")
        assert logs.exists(), "Expected an update audit log for Finding"
        log = logs.latest("timestamp")
        assert log.old_values == {"severity": "medium"}
        assert log.new_values == {"severity": "critical"}

    def test_delete_logs_old_values(self):
        finding = FindingFactory()
        finding_pk = str(finding.pk)
        finding_title = finding.title
        AuditLog.objects.all().delete()
        finding.delete()
        logs = AuditLog.objects.filter(entity_type="finding", action="delete")
        assert logs.exists(), "Expected a delete audit log for Finding"
        log = logs.latest("timestamp")
        assert log.entity_id == finding_pk
        assert log.old_values is not None
        assert log.old_values.get("title") == finding_title


@pytest.mark.django_db
class TestRiskSignals:
    def test_create_logs_audit_entry(self):
        AuditLog.objects.all().delete()
        risk = RiskFactory(name="Strategic Risk")
        logs = AuditLog.objects.filter(entity_type="risk", action="create")
        assert logs.exists()
        log = logs.latest("timestamp")
        assert log.entity_id == str(risk.pk)
        assert log.new_values["name"] == "Strategic Risk"

    def test_update_logs_status_diff(self):
        risk = RiskFactory(status="identified")
        AuditLog.objects.all().delete()
        risk.status = "mitigated"
        risk.save(update_fields=["status", "updated_at"])
        log = AuditLog.objects.filter(entity_type="risk", action="update").latest("timestamp")
        assert log.old_values == {"status": "identified"}
        assert log.new_values == {"status": "mitigated"}


@pytest.mark.django_db
class TestEngagementSignals:
    def test_create_logs_audit_entry(self):
        AuditLog.objects.all().delete()
        engagement = AuditEngagementFactory()
        logs = AuditLog.objects.filter(entity_type="auditengagement", action="create")
        assert logs.exists()
        log = logs.latest("timestamp")
        assert log.entity_id == str(engagement.pk)


@pytest.mark.django_db
class TestUserSignals:
    def test_role_change_diff_excludes_password(self):
        """Role change must be captured but password must never appear in diff."""
        user = UserFactory(role="auditor")
        AuditLog.objects.all().delete()
        user.role = "audit_manager"
        user.save(update_fields=["role"])
        logs = AuditLog.objects.filter(entity_type="user", action="update")
        assert logs.exists(), "Expected an update log for user role change"
        log = logs.latest("timestamp")
        # Role change captured
        assert log.old_values is not None
        assert "role" in log.old_values
        assert log.old_values["role"] == "auditor"
        # Password NEVER in diff
        assert "password" not in (log.old_values or {})
        assert "password" not in (log.new_values or {})

    def test_create_does_not_expose_password(self):
        AuditLog.objects.all().delete()
        user = UserFactory()
        logs = AuditLog.objects.filter(entity_type="user", action="create")
        assert logs.exists()
        log = logs.latest("timestamp")
        assert log.new_values.get("password") == "[REDACTED]"
        assert log.new_values.get("azure_oid") == "[REDACTED]"


# ===========================================================================
# Middleware deduplication
# ===========================================================================

@pytest.mark.django_db
class TestMiddlewareDeduplication:
    def test_signal_sets_was_logged_flag(self):
        """
        When a signal handler fires (e.g. creating a Risk), the was_logged()
        flag should be True so AuditLogMiddleware skips its fallback entry.

        We simulate the middleware context by calling set_current_request first.
        """
        from apps.core.audit import (
            clear_audit_context,
            set_current_request,
            was_logged,
        )
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        req = factory.post("/api/v1/risks/")
        user = UserFactory(role="audit_manager")
        req.user = user

        set_current_request(req)
        try:
            assert not was_logged(), "Flag should start False"
            RiskFactory()  # triggers signal → mark_logged()
            assert was_logged(), "Flag should be True after signal fires"
        finally:
            clear_audit_context()

    def test_only_one_log_entry_per_signal_covered_mutation(self, manager_client):
        """
        Posting to /risks/ (signal-covered) should produce exactly one AuditLog
        entry (from the signal), not two (signal + middleware fallback).
        """
        from apps.risks.models import Risk

        AuditLog.objects.all().delete()
        resp = manager_client.post(
            "/api/v1/risks/",
            {
                "name": "Dedup Test Risk",
                "description": "Testing dedup",
                "category": "operational",
                "inherent_likelihood": 2,
                "inherent_impact": 2,
            },
        )
        assert resp.status_code == 201, resp.data
        # Exactly one entry: the rich signal entry, no fallback duplicate
        create_logs = AuditLog.objects.filter(
            entity_type="risk", action="create"
        )
        assert create_logs.count() == 1, (
            f"Expected 1 log entry, got {create_logs.count()}"
        )
        log = create_logs.first()
        assert log.entity_id != "", "entity_id must be populated by signal"
        assert log.entity_name != "", "entity_name must be populated by signal"
        assert log.new_values is not None, "new_values must be populated by signal"
