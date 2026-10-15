from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.core.cache import cache
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from core.constants import BATCH_YEARS, DEFAULT_SERVICE_STATUS, DEFAULT_STATE_UT, MAX_NOTES_PER_USER, SERVICE_STATUSES, STATES_UTS, TOPICS

from .emails import send_password_reset_email
from .models import User
from .serializers import (
    LoginSerializer, PasswordChangeSerializer, PasswordResetConfirmSerializer, PasswordResetRequestSerializer,
    ProfileSerializer, SignupSerializer, UserSerializer,
)


def meta_payload():
    return {
        "topics": [{"key": k, "title": t} for k, t in TOPICS],
        "states": STATES_UTS,
        "batches": BATCH_YEARS,
        "service_statuses": SERVICE_STATUSES,
        "max_notes": MAX_NOTES_PER_USER,
        "defaults": {"service_status": DEFAULT_SERVICE_STATUS, "state_ut": DEFAULT_STATE_UT},
    }


class CsrfView(APIView):
    """Sets the csrftoken cookie (the token itself is never put in a compressible response body)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        get_token(request)
        return Response({"ok": True})


class BootstrapView(APIView):
    """Everything the SPA needs to start, in ONE request: CSRF cookie + reference data + current user (or null)."""

    permission_classes = [AllowAny]

    def get(self, request):
        get_token(request)
        user = request.user if request.user.is_authenticated else None
        return Response({"meta": meta_payload(), "user": UserSerializer(user).data if user else None})


class MetaView(APIView):
    """Reference data for forms (topics, States/UTs, ...)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "topics": [{"key": k, "title": t} for k, t in TOPICS],
                "states": STATES_UTS,
                "batches": BATCH_YEARS,
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


LOGIN_FAIL_WINDOW = 15 * 60  # seconds
LOGIN_FAIL_PER_ACCOUNT_AND_IP = 8
LOGIN_FAIL_PER_ACCOUNT = 30


def _bump(key, window):
    cache.add(key, 0, window)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, window)


class LoginView(PublicAuthView):
    """Only *wrong* passwords count towards the limit, so many officers behind one office/hall IP can log in freely."""

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"].strip().lower()
        ip = self.get_throttles()[0].get_ident(request)
        k_pair, k_email = f"lf:{ip}:{email}", f"lfe:{email}"
        if cache.get(k_pair, 0) >= LOGIN_FAIL_PER_ACCOUNT_AND_IP or cache.get(k_email, 0) >= LOGIN_FAIL_PER_ACCOUNT:
            return Response(
                {"detail": "Too many wrong passwords for this account. Please wait 15 minutes, or use “Forgot your password?”."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        user = authenticate(request, username=email, password=s.validated_data["password"])
        if user is None:
            _bump(k_pair, LOGIN_FAIL_WINDOW)
            _bump(k_email, LOGIN_FAIL_WINDOW)
            return Response({"detail": "Incorrect email or password."}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(k_pair)
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
        email = s.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        key = f"pr:{email}"
        if user and cache.get(key, 0) < 5:  # at most 5 mails per address per hour (stops mail-bombing someone)
            _bump(key, 3600)
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
