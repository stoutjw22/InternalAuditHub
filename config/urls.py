"""Root URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.core.urls")),
    path("", include("apps.engagements.urls")),
    path("", include("apps.risks.urls")),
    path("", include("apps.controls.urls")),
    path("", include("apps.findings.urls")),
    path("", include("apps.reports.urls")),
    # Domain model expansion
    path("", include("apps.taxonomy.urls")),
    path("", include("apps.universe.urls")),
    path("", include("apps.frameworks.urls")),
    path("", include("apps.testing.urls")),
    path("", include("apps.jurisdictions.urls")),
    # 6-Year Integrated Audit Plan
    path("", include("apps.audit_plan.urls")),
    # OpenAPI schema
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_v1)),
    # allauth (used for Azure AD SSO callback)
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # django-debug-toolbar (only installed in dev)
    try:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
