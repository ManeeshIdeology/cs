from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["name"]
    list_display = ["name", "email", "state_ut", "service_status", "is_staff"]
    list_filter = ["is_staff", "service_status", "state_ut"]
    search_fields = ["name", "email", "current_posting"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Officer details", {"fields": ("name", "designation", "batch", "service_status", "training_institute", "current_posting", "state_ut")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "name", "password1", "password2", "is_staff")}),)
