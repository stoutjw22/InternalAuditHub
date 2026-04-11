"""
Shared test factories and fixtures for all InternalAuditHub apps.

Factories are defined here so every app's tests can import them without
circular dependencies.  Role-specific user fixtures and pre-authenticated
API-client fixtures are also provided for convenience.
"""
import uuid

import factory
import pytest
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory
from rest_framework.test import APIClient

User = get_user_model()


# ── User factory ───────────────────────────────────────────────────────────────

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.Sequence(lambda n: f"user{n}")
    first_name = "Test"
    last_name = factory.Sequence(lambda n: f"User{n}")
    role = "read_only"
    is_active = True

    @factory.post_generation
    def password(obj, create, extracted, **kwargs):  # noqa: N805
        raw = extracted or "StrongPass123!"
        obj.set_password(raw)
        if create:
            obj.save(update_fields=["password"])


# ── Core factories ─────────────────────────────────────────────────────────────

class BusinessProcessFactory(DjangoModelFactory):
    class Meta:
        model = "core.BusinessProcess"

    name = factory.Sequence(lambda n: f"Business Process {n}")
    description = "A test business process."
    is_active = True


class BusinessObjectiveFactory(DjangoModelFactory):
    class Meta:
        model = "core.BusinessObjective"

    name = factory.Sequence(lambda n: f"Business Objective {n}")
    description = "A test business objective."


# ── Engagement factories ───────────────────────────────────────────────────────

class AuditEngagementFactory(DjangoModelFactory):
    class Meta:
        model = "engagements.AuditEngagement"

    name = factory.Sequence(lambda n: f"Audit Engagement {n}")
    description = "Test engagement description."
    status = "planning"
    audit_manager = factory.SubFactory(UserFactory, role="audit_manager")
    period = "Q1 2026"


class EngagementAuditorFactory(DjangoModelFactory):
    class Meta:
        model = "engagements.EngagementAuditor"

    engagement = factory.SubFactory(AuditEngagementFactory)
    auditor = factory.SubFactory(UserFactory, role="auditor")
    role_key = "RoleKey1"


class AuditTaskFactory(DjangoModelFactory):
    class Meta:
        model = "engagements.AuditTask"

    engagement = factory.SubFactory(AuditEngagementFactory)
    name = factory.Sequence(lambda n: f"Audit Task {n}")
    description = "A test task."
    status = "todo"
    priority = "medium"


# ── Risk factories ─────────────────────────────────────────────────────────────

class RiskFactory(DjangoModelFactory):
    class Meta:
        model = "risks.Risk"

    name = factory.Sequence(lambda n: f"Risk {n}")
    description = "A test risk."
    category = "operational"
    status = "identified"
    inherent_likelihood = 3
    inherent_impact = 3


class EngagementRiskFactory(DjangoModelFactory):
    class Meta:
        model = "risks.EngagementRisk"

    engagement = factory.SubFactory(AuditEngagementFactory)
    risk = factory.SubFactory(RiskFactory)
    is_in_scope = True


# ── Control factories ──────────────────────────────────────────────────────────

class ControlFactory(DjangoModelFactory):
    class Meta:
        model = "controls.Control"

    name = factory.Sequence(lambda n: f"Control {n}")
    description = "A test control."
    control_type = "preventive"
    frequency = "monthly"
    status = "active"


class EngagementControlFactory(DjangoModelFactory):
    class Meta:
        model = "controls.EngagementControl"

    engagement = factory.SubFactory(AuditEngagementFactory)
    control = factory.SubFactory(ControlFactory)
    test_result = "not_tested"
    effectiveness_rating = "not_assessed"


# ── Finding factories ──────────────────────────────────────────────────────────

class FindingFactory(DjangoModelFactory):
    class Meta:
        model = "findings.Finding"

    engagement = factory.SubFactory(AuditEngagementFactory)
    title = factory.Sequence(lambda n: f"Finding {n}")
    description = "A test finding description."
    finding_type = "control_deficiency"
    severity = "medium"
    status = "draft"


class RemediationActionFactory(DjangoModelFactory):
    class Meta:
        model = "findings.RemediationAction"

    finding = factory.SubFactory(FindingFactory)
    description = "Remediate by updating the control framework."
    status = "open"


class ApprovalRequestFactory(DjangoModelFactory):
    class Meta:
        model = "findings.ApprovalRequest"

    entity_type = "finding"
    entity_id = factory.LazyFunction(uuid.uuid4)
    entity_name = "Test Finding"
    requested_by = factory.SubFactory(UserFactory, role="auditor")
    approver = factory.SubFactory(UserFactory, role="audit_manager")
    status = "pending"


# ── Report factories ───────────────────────────────────────────────────────────

class AuditReportTemplateFactory(DjangoModelFactory):
    class Meta:
        model = "reports.AuditReportTemplate"

    name = factory.Sequence(lambda n: f"Report Template {n}")
    description = "A reusable audit report template."
    content_template = "# {{engagement_name}}\n\n## Summary\n\n{{findings_summary}}"
    is_active = True


class AuditReportFactory(DjangoModelFactory):
    class Meta:
        model = "reports.AuditReport"

    engagement = factory.SubFactory(AuditEngagementFactory)
    title = factory.Sequence(lambda n: f"Audit Report {n}")
    executive_summary = "Executive summary of audit findings."
    content = "Detailed report content goes here."
    status = "draft"
    generated_by = factory.SubFactory(UserFactory, role="audit_manager")


# ── Role-specific user fixtures ────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    return UserFactory(role="admin")


@pytest.fixture
def manager_user(db):
    return UserFactory(role="audit_manager")


@pytest.fixture
def auditor_user(db):
    return UserFactory(role="auditor")


@pytest.fixture
def risk_owner_user(db):
    return UserFactory(role="risk_owner")


@pytest.fixture
def control_owner_user(db):
    return UserFactory(role="control_owner")


@pytest.fixture
def finding_owner_user(db):
    return UserFactory(role="finding_owner")


@pytest.fixture
def read_only_user(db):
    return UserFactory(role="read_only")


# ── Pre-authenticated API client fixtures ──────────────────────────────────────

@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def admin_client(db, admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def manager_client(db, manager_user):
    client = APIClient()
    client.force_authenticate(user=manager_user)
    return client


@pytest.fixture
def auditor_client(db, auditor_user):
    client = APIClient()
    client.force_authenticate(user=auditor_user)
    return client


@pytest.fixture
def risk_owner_client(db, risk_owner_user):
    client = APIClient()
    client.force_authenticate(user=risk_owner_user)
    return client


@pytest.fixture
def read_only_client(db, read_only_user):
    client = APIClient()
    client.force_authenticate(user=read_only_user)
    return client
