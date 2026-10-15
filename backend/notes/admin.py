from django.contrib import admin

from .models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ["name", "topic", "status", "user", "updated_at"]
    list_filter = ["topic", "status"]
    search_fields = ["name", "user__email", "current_posting"]
