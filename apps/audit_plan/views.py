"""
Views for the 6-Year Integrated Audit Plan app.

Permission model:
  - Auditors and above can read all resources.
  - Audit Managers and Admins can write (create/update/delete).
  - Import endpoint requires Audit Manager or Admin.
  - Summary is read-only for all authenticated users.
"""
from django.db import transaction

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAuditManagerOrAbove, IsAuditorOrAbove

from .models import (
    AuditableEntity,
    AuditPlanSummary,
    AuditPlanYear,
    ControlEffectivenessScale,
    ControlRelianceCycle,
    GRCTestingTheme,
    KeyControlAssignment,
    MARTestingEngagement,
    RiskScoringConfig,
)
from .serializers import (
    AuditPlanBulkImportSerializer,
    AuditPlanRiskScoringConfigSerializer,
    AuditPlanSummarySerializer,
    AuditPlanYearSerializer,
    AuditableEntityDetailSerializer,
    AuditableEntitySerializer,
    ControlEffectivenessScaleSerializer,
    ControlRelianceCycleSerializer,
    GRCTestingThemeSerializer,
    KeyControlAssignmentSerializer,
    MARTestingEngagementSerializer,
)


# ── AuditableEntity ───────────────────────────────────────────────────────────

class AuditableEntityListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditableEntitySerializer
    filterset_fields = ["domain", "residual_level", "mar_required"]
    search_fields = ["au_id", "name", "primary_clusters", "frameworks"]
    ordering_fields = ["rank", "au_id", "name", "priority_score", "residual_level"]
    ordering = ["rank", "au_id"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        qs = AuditableEntity.objects.all()
        # Optional filter by planned fiscal year
        fiscal_year = self.request.query_params.get("fiscal_year")
        if fiscal_year:
            qs = qs.filter(plan_years__fiscal_year=fiscal_year, plan_years__is_scheduled=True)
        return qs


class AuditableEntityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Full entity detail including nested plan years and controls."""

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AuditableEntityDetailSerializer
        return AuditableEntitySerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditableEntity.objects.prefetch_related(
            "plan_years",
            "assigned_controls",
            "assigned_controls__reliance_cycles",
        )


# ── Nested plan years for an entity ──────────────────────────────────────────

class EntityPlanYearsView(generics.ListCreateAPIView):
    serializer_class = AuditPlanYearSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditPlanYear.objects.filter(
            au_id=self.kwargs["pk"]
        ).select_related("au")

    def perform_create(self, serializer):
        entity = AuditableEntity.objects.get(pk=self.kwargs["pk"])
        serializer.save(au=entity)


# ── Nested controls for an entity ─────────────────────────────────────────────

class EntityControlsView(generics.ListAPIView):
    serializer_class = KeyControlAssignmentSerializer
    permission_classes = [IsAuditorOrAbove]

    def get_queryset(self):
        return KeyControlAssignment.objects.filter(
            assigned_au_id=self.kwargs["pk"]
        ).prefetch_related("reliance_cycles")


# ── AuditPlanYear ─────────────────────────────────────────────────────────────

class AuditPlanYearListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditPlanYearSerializer
    filterset_fields = ["fiscal_year", "status", "is_scheduled", "quarter"]
    ordering_fields = ["fiscal_year", "au__rank"]
    ordering = ["fiscal_year", "au__rank"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return AuditPlanYear.objects.select_related("au").all()


class AuditPlanYearDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditPlanYearSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = AuditPlanYear.objects.select_related("au")


# ── RiskScoringConfig ─────────────────────────────────────────────────────────

class RiskScoringConfigListCreateView(generics.ListCreateAPIView):
    serializer_class = AuditPlanRiskScoringConfigSerializer
    filterset_fields = ["is_active"]
    ordering = ["-weight"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return RiskScoringConfig.objects.all()


class RiskScoringConfigDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AuditPlanRiskScoringConfigSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = RiskScoringConfig.objects.all()


# ── ControlEffectivenessScale ─────────────────────────────────────────────────

class ControlEffectivenessScaleListView(generics.ListCreateAPIView):
    serializer_class = ControlEffectivenessScaleSerializer
    ordering = ["-score"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = ControlEffectivenessScale.objects.all()


class ControlEffectivenessScaleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ControlEffectivenessScaleSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = ControlEffectivenessScale.objects.all()


# ── KeyControlAssignment ──────────────────────────────────────────────────────

class KeyControlAssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = KeyControlAssignmentSerializer
    filterset_fields = ["control_tier", "plan_year", "reliance_ready", "is_key_control", "baseline_complete"]
    search_fields = ["control_id", "control_name", "framework", "grc_domain"]
    ordering_fields = ["control_id", "control_tier", "plan_year"]
    ordering = ["control_id"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return KeyControlAssignment.objects.select_related("assigned_au").prefetch_related(
            "reliance_cycles"
        )


class KeyControlAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = KeyControlAssignmentSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = KeyControlAssignment.objects.select_related("assigned_au").prefetch_related(
        "reliance_cycles"
    )


# ── ControlRelianceCycle ──────────────────────────────────────────────────────

class ControlRelianceCycleListCreateView(generics.ListCreateAPIView):
    serializer_class = ControlRelianceCycleSerializer
    filterset_fields = ["cycle_year", "result"]
    ordering = ["control", "cycle_year"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    def get_queryset(self):
        return ControlRelianceCycle.objects.select_related("control")


class ControlRelianceCycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ControlRelianceCycleSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = ControlRelianceCycle.objects.select_related("control")


# ── GRCTestingTheme ───────────────────────────────────────────────────────────

class GRCTestingThemeListCreateView(generics.ListCreateAPIView):
    serializer_class = GRCTestingThemeSerializer
    filterset_fields = ["layer"]
    search_fields = ["sub_theme_code", "sub_theme_name", "domain"]
    ordering_fields = ["layer", "sub_theme_code"]
    ordering = ["layer", "sub_theme_code"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = GRCTestingTheme.objects.all()


class GRCTestingThemeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GRCTestingThemeSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = GRCTestingTheme.objects.all()


# ── MARTestingEngagement ──────────────────────────────────────────────────────

class MARTestingEngagementListCreateView(generics.ListCreateAPIView):
    serializer_class = MARTestingEngagementSerializer
    filterset_fields = ["fiscal_year", "test_type", "quarter"]
    search_fields = ["mar_test_area", "control_theme", "assigned_to"]
    ordering_fields = ["fiscal_year", "mar_test_area"]
    ordering = ["fiscal_year", "mar_test_area"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = MARTestingEngagement.objects.all()


class MARTestingEngagementDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MARTestingEngagementSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuditManagerOrAbove()]
        return [IsAuditorOrAbove()]

    queryset = MARTestingEngagement.objects.all()


# ── AuditPlanSummary (read-only) ──────────────────────────────────────────────

class AuditPlanSummaryListView(generics.ListAPIView):
    serializer_class = AuditPlanSummarySerializer
    permission_classes = [IsAuditorOrAbove]
    ordering = ["fiscal_year"]
    queryset = AuditPlanSummary.objects.all()


class AuditPlanSummaryDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AuditPlanSummarySerializer
    permission_classes = [IsAuditManagerOrAbove]
    queryset = AuditPlanSummary.objects.all()


# ── Bulk Import ───────────────────────────────────────────────────────────────

class BulkImportView(APIView):
    """
    POST /api/v1/audit-plan/import/

    Accepts a JSON payload and bulk-imports entities, controls, plan years,
    GRC themes, and MAR engagements in a single atomic transaction.

    Existing records are matched by their natural key (au_id, control_id, etc.)
    and updated; new records are created.
    """

    permission_classes = [IsAuditManagerOrAbove]

    def post(self, request):
        serializer = AuditPlanBulkImportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        results = {
            "entities": {"created": 0, "updated": 0},
            "plan_years": {"created": 0, "updated": 0},
            "controls": {"created": 0, "updated": 0},
            "grc_themes": {"created": 0, "updated": 0},
            "mar_engagements": {"created": 0, "updated": 0},
        }

        with transaction.atomic():
            # ── Entities ──────────────────────────────────────────────────────
            for entity_data in data.get("entities", []):
                obj, created = AuditableEntity.objects.update_or_create(
                    au_id=entity_data["au_id"],
                    defaults={k: v for k, v in entity_data.items() if k != "au_id"},
                )
                if created:
                    results["entities"]["created"] += 1
                else:
                    results["entities"]["updated"] += 1

            # ── Plan Years ────────────────────────────────────────────────────
            for py_data in data.get("plan_years", []):
                au = py_data.pop("au")
                fiscal_year = py_data.pop("fiscal_year")
                obj, created = AuditPlanYear.objects.update_or_create(
                    au=au,
                    fiscal_year=fiscal_year,
                    defaults=py_data,
                )
                if created:
                    results["plan_years"]["created"] += 1
                else:
                    results["plan_years"]["updated"] += 1

            # ── Controls ──────────────────────────────────────────────────────
            for ctrl_data in data.get("controls", []):
                control_id = ctrl_data.pop("control_id")
                obj, created = KeyControlAssignment.objects.update_or_create(
                    control_id=control_id,
                    defaults=ctrl_data,
                )
                if created:
                    results["controls"]["created"] += 1
                else:
                    results["controls"]["updated"] += 1

            # ── GRC Themes ────────────────────────────────────────────────────
            for theme_data in data.get("grc_themes", []):
                sub_code = theme_data.pop("sub_theme_code")
                obj, created = GRCTestingTheme.objects.update_or_create(
                    sub_theme_code=sub_code,
                    defaults=theme_data,
                )
                if created:
                    results["grc_themes"]["created"] += 1
                else:
                    results["grc_themes"]["updated"] += 1

            # ── MAR Engagements ───────────────────────────────────────────────
            for mar_data in data.get("mar_engagements", []):
                fiscal_year = mar_data.get("fiscal_year", 2031)
                mar_test_area = mar_data.get("mar_test_area")
                control_theme = mar_data.get("control_theme")
                obj, created = MARTestingEngagement.objects.update_or_create(
                    fiscal_year=fiscal_year,
                    mar_test_area=mar_test_area,
                    control_theme=control_theme,
                    defaults={
                        k: v for k, v in mar_data.items()
                        if k not in ("fiscal_year", "mar_test_area", "control_theme")
                    },
                )
                if created:
                    results["mar_engagements"]["created"] += 1
                else:
                    results["mar_engagements"]["updated"] += 1

        return Response(
            {"status": "success", "results": results},
            status=status.HTTP_200_OK,
        )
