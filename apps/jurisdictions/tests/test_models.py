"""Model tests for the jurisdictions app."""
import pytest

from conftest import (
    ApplicabilityLogicFactory,
    AuditableEntityFactory,
    FrameworkRequirementFactory,
    JurisdictionFactory,
    RequirementOverlayFactory,
)


@pytest.mark.django_db
class TestJurisdiction:
    def test_str_with_short_name_and_region(self):
        j = JurisdictionFactory(short_name="NYDFS", region="New York")
        result = str(j)
        assert "NYDFS" in result
        assert "New York" in result

    def test_str_with_only_name(self):
        j = JurisdictionFactory(name="European Data Protection Board", short_name="", region="")
        result = str(j)
        assert "European Data Protection Board" in result

    def test_str_no_region(self):
        j = JurisdictionFactory(short_name="FFIEC", region="")
        result = str(j)
        assert "FFIEC" in result
        assert "(" not in result

    def test_unique_name(self):
        from django.db import IntegrityError
        JurisdictionFactory(name="Duplicate Reg")
        with pytest.raises(IntegrityError):
            JurisdictionFactory(name="Duplicate Reg")

    def test_jurisdiction_type_choices(self):
        for jtype in ("federal", "state", "international", "regulator", "self_regulatory", "other"):
            j = JurisdictionFactory(jurisdiction_type=jtype)
            assert j.jurisdiction_type == jtype

    def test_overlay_reverse_relation(self):
        j = JurisdictionFactory()
        RequirementOverlayFactory(jurisdiction=j)
        RequirementOverlayFactory(jurisdiction=j)
        assert j.overlays.count() == 2

    def test_applicability_rules_reverse_relation(self):
        j = JurisdictionFactory()
        ApplicabilityLogicFactory(jurisdiction=j)
        assert j.applicability_rules.count() == 1


@pytest.mark.django_db
class TestRequirementOverlay:
    def test_str(self):
        j = JurisdictionFactory(short_name="GDPR")
        req = FrameworkRequirementFactory()
        overlay = RequirementOverlayFactory(jurisdiction=j, framework_requirement=req)
        result = str(overlay)
        assert "GDPR" in result

    def test_unique_together_jurisdiction_requirement(self):
        from django.db import IntegrityError
        j = JurisdictionFactory()
        req = FrameworkRequirementFactory()
        RequirementOverlayFactory(jurisdiction=j, framework_requirement=req)
        with pytest.raises(IntegrityError):
            RequirementOverlayFactory(jurisdiction=j, framework_requirement=req)

    def test_overlay_type_choices(self):
        for otype in ("stricter", "equivalent", "exemption", "interpretation", "additional"):
            overlay = RequirementOverlayFactory(overlay_type=otype)
            assert overlay.overlay_type == otype

    def test_effective_dating(self):
        from datetime import date
        overlay = RequirementOverlayFactory(
            effective_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
        )
        assert overlay.effective_date == date(2024, 1, 1)
        assert overlay.expiry_date == date(2025, 12, 31)

    def test_optional_expiry_date(self):
        overlay = RequirementOverlayFactory(expiry_date=None)
        assert overlay.expiry_date is None


@pytest.mark.django_db
class TestApplicabilityLogic:
    def test_str(self):
        j = JurisdictionFactory(name="FFIEC")
        rule = ApplicabilityLogicFactory(jurisdiction=j, name="Large Bank Rule")
        result = str(rule)
        assert "FFIEC" in result
        assert "Large Bank Rule" in result

    def test_condition_type_choices(self):
        for ctype in ("always", "entity_type", "risk_rating", "threshold", "custom"):
            rule = ApplicabilityLogicFactory(condition_type=ctype)
            assert rule.condition_type == ctype

    def test_condition_config_json(self):
        config = {"entity_types": ["system", "vendor"]}
        rule = ApplicabilityLogicFactory(
            condition_type="entity_type",
            condition_config=config,
        )
        assert rule.condition_config == config

    def test_entity_scoped_rule(self):
        entity = AuditableEntityFactory()
        rule = ApplicabilityLogicFactory(auditable_entity=entity)
        assert rule.auditable_entity == entity

    def test_requirement_scoped_rule(self):
        req = FrameworkRequirementFactory()
        rule = ApplicabilityLogicFactory(framework_requirement=req)
        assert rule.framework_requirement == req

    def test_non_applicable_determination(self):
        rule = ApplicabilityLogicFactory(
            is_applicable=False,
            rationale="Entity is exempt based on asset size.",
        )
        assert rule.is_applicable is False
        assert rule.rationale != ""

    def test_effective_dating(self):
        from datetime import date
        rule = ApplicabilityLogicFactory(
            effective_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
        )
        assert rule.effective_date == date(2024, 1, 1)
        assert rule.expiry_date == date(2025, 12, 31)
