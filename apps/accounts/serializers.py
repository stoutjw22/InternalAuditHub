"""
Account serializers — registration, login, profile, password change.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT pair serializer to include basic profile data
    in the token response so the frontend doesn't need a separate /me call
    right after login.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserProfileSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed role in the token payload so the frontend can gate UI without
        # an extra API call — do NOT store sensitive data here.
        token["role"] = user.role
        token["email"] = user.email
        return token


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Used by admins or self-registration (if enabled)."""

    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            "email",
            "username",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
            "role",
            "department",
            "title",
            "phone",
        )
        extra_kwargs = {
            "role": {"required": False},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Read/write profile — never exposes password."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "department",
            "title",
            "phone",
            "avatar",
            "is_azure_user",
            "is_active",
            "date_joined",
            "last_login",
        )
        read_only_fields = (
            "id",
            "email",
            "is_azure_user",
            "date_joined",
            "last_login",
        )

    def get_full_name(self, obj) -> str:
        return obj.get_full_name()


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdown/autocomplete lists."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role", "department")

    def get_full_name(self, obj) -> str:
        return obj.get_full_name()


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, write_only=True, validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return attrs

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        return user
