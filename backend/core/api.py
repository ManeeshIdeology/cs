import logging

from django.db import OperationalError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

log = logging.getLogger(__name__)


def _first_message(data):
    """Flatten DRF error structures to one readable sentence."""
    if isinstance(data, (list, tuple)):
        return _first_message(data[0]) if data else ""
    if isinstance(data, dict):
        for v in data.values():
            m = _first_message(v)
            if m:
                return m
        return ""
    return str(data)


def exception_handler(exc, context):
    """Uniform error body: {"detail": "...", "fields": {"field": ["msg", ...]}}."""
    response = drf_exception_handler(exc, context)
    if response is None:
        if isinstance(exc, OperationalError) and "locked" in str(exc).lower():
            # Many writers at the same instant: ask the browser to try again instead of showing a server error.
            log.warning("database busy: %s", exc)
            return Response(
                {"detail": "The server is busy for a moment. Your work will be saved automatically - please wait."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
                headers={"Retry-After": "3"},
            )
        return None
    data = response.data
    if isinstance(data, dict) and set(data) == {"detail"}:
        if not isinstance(data["detail"], str):  # e.g. ValidationError({"detail": "..."})
            response.data = {"detail": _first_message(data["detail"])}
        return response
    if isinstance(data, dict):
        fields = {k: v if isinstance(v, list) else [v] for k, v in data.items() if k != "non_field_errors"}
        non_field = data.get("non_field_errors")
        detail = _first_message(non_field) if non_field else "Please correct the highlighted fields."
        response.data = {"detail": detail, "fields": fields}
    else:
        response.data = {"detail": _first_message(data)}
    return response
