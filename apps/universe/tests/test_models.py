"""Model tests for the universe app."""
import pytest

from conftest import (
    AuditableDomainFactory,
    AuditableEntityFactory,
    BusinessProcessFactory,
    SubprocessFactory,
)


@pytest.mark.django_db
class TestAuditableDomain:
    def test_str_no_parent(self):
        domain = AuditableDomainFactory(name="Finance")
        assert str(domain) == "Finance"

    def test_str_with_parent(self):
        parent = AuditableDomainFactory(name="Operations")
        child = AuditableDomainFactory(name="Procurement", parent=parent)
        assert str(child) == "Operations / Procurement"

    def test_unique_name(self):
        from django.db import IntegrityError

        AuditableDomainFactory(name="UniqueDomain")
        with pytest.raises(IntegrityError):
            AuditableDomainFactory(name="UniqueDomain")

    def test_subdomain_relationship(self):
        parent = AuditableDomainFactory()
        child1 = AuditableDomainFactory(parent=parent)
        child2 = AuditableDomainFactory(parent=parent)
        assert parent.subdomains.count() == 2
        assert child1 in parent.subdomains.all()
        assert child2 in parent.subdomains.all()

    def test_entity_relationship(self):
        domain = AuditableDomainFactory()
        AuditableEntityFactory(domain=domain)
        AuditableEntityFactory(domain=domain)
        assert domain.entities.count() == 2

    def test_default_is_active(self):
        domain = AuditableDomainFactory()
        assert domain.is_active is True


@pytest.mark.django_db
class TestAuditableEntity:
    def test_str(self):
        domain = AuditableDomainFactory(name="Finance")
        entity = AuditableEntityFactory(name="Accounts Payable", domain=domain)
        assert str(entity) == "Finance — Accounts Payable"

    def test_entity_type_choices(self):
        for etype in ("process", "system", "org_unit", "vendor", "product", "location", "other"):
            entity = AuditableEntityFactory(entity_type=etype)
            assert entity.entity_type == etype

    def test_inherent_risk_rating_choices(self):
        for rating in ("critical", "high", "medium", "low", "not_rated"):
            entity = AuditableEntityFactory(inherent_risk_rating=rating)
            assert entity.inherent_risk_rating == rating

    def test_subprocess_reverse_relation(self):
        entity = AuditableEntityFactory()
        bp = BusinessProcessFactory()
        SubprocessFactory(auditable_entity=entity, business_process=bp)
        SubprocessFactory(auditable_entity=entity, business_process=bp)
        assert entity.subprocesses.count() == 2

    def test_ordering(self):
        domain = AuditableDomainFactory(name="AAA Domain")
        e1 = AuditableEntityFactory(name="Zebra", domain=domain)
        e2 = AuditableEntityFactory(name="Apple", domain=domain)
        from apps.universe.models import AuditableEntity
        entities = list(AuditableEntity.objects.filter(domain=domain))
        assert entities[0].name == "Apple"
        assert entities[1].name == "Zebra"


@pytest.mark.django_db
class TestSubprocess:
    def test_str(self):
        bp = BusinessProcessFactory(name="Procurement")
        sp = SubprocessFactory(name="Invoice Approval", business_process=bp)
        assert str(sp) == "Procurement → Invoice Approval"

    def test_ordering_by_sequence(self):
        bp = BusinessProcessFactory()
        sp2 = SubprocessFactory(business_process=bp, sequence_order=2, name="Second")
        sp1 = SubprocessFactory(business_process=bp, sequence_order=1, name="First")
        from apps.universe.models import Subprocess
        subprocesses = list(Subprocess.objects.filter(business_process=bp))
        assert subprocesses[0].sequence_order == 1
        assert subprocesses[1].sequence_order == 2

    def test_optional_auditable_entity(self):
        bp = BusinessProcessFactory()
        sp = SubprocessFactory(business_process=bp, auditable_entity=None)
        assert sp.auditable_entity is None
