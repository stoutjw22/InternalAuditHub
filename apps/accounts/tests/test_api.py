"""
API tests for the accounts app.

Endpoints covered:
  POST  /api/v1/auth/token/         — obtain JWT
  POST  /api/v1/auth/register/      — create user (admin only)
  GET/PATCH  /api/v1/auth/me/       — current-user profile
  POST  /api/v1/auth/password/change/
  GET   /api/v1/auth/users/         — list users (manager+)
  GET/PATCH/DELETE  /api/v1/auth/users/<pk>/  — user detail (admin only)
  GET   /api/v1/auth/users/<role_slug>/       — role-filtered list
"""
import pytest

from conftest import UserFactory

TOKEN_URL = "/api/v1/auth/token/"
REGISTER_URL = "/api/v1/auth/register/"
ME_URL = "/api/v1/auth/me/"
PASSWORD_CHANGE_URL = "/api/v1/auth/password/change/"
USERS_URL = "/api/v1/auth/users/"


# ── /api/v1/auth/token/ ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestTokenObtain:
    def test_valid_credentials_return_tokens(self, db):
        user = UserFactory(email="login@example.com", password="ValidPass123!")
        resp = __import__("rest_framework").test.APIClient().post(
            TOKEN_URL,
            {"email": "login@example.com", "password": "ValidPass123!"},
        )
        assert resp.status_code == 200
        assert "access" in resp.data
        assert "refresh" in resp.data
        assert "user" in resp.data

    def test_invalid_credentials_return_401(self, api_client):
        resp = api_client.post(TOKEN_URL, {"email": "ghost@example.com", "password": "wrong"})
        assert resp.status_code == 401

    def test_token_payload_contains_role(self, db):
        from rest_framework.test import APIClient
        import base64, json

        user = UserFactory(email="roleful@example.com", password="ValidPass123!", role="auditor")
        resp = APIClient().post(
            TOKEN_URL,
            {"email": "roleful@example.com", "password": "ValidPass123!"},
        )
        assert resp.status_code == 200
        # Decode the access token payload (middle segment)
        token = resp.data["access"]
        payload_b64 = token.split(".")[1]
        # Pad base64 string
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.b64decode(payload_b64))
        assert payload.get("role") == "auditor"


# ── /api/v1/auth/register/ ────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRegister:
    VALID_DATA = {
        "email": "brand_new@example.com",
        "username": "brand_new",
        "first_name": "Brand",
        "last_name": "New",
        "password": "SecurePass1234!",
        "password_confirm": "SecurePass1234!",
    }

    def test_admin_can_register_user(self, admin_client):
        resp = admin_client.post(REGISTER_URL, self.VALID_DATA)
        assert resp.status_code == 201
        assert resp.data["email"] == "brand_new@example.com"

    def test_non_admin_cannot_register(self, manager_client):
        resp = manager_client.post(REGISTER_URL, self.VALID_DATA)
        assert resp.status_code == 403

    def test_unauthenticated_cannot_register(self, api_client):
        resp = api_client.post(REGISTER_URL, self.VALID_DATA)
        assert resp.status_code == 401

    def test_duplicate_email_returns_400(self, admin_client):
        UserFactory(email="taken@example.com")
        data = {**self.VALID_DATA, "email": "taken@example.com"}
        resp = admin_client.post(REGISTER_URL, data)
        assert resp.status_code == 400


# ── /api/v1/auth/me/ ──────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestMeView:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(ME_URL)
        assert resp.status_code == 401

    def test_authenticated_can_retrieve_profile(self, auditor_client, auditor_user):
        resp = auditor_client.get(ME_URL)
        assert resp.status_code == 200
        assert resp.data["email"] == auditor_user.email

    def test_authenticated_can_update_profile(self, auditor_client, auditor_user):
        resp = auditor_client.patch(ME_URL, {"first_name": "Updated"})
        assert resp.status_code == 200
        assert resp.data["first_name"] == "Updated"

    def test_response_never_exposes_password(self, auditor_client):
        resp = auditor_client.get(ME_URL)
        assert "password" not in resp.data


