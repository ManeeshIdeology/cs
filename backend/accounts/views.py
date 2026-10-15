from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.constants import DEFAULT_SERVICE_STATUS, DEFAULT_STATE_UT, MAX_NOTES_PER_USER, SERVICE_STATUSES, STATES_UTS, TOPICS

from .emails import send_password_reset_email
from .models import User
from .serializers import (
    LoginSerializer, PasswordChangeSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer,
    ProfileSerializer, SignupSerializer, UserSerializer,
)


class CsrfView(APIView):
    """Sets the csrftoken cookie. The SPA calls this once on start-up."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class MetaView(APIView):
    """Reference data for forms (topics, States/UTs, ...)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "topics": [{"key": k, "title": t} for k, t in TOPICS],
                "states": STATES_UTS,
                "service_statuses": SERVICE_STATUSES,
                "max_notes": MAX_NOTES_PER_USER,
                "defaults": {"service_status": DEFAULT_SERVICE_STATUS, "state_ut": DEFAULT_STATE_UT},
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class PublicAuthView(APIView):
    """Pre-login endpoints still enforce CSRF and are rate limited."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class SignupView(PublicAuthView):
    def post(self, request):
        s = SignupSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(PublicAuthView):
    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = authenticate(
            request, username=s.validated_data["email"].strip().lower(), password=s.validated_data["password"]
        )
        if user is None:
            return Response({"detail": "Incorrect email or password."}, status=status.HTTP_400_BAD_REQUEST)
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        s = ProfileSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class PasswordChangeView(APIView):
    def post(self, request):
        s = PasswordChangeSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        request.user.set_password(s.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        update_session_auth_hash(request, request.user)  # keep this session logged in
        return Response({"detail": "Password updated."})


class PasswordResetRequestView(PublicAuthView):
    """Always answers the same way, so the form cannot be used to find out who has an account."""

    throttle_scope = "password_reset"

    def post(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=s.validated_data["email"].strip(), is_active=True).first()
        if user:
            send_password_reset_email(request, user)
        return Response({"detail": "If an account exists for that email, a reset link has been sent."})


class PasswordResetConfirmView(PublicAuthView):
    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.validated_data["user"]
        user.set_password(s.validated_data["new_password"])
        user.save(update_fields=["password"])  # also invalidates the token and other sessions' hashes
        return Response({"detail": "Your password has been changed. You can now log in."})
