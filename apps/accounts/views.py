"""
Auth & account views.

Endpoints
---------
POST /api/v1/auth/register/       — create account (admin only by default)
POST /api/v1/auth/token/          — obtain JWT pair
POST /api/v1/auth/token/refresh/  — refresh access token
POST /api/v1/auth/token/blacklist/ — logout (blacklist refresh token)
GET/PATCH /api/v1/auth/me/        — current user profile
POST /api/v1/auth/password/change/ — change password
GET /api/v1/auth/users/           — list users (manager+)
"""
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .permissions import IsAuditManagerOrAbove, IsAdminRole
from .serializers import (
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    UserListSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login — returns access + refresh tokens plus basic profile."""

    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    """
    Create a new user account.
    Restricted to admins; change permission_classes if you want self-registration.
    """

    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAdminRole]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserProfileSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveUpdateAPIView):
    """Return or update the currently authenticated user's profile."""

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """Change password for the currently authenticated user."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."})


class UserListView(generics.ListAPIView):
    """
    List all active users.
    Used by dropdowns for assigning owners, auditors, etc.
    Audit managers and above can see the full list.
    """

    serializer_class = UserListSerializer
    permission_classes = [IsAuditManagerOrAbove]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["role", "is_active", "department"]
    search_fields = ["email", "first_name", "last_name", "department"]
    ordering_fields = ["last_name", "email", "role"]
    ordering = ["last_name"]

    def get_queryset(self):
        return User.objects.filter(is_active=True).only(
            "id", "email", "first_name", "last_name", "role", "department"
        )


class UserDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update any user (admin only)."""

    serializer_class = UserProfileSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.all()


class RoleFilteredUserListView(generics.ListAPIView):
    """
    List users filtered to a specific role.
    GET /api/v1/auth/users/auditors/
    GET /api/v1/auth/users/managers/
    GET /api/v1/auth/users/risk-owners/
    GET /api/v1/auth/users/control-owners/
    GET /api/v1/auth/users/finding-owners/
    Used by frontend dropdowns that need role-specific user lists.
    """

    serializer_class = UserListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["email", "first_name", "last_name", "department"]
    ordering = ["last_name"]

    ROLE_MAP = {
        "auditors": "auditor",
        "managers": "audit_manager",
        "risk-owners": "risk_owner",
        "control-owners": "control_owner",
        "finding-owners": "finding_owner",
    }

    def get_queryset(self):
        role_slug = self.kwargs.get("role_slug", "")
        role = self.ROLE_MAP.get(role_slug)
        qs = User.objects.filter(is_active=True).only(
            "id", "email", "first_name", "last_name", "role", "department"
        )
        if role:
            qs = qs.filter(role=role)
        return qs
