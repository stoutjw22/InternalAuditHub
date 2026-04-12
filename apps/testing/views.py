from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

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


# ── Nested convenience routes ──────────────────────────────────────────────────

class TestPlanInstanceListCreateView(generics.ListCreateAPIView):
    """Test instances scoped to a specific test plan."""

    serializer_class = TestInstanceSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return TestInstance.objects.filter(
            test_plan_id=self.kwargs["pk"]
        ).select_related("test_plan", "performed_by", "engagement_control")

    def create(self, request, *args, **kwargs):
        # Inject test_plan from URL so callers don't have to include it in the body.
        data = request.data.copy()
        data.setdefault("test_plan", str(self.kwargs["pk"]))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        get_object_or_404(TestPlan, pk=self.kwargs["pk"])  # 404 guard
        serializer.save()


class TestInstanceSampleListCreateView(generics.ListCreateAPIView):
    """Sample items scoped to a specific test instance."""

    serializer_class = SampleItemSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return SampleItem.objects.filter(
            test_instance_id=self.kwargs["pk"]
        ).select_related("test_instance", "evidence")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data.setdefault("test_instance", str(self.kwargs["pk"]))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save()


class TestInstanceExceptionListCreateView(generics.ListCreateAPIView):
    """Test exceptions scoped to a specific test instance."""

    serializer_class = TestExceptionSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return TestException.objects.filter(
            test_instance_id=self.kwargs["pk"]
        ).select_related("sample_item", "finding", "resolved_by", "created_by")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data.setdefault("test_instance", str(self.kwargs["pk"]))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# ── Action endpoints ───────────────────────────────────────────────────────────

class TestInstanceConcludeView(APIView):
    """
    Calculate operating effectiveness from sample results and save.
    Also rolls up to the linked EngagementControl if one is set.
    """

    permission_classes = [IsAuditorOrAbove]

    def post(self, request, pk):
        instance = get_object_or_404(
            TestInstance.objects.select_related("test_plan", "engagement_control"),
            pk=pk,
        )

        items = instance.sample_items.exclude(result="na")
        if not items.exists():
            return Response(
                {"error": "No testable sample items to conclude on."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total = items.count()
        failed = items.filter(result__in=["fail", "exception"]).count()
        exception_rate = failed / total * 100
        tolerable = float(instance.test_plan.tolerable_exception_rate or 0)

        if exception_rate == 0:
            oe_status = TestInstance.OperatingEffectivenessStatus.EFFECTIVE
        elif exception_rate <= tolerable:
            oe_status = TestInstance.OperatingEffectivenessStatus.PARTIALLY_EFFECTIVE
        else:
            oe_status = TestInstance.OperatingEffectivenessStatus.INEFFECTIVE

        instance.operating_effectiveness_status = oe_status
        instance.performed_at = timezone.now()
        instance.performed_by = request.user
        instance.save(update_fields=[
            "operating_effectiveness_status", "performed_at", "performed_by", "updated_at"
        ])

        instance.rollup_to_engagement_control()

        return Response(
            TestInstanceSerializer(instance, context={"request": request}).data
        )


class TestExceptionEscalateView(APIView):
    """
    Create a formal Finding from a test exception and link the two records.
    Idempotent: returns 400 if already escalated.
    """

    permission_classes = [IsAuditorOrAbove]

    def post(self, request, pk):
        exc = get_object_or_404(
            TestException.objects.select_related(
                "test_instance__test_plan__control",
                "test_instance__test_plan__engagement",
            ),
            pk=pk,
        )

        if exc.finding_id:
            return Response(
                {"error": "Already escalated to a finding."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        engagement = exc.test_instance.test_plan.engagement
        if not engagement:
            return Response(
                {"error": "Test plan has no engagement; cannot create Finding."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.findings.models import Finding

        finding = Finding.objects.create(
            engagement=engagement,
            title=exc.title,
            description=exc.description,
            finding_type="control_deficiency",
            severity=exc.severity,
            control=exc.test_instance.test_plan.control,
            identified_by=request.user,
            identified_date=timezone.now().date(),
            created_by=request.user,
        )

        exc.finding = finding
        exc.save(update_fields=["finding", "updated_at"])

        return Response(
            TestExceptionSerializer(exc, context={"request": request}).data
        )


class TestInstanceStatisticsView(APIView):
    """Aggregate statistics for a test instance (compliance rate, exception counts)."""

    permission_classes = [IsAuditorOrAbove]

    def get(self, request, pk):
        instance = get_object_or_404(TestInstance, pk=pk)

        from django.db.models import Count

        items = instance.sample_items.all()
        testable = items.exclude(result="na")
        total = testable.count()
        passed = testable.filter(result="pass").count()

        exc_by_sev = {
            row["severity"]: row["n"]
            for row in instance.exceptions.values("severity").annotate(n=Count("id"))
        }

        return Response({
            "total_samples": items.count(),
            "testable_samples": total,
            "passed": passed,
            "failed": testable.filter(result__in=["fail", "exception"]).count(),
            "compliance_rate": round(passed / total * 100, 1) if total else None,
            "exception_count": instance.exceptions.count(),
            "exceptions_by_severity": exc_by_sev,
        })
