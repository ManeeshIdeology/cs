from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.constants import CONFIRMED, PROBATIONER


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError("An email address is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("name", "Administrator")
        return self._create(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    """An officer / probationer (or an admin when is_staff). Email is the login."""

    SERVICE_STATUS_CHOICES = [(PROBATIONER, PROBATIONER), (CONFIRMED, CONFIRMED)]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    designation = models.CharField(max_length=200, blank=True)
    batch = models.CharField(max_length=100, blank=True)
    service_status = models.CharField(max_length=20, choices=SERVICE_STATUS_CHOICES, blank=True)
    training_institute = models.CharField(max_length=250, blank=True)
    current_posting = models.CharField(max_length=300, blank=True)
    state_ut = models.CharField("State / UT", max_length=100, blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField("admin access", default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} <{self.email}>"

    def get_full_name(self):
        return self.name

    def get_short_name(self):
        return self.name
