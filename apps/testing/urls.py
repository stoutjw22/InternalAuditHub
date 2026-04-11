from django.urls import path

from .views import (
    AssertionTypeDetailView,
    AssertionTypeListCreateView,
    SampleItemDetailView,
    SampleItemListCreateView,
    TestExceptionDetailView,
    TestExceptionListCreateView,
    TestInstanceDetailView,
    TestInstanceListCreateView,
    TestPlanDetailView,
    TestPlanListCreateView,
    TestingMethodDetailView,
    TestingMethodListCreateView,
)

urlpatterns = [
    path("testing-methods/", TestingMethodListCreateView.as_view(), name="testing-method-list"),
    path("testing-methods/<uuid:pk>/", TestingMethodDetailView.as_view(), name="testing-method-detail"),
    path("assertion-types/", AssertionTypeListCreateView.as_view(), name="assertion-type-list"),
    path("assertion-types/<uuid:pk>/", AssertionTypeDetailView.as_view(), name="assertion-type-detail"),
    path("test-plans/", TestPlanListCreateView.as_view(), name="test-plan-list"),
    path("test-plans/<uuid:pk>/", TestPlanDetailView.as_view(), name="test-plan-detail"),
    path("test-instances/", TestInstanceListCreateView.as_view(), name="test-instance-list"),
    path("test-instances/<uuid:pk>/", TestInstanceDetailView.as_view(), name="test-instance-detail"),
    path("sample-items/", SampleItemListCreateView.as_view(), name="sample-item-list"),
    path("sample-items/<uuid:pk>/", SampleItemDetailView.as_view(), name="sample-item-detail"),
    path("test-exceptions/", TestExceptionListCreateView.as_view(), name="test-exception-list"),
    path("test-exceptions/<uuid:pk>/", TestExceptionDetailView.as_view(), name="test-exception-detail"),
]
