"""Django settings for the Sixth National Conference of Chief Secretaries - Feedback Note portal.

Configuration comes from environment variables so the same code runs in development and production:

    DJANGO_DEBUG              "1" (default, development) or "0" (production)
    DJANGO_SECRET_KEY         required when DJANGO_DEBUG=0
    DJANGO_ALLOWED_HOSTS      comma separated, e.g. "feedback.example.gov.in"
    DJANGO_CSRF_TRUSTED       comma separated origins, e.g. "https://feedback.example.gov.in"
    DJANGO_DB_FILE            path of the SQLite file (default: backend/db.sqlite3)
    DJANGO_SITE_URL           public address used in e-mailed links, e.g. "https://feedback.example.gov.in"
    EMAIL_HOST_USER           SMTP login / sender (Gmail address). With EMAIL_HOST_PASSWORD it switches on real e-mail;
    EMAIL_HOST_PASSWORD       otherwise e-mails are printed to the console (development). Use a Gmail *app password*.
    EMAIL_PORT                587 (default, STARTTLS) or 465 (SSL)
"""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("Set DJANGO_SECRET_KEY when DJANGO_DEBUG=0")
    SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",") if h.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get("DJANGO_CSRF_TRUSTED", "").split(",") if o.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "accounts",
    "notes",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "core.middleware.GZipForReadsMiddleware",  # after WhiteNoise: static files are pre-compressed and skip this
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# ---- Database: SQLite -------------------------------------------------------------------------
# In production the database file must be named explicitly. A console that forgot the variable used to fall
# back to a stray file inside the code folder, so `migrate` silently ran on the wrong database.
if not DEBUG and not os.environ.get("DJANGO_DB_FILE"):
    raise ImproperlyConfigured(
        "Set DJANGO_DB_FILE to the live database, e.g. export DJANGO_DB_FILE=$HOME/cs-data/db.sqlite3 "
        "(or run scripts/pythonanywhere_update.sh, which does this for you)."
    )

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DJANGO_DB_FILE", str(BASE_DIR / "db.sqlite3")),
        "OPTIONS": {
            "timeout": 20,
            # WAL lets readers and the single writer work together; good default for a small web app.
            "init_command": (
                "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; "
                "PRAGMA busy_timeout=20000; PRAGMA cache_size=-20000; PRAGMA temp_store=MEMORY; PRAGMA mmap_size=134217728;"
            ),
            "transaction_mode": "IMMEDIATE",
        },
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Small in-process cache (rate limiting). Each worker process keeps its own copy.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "OPTIONS": {"MAX_ENTRIES": 20000}}}

# ---- Auth -------------------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"
PASSWORD_HASHERS = [
    "accounts.hashers.PBKDF2SHA256Hasher600k",  # also verifies/upgrades older pbkdf2_sha256 hashes
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

SESSION_COOKIE_AGE = 60 * 60 * 24 * 7
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# The React app reads the csrftoken cookie and echoes it in the X-CSRFToken header.
CSRF_COOKIE_HTTPONLY = False

# ---- E-mail (password reset) ---------------------------------------------------------------
# Secrets come from the environment only - never commit them.
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "").strip()
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "").replace(" ", "")  # Google shows app passwords in groups
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
# Port 587 = STARTTLS (default). Port 465 = implicit SSL (use it if your network blocks 587).
EMAIL_USE_SSL = EMAIL_PORT == 465
EMAIL_USE_TLS = not EMAIL_USE_SSL
EMAIL_TIMEOUT = 15
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend"
    if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD
    else "django.core.mail.backends.console.EmailBackend"
)
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL") or (
    f"Feedback Note Portal <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else "Feedback Note Portal <no-reply@localhost>"
)
SITE_URL = os.environ.get("DJANGO_SITE_URL", "").rstrip("/")
PASSWORD_RESET_TIMEOUT = 60 * 60  # reset links are valid for one hour

# ---- Internationalisation ---------------------------------------------------------------------
LANGUAGE_CODE = "en-in"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# ---- Static files / React build ---------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
FRONTEND_DIST = BASE_DIR / "frontend_dist"  # `npm run build` writes here
if FRONTEND_DIST.exists():
    WHITENOISE_ROOT = FRONTEND_DIST  # serves /assets/*, /favicon.svg, ... at the site root


def _immutable_asset(path, url):
    """Vite fingerprints everything under /assets/, so browsers may cache it for a year."""
    return url.startswith("/assets/")


WHITENOISE_IMMUTABLE_FILE_TEST = _immutable_asset
WHITENOISE_MAX_AGE = 3600  # logo, favicon, ...
# Look for files on every request instead of only at start-up. After `git pull` the NEW script files are then
# served immediately; before, visitors got a page whose JavaScript file returned 404 (a blank screen) until Reload.
WHITENOISE_AUTOREFRESH = True
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        if DEBUG
        else "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

# ---- Django REST framework --------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_THROTTLE_RATES": {
        # Flood guard per client IP for the pre-login endpoints. Deliberately generous: a whole conference hall
        # can share one public IP. Wrong-password attempts are limited separately (see accounts/views.py).
        "auth": os.environ.get("DJANGO_AUTH_THROTTLE", "240/min"),
        "password_reset": os.environ.get("DJANGO_RESET_THROTTLE", "60/hour"),
    },
    "EXCEPTION_HANDLER": "core.api.exception_handler",
}

# ---- Production hardening ---------------------------------------------------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SSL_REDIRECT", "1") == "1"
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # Secure cookies need HTTPS. Set DJANGO_SECURE_COOKIES=0 only to try production mode over plain http locally.
    SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = os.environ.get("DJANGO_SECURE_COOKIES", "1") == "1"
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
