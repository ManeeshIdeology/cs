from django.contrib import admin
from django.urls import include, path, re_path

from core import views as core_views

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("notes.urls")),
    path("print/notes/<int:pk>/", core_views.print_note, name="print-note"),
    path("print/", core_views.print_many, name="print-many"),
    re_path(r"^assets/(?P<path>.+)$", core_views.stale_asset),  # reached only when WhiteNoise has no such file
    # Everything else belongs to the React app (client-side routing).
    re_path(r"^(?!api/|print/|django-admin/|static/|assets/).*$", core_views.spa),
]
