"""
Serializer tests for the accounts app:
  UserRegistrationSerializer, UserProfileSerializer,
  UserListSerializer, PasswordChangeSerializer.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.accounts.serializers import (
    PasswordChangeSerializer,
    UserListSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

from conftest import UserFactory

User = get_user_model()


def _make_request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    drf_request = Request(req)
    drf_request._user = user
    return drf_request


@pytest.mark.django_db
class TestUserRegistrationSerializer:
    VALID_DATA = {
        "email": "newuser@example.com",
        "username": "newuser",
        "first_name": "New",
        "last_name": "User",
        "password": "SuperSecure123!",
        "password_confirm": "SuperSecure123!",
    }

    def test_valid_registration(self):
        s = UserRegistrationSerializer(data=self.VALID_DATA)
        assert s.is_valid(), s.errors
        user = s.save()
        assert user.email == "newuser@example.com"
        assert user.check_password("SuperSecure123!")

    def test_mismatched_passwords_rejected(self):
        data = {**self.VALID_DATA, "password_confirm": "DifferentPass123!"}
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        assert "password_confirm" in s.errors

    def test_missing_first_name_rejected(self):
        """first_name is required (must be present), though blank is allowed by the model."""
        data = {k: v for k, v in self.VALID_DATA.items() if k != "first_name"}
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        assert "first_name" in s.errors

    def test_missing_last_name_rejected(self):
        """last_name is required (must be present), though blank is allowed by the model."""
        data = {k: v for k, v in self.VALID_DATA.items() if k != "last_name"}
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        assert "last_name" in s.errors

    def test_duplicate_email_rejected(self):
        UserFactory(email="existing@example.com")
        data = {**self.VALID_DATA, "email": "existing@example.com"}
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        assert "email" in s.errors

    def test_weak_password_rejected(self):
        """Django's password validators must fire; password < 12 chars fails MinimumLengthValidator."""
        data = {**self.VALID_DATA, "password": "short", "password_confirm": "short"}
        s = UserRegistrationSerializer(data=data)
        assert not s.is_valid()
        assert "password" in s.errors

    def test_role_defaults_to_read_only_when_omitted(self):
        s = UserRegistrationSerializer(data=self.VALID_DATA)
        s.is_valid(raise_exception=True)
        user = s.save()
        assert user.role == "read_only"


@pytest.mark.django_db
class TestUserProfileSerializer:
    def test_serializes_user(self):
        user = UserFactory(first_name="Bob", last_name="Jones", email="bob@example.com")
        data = UserProfileSerializer(user).data
        assert data["email"] == "bob@example.com"
        assert data["full_name"] == "Bob Jones"
        assert "password" not in data

    def test_full_name_computed(self):
        user = UserFactory(first_name="Carol", last_name="White")
        data = UserProfileSerializer(user).data
        assert data["full_name"] == "Carol White"

    def test_email_is_read_only(self):
        user = UserFactory(email="original@example.com")
        s = UserProfileSerializer(
            instance=user,
            data={"email": "changed@example.com", "username": user.username},
            partial=True,
        )
        s.is_valid()
        # email read_only means it won't be in validated_data
        assert "email" not in s.validated_data


@pytest.mark.django_db
class TestUserListSerializer:
    def test_includes_expected_fields(self):
        user = UserFactory(role="auditor")
        data = UserListSerializer(user).data
        assert "id" in data
        assert "email" in data
        assert "full_name" in data
        assert "role" in data
        assert "department" in data
        # Sensitive fields must be absent
        assert "password" not in data
        assert "last_login_ip" not in data


@pytest.mark.django_db
class TestPasswordChangeSerializer:
    def test_valid_password_change(self):
        user = UserFactory(password="OldPassword123!")
        data = {
            "old_password": "OldPassword123!",
            "new_password": "BrandNewPass456!",
            "new_password_confirm": "BrandNewPass456!",
        }
        s = PasswordChangeSerializer(data=data, context={"request": _make_request(user)})
        assert s.is_valid(), s.errors
        s.save()
        user.refresh_from_db()
        assert user.check_password("BrandNewPass456!")

    def test_wrong_old_password_rejected(self):
        user = UserFactory(password="CorrectPass123!")
        data = {
            "old_password": "WrongPass123!",
            "new_password": "NewSecure123!",
            "new_password_confirm": "NewSecure123!",
        }
        s = PasswordChangeSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "old_password" in s.errors

    def test_mismatched_new_passwords_rejected(self):
        user = UserFactory(password="OldPassword123!")
        data = {
            "old_password": "OldPassword123!",
            "new_password": "NewSecure456!",
            "new_password_confirm": "Mismatch456!",
        }
        s = PasswordChangeSerializer(data=data, context={"request": _make_request(user)})
        assert not s.is_valid()
        assert "new_password_confirm" in s.errors

    def test_save_clears_must_change_password_flag(self):
        user = UserFactory(password="OldPassword123!")
        user.must_change_password = True
        user.save()
        data = {
            "old_password": "OldPassword123!",
            "new_password": "FreshNewPass789!",
            "new_password_confirm": "FreshNewPass789!",
        }
        s = PasswordChangeSerializer(data=data, context={"request": _make_request(user)})
        s.is_valid(raise_exception=True)
        s.save()
        user.refresh_from_db()
        assert user.must_change_password is False
