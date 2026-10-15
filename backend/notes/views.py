import csv

from django.db.models import Count, Q
from django.http import HttpResponse
from rest_framework import generics, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.emails import send_password_reset_email
from accounts.serializers import AdminUserCreateSerializer, AdminUserSerializer
from core.constants import STATES_UTS, TOPIC_TITLES, TOPICS

from .models import Note
from .serializers import AdminNoteSerializer, NoteSerializer


class MyNoteViewSet(viewsets.ModelViewSet):
    """CRUD on the signed-in user's own notes (max one per topic, three in all)."""

    serializer_class = NoteSerializer
    pagination_class = None

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).order_by("id")


# ----------------------------------------------------------------------------- admin ----

class Page(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


def filter_notes(qs, params):
    """Shared by the admin list, CSV export and print views."""
    if params.get("topic") in TOPIC_TITLES:
        qs = qs.filter(topic=params["topic"])
    if params.get("state") in STATES_UTS:
        qs = qs.filter(user__state_ut=params["state"])
    if params.get("status") in (Note.DRAFT, Note.SUBMITTED):
        qs = qs.filter(status=params["status"])
    if params.get("service_status") in ("Probationer", "Confirmed"):
        qs = qs.filter(service_status=params["service_status"])
    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(user__email__icontains=q) | Q(current_posting__icontains=q) | Q(designation__icontains=q))
    return qs


class AdminNoteList(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminNoteSerializer
    pagination_class = Page

    def get_queryset(self):
        qs = filter_notes(Note.objects.select_related("user"), self.request.query_params)
        return qs.order_by("name", "id")


class AdminNoteDetail(generics.RetrieveAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminNoteSerializer
    queryset = Note.objects.select_related("user")


class AdminNoteCsv(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = filter_notes(Note.objects.select_related("user"), request.query_params).order_by("name", "id")
        resp = HttpResponse(content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="feedback-notes.csv"'
        resp.write("﻿")  # BOM so Excel opens UTF-8 correctly
        w = csv.writer(resp)
        w.writerow([
            "Name", "Email", "State/UT", "Designation", "Batch", "Service status", "Training institute", "Current posting",
            "Topic", "Status", "Policy gaps and challenges", "Potential solutions", "Best practices", "Submitted at",
        ])
        for n in qs.iterator():
            w.writerow([
                _safe(n.name), n.user.email, n.user.state_ut, _safe(n.designation), _safe(n.batch), n.service_status,
                _safe(n.training_institute), _safe(n.current_posting), TOPIC_TITLES[n.topic], n.status,
                _safe(n.policy_gaps), _safe(n.potential_solutions), _safe(n.best_practices),
                n.submitted_at.isoformat(timespec="minutes") if n.submitted_at else "",
            ])
        return resp


def _safe(v):
    """Stop spreadsheet formula injection (cells starting with = + - @)."""
    v = v or ""
    return "'" + v if v[:1] in ("=", "+", "-", "@", "\t", "\r") else v


class AdminUserList(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    pagination_class = Page

    def get_serializer_class(self):
        return AdminUserCreateSerializer if self.request.method == "POST" else AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.annotate(
            notes_total=Count("notes"), notes_submitted=Count("notes", filter=Q(notes__status=Note.SUBMITTED))
        )
        p = self.request.query_params
        if p.get("state") in STATES_UTS:
            qs = qs.filter(state_ut=p["state"])
        if p.get("q"):
            q = p["q"].strip()
            qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q) | Q(current_posting__icontains=q))
        return qs.order_by("name", "id")

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        invite = s.validated_data.get("send_invite") and not s.validated_data.get("password")
        user = s.save()
        if invite:
            send_password_reset_email(request, user)  # same one-hour link as "Forgot password"
        user.notes_total = user.notes_submitted = 0
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetail(generics.DestroyAPIView):
    """Delete an account together with all of its notes."""

    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def destroy(self, request, *args, **kwargs):
        target = self.get_object()
        if target.pk == request.user.pk:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if target.is_staff and User.objects.filter(is_staff=True, is_active=True).count() <= 1:
            return Response({"detail": "You cannot delete the last administrator."}, status=status.HTTP_400_BAD_REQUEST)
        target.delete()  # notes are removed by the cascade
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminStats(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        rows = Note.objects.values("topic", "status").annotate(c=Count("id"))
        by_topic = {k: {"key": k, "title": t, "submitted": 0, "draft": 0} for k, t in TOPICS}
        for r in rows:
            by_topic[r["topic"]][r["status"]] = r["c"]
        by_state = list(
            Note.objects.filter(status=Note.SUBMITTED)
            .values("user__state_ut")
            .annotate(submitted=Count("id"))
            .order_by("-submitted", "user__state_ut")
            .values_list("user__state_ut", "submitted")
        )
        officers = User.objects.filter(is_staff=False)
        return Response(
            {
                "users": officers.count(),
                "contributors": Note.objects.values("user").distinct().count(),
                "submitted": Note.objects.filter(status=Note.SUBMITTED).count(),
                "draft": Note.objects.filter(status=Note.DRAFT).count(),
                "complete_users": officers.annotate(s=Count("notes", filter=Q(notes__status=Note.SUBMITTED))).filter(s=3).count(),
                "by_topic": list(by_topic.values()),
                "by_state": [{"state": s or "—", "submitted": c} for s, c in by_state],
            }
        )
