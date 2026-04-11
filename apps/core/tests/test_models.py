"""
Model tests for the core app: BusinessProcess, BusinessObjective, AuditLog.
"""
import pytest

from conftest import (
    BusinessObjectiveFactory,
    BusinessProcessFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestBusinessProcessModel:
    def test_create(self):
        bp = BusinessProcessFactory()
        assert bp.pk is not None

    def test_str_returns_name(self):
        bp = BusinessProcessFactory(name="Accounts Payable")
        assert str(bp) == "Accounts Payable"

    def test_default_is_active(self):
        bp = BusinessProcessFactory()
        assert bp.is_active is True

    def test_owner_is_optional(self):
        bp = BusinessProcessFactory(owner=None)
        assert bp.owner is None

    def test_owner_can_be_set(self):
        user = UserFactory()
        bp = BusinessProcessFactory(owner=user)
        assert bp.owner == user

    def test_description_defaults_blank(self):
        from apps.core.models import BusinessProcess

        bp = BusinessProcess.objects.create(name="No Description")
        assert bp.description == ""


@pytest.mark.django_db
class TestBusinessObjectiveModel:
    def test_create(self):
        obj = BusinessObjectiveFactory()
        assert obj.pk is not None

    def test_str_returns_name(self):
        obj = BusinessObjectiveFactory(name="Increase Revenue")
        assert str(obj) == "Increase Revenue"

    def test_business_process_is_optional(self):
        obj = BusinessObjectiveFactory(business_process=None)
        assert obj.business_process is None

    def test_business_process_can_be_set(self):
        bp = BusinessProcessFactory()
        obj = BusinessObjectiveFactory(business_process=bp)
        assert obj.business_process == bp

    def test_cascades_on_process_delete(self):
        from apps.core.models import BusinessObjective

        bp = BusinessProcessFactory()
        obj = BusinessObjectiveFactory(business_process=bp)
        bp.delete()
        assert not BusinessObjective.objects.filter(pk=obj.pk).exists()


@pytest.mark.django_db
class TestAuditLogModel:
    def test_create(self):
        from apps.core.models import AuditLog

        log = AuditLog.objects.create(
            action="create",
            entity_type="risk",
            entity_id="abc",
        )
        assert log.pk is not None

    def test_str_includes_action_and_entity_type(self):
        from apps.core.models import AuditLog

        user = UserFactory()
        log = AuditLog.objects.create(
            user=user,
            action="create",
            entity_type="finding",
        )
        result = str(log)
        assert "create" in result
        assert "finding" in result

    def test_user_is_optional(self):
        from apps.core.models import AuditLog

        log = AuditLog.objects.create(action="login", entity_type="user")
        assert log.user is None

    def test_default_permissions_view_only(self):
        from apps.core.models import AuditLog

        # Only "view" should exist, not "add", "change", or "delete"
        assert AuditLog._meta.default_permissions == ("view",)

    def test_all_action_choices_accepted(self):
        from apps.core.models import AuditLog

        for action in ("create", "update", "delete", "view", "login", "logout",
                       "export", "approve", "reject"):
            log = AuditLog.objects.create(action=action, entity_type="test")
            assert log.action == action
