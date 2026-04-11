from rest_framework import generics

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import AssertionType, SampleItem, TestException, TestInstance, TestPlan, TestingMethod
from .serializers import (
    AssertionTypeSerializer,
    SampleItemSerializer,
    TestExceptionSerializer,
    TestInstanceSerializer,
    TestPlanSerializer,
    TestingMethodSerializer,
)


class TestingMethodListCreateView(generics.ListCreateAPIView):
    serializer_class = TestingMethodSerializer
    filterset_fields = ["method_type"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "method_type"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = TestingMethod.objects.all()


class TestingMethodDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TestingMethodSerializer
    queryset = TestingMethod.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class AssertionTypeListCreateView(generics.ListCreateAPIView):
    serializer_class = AssertionTypeSerializer
    search_fields = ["name", "description"]
    ordering = ["name"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = AssertionType.objects.all()


class AssertionTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AssertionTypeSerializer
    queryset = AssertionType.objects.all()

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]


class TestPlanListCreateView(generics.ListCreateAPIView):
    serializer_class = TestPlanSerializer
    filterset_fields = [
        "control", "engagement", "status",
        "design_effectiveness_status", "sampling_method",
    ]
    search_fields = ["name", "description", "control__name"]
    ordering_fields = ["name", "status", "planned_date", "created_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return TestPlan.objects.select_related(
            "control", "engagement", "testing_method", "planned_by", "created_by"
        ).prefetch_related("assertion_types")


class TestPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TestPlanSerializer
    queryset = TestPlan.objects.select_related(
        "control", "engagement", "testing_method"
    ).prefetch_related("assertion_types")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]


class TestInstanceListCreateView(generics.ListCreateAPIView):
    serializer_class = TestInstanceSerializer
    filterset_fields = ["test_plan", "operating_effectiveness_status"]
    search_fields = ["conclusion", "notes", "test_plan__name"]
    ordering_fields = ["test_plan", "instance_number", "performed_at"]
    ordering = ["test_plan", "instance_number"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return TestInstance.objects.select_related(
            "test_plan", "performed_by"
        )


class TestInstanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TestInstanceSerializer
    queryset = TestInstance.objects.select_related("test_plan", "performed_by")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]


class SampleItemListCreateView(generics.ListCreateAPIView):
    serializer_class = SampleItemSerializer
    filterset_fields = ["test_instance", "result"]
    search_fields = ["item_identifier", "description"]
    ordering_fields = ["item_identifier", "result"]
    ordering = ["test_instance", "item_identifier"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return SampleItem.objects.select_related("test_instance", "evidence")


class SampleItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SampleItemSerializer
    queryset = SampleItem.objects.select_related("test_instance", "evidence")

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]


class TestExceptionListCreateView(generics.ListCreateAPIView):
    serializer_class = TestExceptionSerializer
    filterset_fields = ["test_instance", "exception_type", "severity", "finding"]
    search_fields = ["title", "description"]
    ordering_fields = ["severity", "exception_type", "created_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return TestException.objects.select_related(
            "test_instance", "sample_item", "finding",
            "resolved_by", "created_by"
        )


class TestExceptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TestExceptionSerializer
    queryset = TestException.objects.select_related(
        "test_instance", "sample_item", "finding", "resolved_by"
    )

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditorOrAbove()]
        return [IsAuditorOrAbove()]
