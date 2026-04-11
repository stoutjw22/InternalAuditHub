"""
Model tests for the accounts app: User model.

Covers: creation, __str__, role helpers (properties), default values,
and email as the unique login credential.
"""
import pytest

from conftest import UserFactory


@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        user = UserFactory()
        assert user.pk is not None
        assert user.is_active is True

    def test_email_is_unique(self):
        user = UserFactory(email="unique@example.com")
        with pytest.raises(Exception):  # IntegrityError or similar
            UserFactory(email="unique@example.com")

    def test_str_with_full_name(self):
        user = UserFactory(first_name="Alice", last_name="Smith", email="alice@example.com")
        result = str(user)
        assert "Alice" in result
        assert "alice@example.com" in result

    def test_str_without_name_falls_back_to_email(self):
        user = UserFactory(first_name="", last_name="", email="noname@example.com")
        assert str(user) == "noname@example.com"

    def test_default_role_is_read_only(self):
        user = UserFactory()
        assert user.role == "read_only"

    def test_default_is_azure_user_false(self):
        user = UserFactory()
        assert user.is_azure_user is False

    def test_default_must_change_password_false(self):
        user = UserFactory()
        assert user.must_change_password is False

    # ── Role helper properties ──────────────────────────────────────────────

    def test_is_admin_role_true_for_admin(self):
        user = UserFactory(role="admin")
        assert user.is_admin_role is True

    def test_is_admin_role_false_for_manager(self):
        user = UserFactory(role="audit_manager")
        assert user.is_admin_role is False

    def test_is_audit_manager_or_above_true_for_admin(self):
        user = UserFactory(role="admin")
        assert user.is_audit_manager_or_above is True

    def test_is_audit_manager_or_above_true_for_manager(self):
        user = UserFactory(role="audit_manager")
        assert user.is_audit_manager_or_above is True

    def test_is_audit_manager_or_above_false_for_auditor(self):
        user = UserFactory(role="auditor")
        assert user.is_audit_manager_or_above is False

    def test_is_auditor_or_above_true_for_admin(self):
        user = UserFactory(role="admin")
        assert user.is_auditor_or_above is True

    def test_is_auditor_or_above_true_for_manager(self):
        user = UserFactory(role="audit_manager")
        assert user.is_auditor_or_above is True

    def test_is_auditor_or_above_true_for_auditor(self):
        user = UserFactory(role="auditor")
        assert user.is_auditor_or_above is True

    def test_is_auditor_or_above_false_for_risk_owner(self):
        user = UserFactory(role="risk_owner")
        assert user.is_auditor_or_above is False

    def test_is_auditor_or_above_false_for_read_only(self):
        user = UserFactory(role="read_only")
        assert user.is_auditor_or_above is False

    def test_all_role_choices_accepted(self):
        for role in (
            "admin", "audit_manager", "auditor",
            "risk_owner", "control_owner", "finding_owner", "read_only",
        ):
            user = UserFactory(role=role)
            assert user.role == role

    def test_password_is_hashed(self):
        user = UserFactory(password="MyPlainPassword123!")
        # The stored password must not equal the plaintext
        assert user.password != "MyPlainPassword123!"
        assert user.check_password("MyPlainPassword123!")

    def test_azure_oid_unique_when_set(self):
        user1 = UserFactory(azure_oid="same-oid-12345678901234567890123456789012")
        with pytest.raises(Exception):
            UserFactory(azure_oid="same-oid-12345678901234567890123456789012")
