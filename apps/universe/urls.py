from django.urls import path

from .views import (
    AuditableDomainDetailView,
    AuditableDomainListCreateView,
    AuditableEntityDetailView,
    AuditableEntityListCreateView,
    SubprocessDetailView,
    SubprocessListCreateView,
)

urlpatterns = [
    path("auditable-domains/", AuditableDomainListCreateView.as_view(), name="auditable-domain-list"),
    path("auditable-domains/<uuid:pk>/", AuditableDomainDetailView.as_view(), name="auditable-domain-detail"),
    path("auditable-entities/", AuditableEntityListCreateView.as_view(), name="auditable-entity-list"),
    path("auditable-entities/<uuid:pk>/", AuditableEntityDetailView.as_view(), name="auditable-entity-detail"),
    path("subprocesses/", SubprocessListCreateView.as_view(), name="subprocess-list"),
    path("subprocesses/<uuid:pk>/", SubprocessDetailView.as_view(), name="subprocess-detail"),
]
