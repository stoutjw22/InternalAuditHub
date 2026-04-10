from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    MeView,
    PasswordChangeView,
    RegisterView,
    UserDetailView,
    UserListView,
)

urlpatterns = [
    # Token auth
    path("token/", CustomTokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("token/blacklist/", TokenBlacklistView.as_view(), name="token-blacklist"),
    # User management
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path("users/", UserListView.as_view(), name="user-list"),
    path("users/<uuid:pk>/", UserDetailView.as_view(), name="user-detail"),
]
