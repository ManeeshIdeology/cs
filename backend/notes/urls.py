from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter(trailing_slash=True)
router.register("notes", views.MyNoteViewSet, basename="note")

urlpatterns = [
    path("admin/stats/", views.AdminStats.as_view()),
    path("admin/notes/", views.AdminNoteList.as_view()),
    path("admin/notes/export.csv", views.AdminNoteCsv.as_view()),
    path("admin/notes/<int:pk>/", views.AdminNoteDetail.as_view()),
    path("admin/users/", views.AdminUserList.as_view()),
    path("admin/users/<int:pk>/", views.AdminUserDetail.as_view()),
    *router.urls,
]
