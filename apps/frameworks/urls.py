from django.urls import path

from .views import (
    CitationSourceDetailView,
    CitationSourceListCreateView,
    ControlActivityDetailView,
    ControlActivityListCreateView,
    ControlObjectiveDetailView,
    ControlObjectiveListCreateView,
    ControlRequirementMappingDetailView,
    ControlRequirementMappingListCreateView,
    FrameworkDetailView,
    FrameworkListCreateView,
    FrameworkRequirementDetailView,
    FrameworkRequirementListCreateView,
)

urlpatterns = [
    path("citation-sources/", CitationSourceListCreateView.as_view(), name="citation-source-list"),
    path("citation-sources/<uuid:pk>/", CitationSourceDetailView.as_view(), name="citation-source-detail"),
    path("frameworks/", FrameworkListCreateView.as_view(), name="framework-list"),
    path("frameworks/<uuid:pk>/", FrameworkDetailView.as_view(), name="framework-detail"),
    path("framework-requirements/", FrameworkRequirementListCreateView.as_view(), name="framework-requirement-list"),
    path("framework-requirements/<uuid:pk>/", FrameworkRequirementDetailView.as_view(), name="framework-requirement-detail"),
    path("control-objectives/", ControlObjectiveListCreateView.as_view(), name="control-objective-list"),
    path("control-objectives/<uuid:pk>/", ControlObjectiveDetailView.as_view(), name="control-objective-detail"),
    path("control-activities/", ControlActivityListCreateView.as_view(), name="control-activity-list"),
    path("control-activities/<uuid:pk>/", ControlActivityDetailView.as_view(), name="control-activity-detail"),
    path("control-requirement-mappings/", ControlRequirementMappingListCreateView.as_view(), name="control-requirement-mapping-list"),
    path("control-requirement-mappings/<uuid:pk>/", ControlRequirementMappingDetailView.as_view(), name="control-requirement-mapping-detail"),
]