# ── /api/v1/auth/password/change/ ─────────────────────────────────────────────

@pytest.mark.django_db
class TestPasswordChange:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.post(PASSWORD_CHANGE_URL, {})
        assert resp.status_code == 401

    def test_valid_change_returns_200(self, db):
        from rest_framework.test import APIClient

        user = UserFactory(password="OldSecurePass1!")
        client = APIClient()
        client.force_authenticate(user=user)
        resp = client.post(
            PASSWORD_CHANGE_URL,
            {
                "old_password": "OldSecurePass1!",
                "new_password": "NewSecurePass2!",
                "new_password_confirm": "NewSecurePass2!",
            },
        )
        assert resp.status_code == 200

    def test_wrong_old_password_returns_400(self, auditor_client):
        resp = auditor_client.post(
            PASSWORD_CHANGE_URL,
            {
                "old_password": "WrongOldPass1!",
                "new_password": "NewSecurePass2!",
                "new_password_confirm": "NewSecurePass2!",
            },
        )
        assert resp.status_code == 400


# ── /api/v1/auth/users/ ───────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserList:
    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(USERS_URL)
        assert resp.status_code == 401

    def test_auditor_cannot_list_users(self, auditor_client):
        resp = auditor_client.get(USERS_URL)
        assert resp.status_code == 403

    def test_manager_can_list_users(self, manager_client):
        UserFactory()
        resp = manager_client.get(USERS_URL)
        assert resp.status_code == 200
        assert "results" in resp.data

    def test_admin_can_list_users(self, admin_client):
        resp = admin_client.get(USERS_URL)
        assert resp.status_code == 200

    def test_filter_by_role(self, manager_client):
        UserFactory(role="auditor")
        UserFactory(role="risk_owner")
        resp = manager_client.get(f"{USERS_URL}?role=auditor")
        assert resp.status_code == 200
        for u in resp.data["results"]:
            assert u["role"] == "auditor"


# ── /api/v1/auth/users/<pk>/ ──────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserDetail:
    def test_admin_can_retrieve_user(self, admin_client):
        user = UserFactory()
        resp = admin_client.get(f"{USERS_URL}{user.pk}/")
        assert resp.status_code == 200
        assert str(resp.data["id"]) == str(user.pk)

    def test_non_admin_cannot_access(self, manager_client):
        user = UserFactory()
        resp = manager_client.get(f"{USERS_URL}{user.pk}/")
        assert resp.status_code == 403

    def test_delete_soft_deactivates_user(self, admin_client):
        user = UserFactory(is_active=True)
        resp = admin_client.delete(f"{USERS_URL}{user.pk}/")
        assert resp.status_code == 204
        user.refresh_from_db()
        assert user.is_active is False


# ── /api/v1/auth/users/<role_slug>/ ───────────────────────────────────────────

@pytest.mark.django_db
class TestRoleFilteredUserList:
    def test_auditors_endpoint(self, auditor_client):
        UserFactory(role="auditor")
        resp = auditor_client.get(f"{USERS_URL}auditors/")
        assert resp.status_code == 200
        for u in resp.data["results"]:
            assert u["role"] == "auditor"

    def test_managers_endpoint(self, auditor_client):
        UserFactory(role="audit_manager")
        resp = auditor_client.get(f"{USERS_URL}managers/")
        assert resp.status_code == 200
        for u in resp.data["results"]:
            assert u["role"] == "audit_manager"

    def test_risk_owners_endpoint(self, auditor_client):
        UserFactory(role="risk_owner")
        resp = auditor_client.get(f"{USERS_URL}risk-owners/")
        assert resp.status_code == 200
        for u in resp.data["results"]:
            assert u["role"] == "risk_owner"

    def test_unauthenticated_gets_401(self, api_client):
        resp = api_client.get(f"{USERS_URL}auditors/")
        assert resp.status_code == 401
