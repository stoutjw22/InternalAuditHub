"""Model tests for the frameworks app."""
import pytest

from conftest import (
    CitationSourceFactory,
    ControlActivityFactory,
    ControlFactory,
    ControlObjectiveFactory,
    ControlRequirementMappingFactory,
    FrameworkFactory,
    FrameworkRequirementFactory,
)


@pytest.mark.django_db
class TestCitationSource:
    def test_str(self):
        source = CitationSourceFactory(name="NIST SP 800-53")
        assert str(source) == "NIST SP 800-53"

    def test_source_type_choices(self):
        for st in ("regulation", "standard", "guidance", "internal_policy", "other"):
            source = CitationSourceFactory(source_type=st)
            assert source.source_type == st


@pytest.mark.django_db
class TestFramework:
    def test_str_with_version(self):
        fw = FrameworkFactory(short_name="SOC2", version="2022")
        assert str(fw) == "SOC2 v2022"

    def test_str_without_version(self):
        fw = FrameworkFactory(short_name="ISO27001", version="")
        assert str(fw) == "ISO27001"

    def test_framework_type_choices(self):
        for ftype in ("security", "privacy", "financial", "operational", "compliance", "governance", "other"):
            fw = FrameworkFactory(framework_type=ftype)
            assert fw.framework_type == ftype

    def test_requirement_reverse_relation(self):
        fw = FrameworkFactory()
        FrameworkRequirementFactory(framework=fw)
        FrameworkRequirementFactory(framework=fw)
        assert fw.requirements.count() == 2

    def test_effective_dating_fields(self):
        from datetime import date
        fw = FrameworkFactory(
            effective_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
        )
        assert fw.effective_date == date(2024, 1, 1)
        assert fw.expiry_date == date(2025, 12, 31)


@pytest.mark.django_db
class TestFrameworkRequirement:
    def test_str(self):
        fw = FrameworkFactory(short_name="PCIDSS")
        req = FrameworkRequirementFactory(
            framework=fw,
            requirement_id="3.4",
            title="Protect stored account data",
        )
        assert "PCIDSS" in str(req)
        assert "3.4" in str(req)

    def test_unique_together_framework_requirement_id(self):
        from django.db import IntegrityError
        fw = FrameworkFactory()
        FrameworkRequirementFactory(framework=fw, requirement_id="A.1")
        with pytest.raises(IntegrityError):
            FrameworkRequirementFactory(framework=fw, requirement_id="A.1")

    def test_same_id_different_framework_allowed(self):
        fw1 = FrameworkFactory()
        fw2 = FrameworkFactory()
        r1 = FrameworkRequirementFactory(framework=fw1, requirement_id="1.1")
        r2 = FrameworkRequirementFactory(framework=fw2, requirement_id="1.1")
        assert r1.pk != r2.pk

    def test_parent_child_hierarchy(self):
        fw = FrameworkFactory()
        parent = FrameworkRequirementFactory(framework=fw, requirement_id="CC6")
        child1 = FrameworkRequirementFactory(framework=fw, requirement_id="CC6.1", parent=parent)
        child2 = FrameworkRequirementFactory(framework=fw, requirement_id="CC6.2", parent=parent)
        assert parent.children.count() == 2
        assert child1.parent == parent
        assert child2.parent == parent

    def test_requirement_type_choices(self):
        for rtype in ("objective", "control", "policy", "procedure", "principle", "criterion", "other"):
            req = FrameworkRequirementFactory(requirement_type=rtype)
            assert req.requirement_type == rtype


@pytest.mark.django_db
class TestControlObjective:
    def test_str_with_reference(self):
        obj = ControlObjectiveFactory(reference_code="CO-001", name="Access Control")
        assert "[CO-001]" in str(obj)
        assert "Access Control" in str(obj)

    def test_str_without_reference(self):
        obj = ControlObjectiveFactory(reference_code="", name="Encryption")
        assert str(obj) == "Encryption"

    def test_framework_requirements_m2m(self):
        obj = ControlObjectiveFactory()
        req1 = FrameworkRequirementFactory()
        req2 = FrameworkRequirementFactory()
        obj.framework_requirements.add(req1, req2)
        assert obj.framework_requirements.count() == 2


@pytest.mark.django_db
class TestControlActivity:
    def test_str(self):
        ctrl = ControlFactory(name="Password Policy")
        activity = ControlActivityFactory(name="Monthly Review", control=ctrl)
        assert "Password Policy" in str(activity)
        assert "Monthly Review" in str(activity)

    def test_activity_type_choices(self):
        for atype in ("preventive", "detective", "corrective", "directive", "compensating"):
            a = ControlActivityFactory(activity_type=atype)
            assert a.activity_type == atype

    def test_framework_requirements_m2m(self):
        activity = ControlActivityFactory()
        req = FrameworkRequirementFactory()
        activity.framework_requirements.add(req)
        assert activity.framework_requirements.count() == 1


@pytest.mark.django_db
class TestControlRequirementMapping:
    def test_str(self):
        mapping = ControlRequirementMappingFactory()
        result = str(mapping)
        assert "→" in result

    def test_unique_together_control_requirement(self):
        from django.db import IntegrityError
        ctrl = ControlFactory()
        req = FrameworkRequirementFactory()
        ControlRequirementMappingFactory(control=ctrl, framework_requirement=req)
        with pytest.raises(IntegrityError):
            ControlRequirementMappingFactory(control=ctrl, framework_requirement=req)

    def test_mapping_type_choices(self):
        for mtype in ("satisfies", "partially_satisfies", "addresses", "compensates"):
            mapping = ControlRequirementMappingFactory(mapping_type=mtype)
            assert mapping.mapping_type == mtype

    def test_effective_dating_fields(self):
        from datetime import date
        mapping = ControlRequirementMappingFactory(
            effective_date=date(2024, 1, 1),
            expiry_date=date(2025, 12, 31),
        )
        assert mapping.effective_date == date(2024, 1, 1)
        assert mapping.expiry_date == date(2025, 12, 31)
