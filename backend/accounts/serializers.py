from django.contrib.auth import password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from core.constants import SERVICE_STATUSES, STATES_UTS

from .models import User

PROFILE_FIELDS = [
    "name", "designation", "batch", "service_status", "training_institute", "current_posting", "state_ut",
]


class ProfileValidationMixin:
    """Section-1 style officer details, shared by sign-up and profile edit."""

    def validate_service_status(self, v):
        if v not in SERVICE_STATUSES:
            raise serializers.ValidationError("Choose Probationer or Confirmed.")
        return v

    def validate_state_ut(self, v):
        if v not in STATES_UTS:
            raise serializers.ValidationError("Choose your State / UT.")
        return v


class UserSerializer(serializers.ModelSerializer):
    is_admin = serializers.BooleanField(source="is_staff", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "is_admin", "date_joined", *PROFILE_FIELDS]
        read_only_fields = ["id", "email", "is_admin", "date_joined"]


class AdminUserSerializer(UserSerializer):
    notes_total = serializers.IntegerField(read_only=True)
    notes_submitted = serializers.IntegerField(read_only=True)

    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "notes_total", "notes_submitted"]
        read_only_fields = fields


class ProfileSerializer(ProfileValidationMixin, UserSerializer):
    """Profile editing; the admin account may leave officer details blank."""

    def validate_service_status(self, v):
        return v if v == "" and self.instance and self.instance.is_staff else super().validate_service_status(v)

    def validate_state_ut(self, v):
        return v if v == "" and self.instance and self.instance.is_staff else super().validate_state_ut(v)

    def validate(self, attrs):
        required = (
            ["name"]
            if self.instance and self.instance.is_staff
            else ["name", "designation", "batch", "service_status", "current_posting", "state_ut"]
        )
        merged = {f: attrs.get(f, getattr(self.instance, f, "")) for f in required}
        errors = {f: ["This field is required."] for f, v in merged.items() if not str(v).strip()}
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class SignupSerializer(ProfileValidationMixin, serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, style={"input_type": "password"}, trim_whitespace=False)
    designation = serializers.CharField(max_length=200)
    batch = serializers.CharField(max_length=100)
    current_posting = serializers.CharField(max_length=300)
    training_institute = serializers.CharField(max_length=250, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "password", *PROFILE_FIELDS]
        extra_kwargs = {"service_status": {"required": True}, "state_ut": {"required": True}}

    def validate_email(self, v):
        v = v.strip().lower()
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("An account with this email already exists. Please log in.")
        return v

    def validate(self, attrs):
        probe = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            password_validation.validate_password(attrs["password"], probe)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated):
        return User.objects.create_user(**validated)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={"input_type": "password"}, trim_whitespace=False)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(min_length=8, trim_whitespace=False)

    def validate_current_password(self, v):
        if not self.context["request"].user.check_password(v):
            raise serializers.ValidationError("Current password is incorrect.")
        return v

    def validate_new_password(self, v):
        try:
            password_validation.validate_password(v, self.context["request"].user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return v


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, trim_whitespace=False)

    def validate(self, attrs):
        invalid = serializers.ValidationError({"detail": "This reset link is invalid or has expired. Please request a new one."})
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(attrs["uid"])), is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise invalid
        if not default_token_generator.check_token(user, attrs["token"]):
            raise invalid
        try:
            password_validation.validate_password(attrs["new_password"], user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})
        attrs["user"] = user
        return attrs
