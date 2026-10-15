"""PythonAnywhere WSGI file template.

Copy the body of this file into the WSGI configuration file that PythonAnywhere
generates (Web tab -> "WSGI configuration file"), replacing everything in it,
then edit USERNAME and the secret key. Keep the secret key private - do not commit real values.
"""
import os
import sys

USERNAME = "yourusername"  # <- your PythonAnywhere username
PROJECT = f"/home/{USERNAME}/cs/backend"

if PROJECT not in sys.path:
    sys.path.insert(0, PROJECT)

os.environ["DJANGO_DEBUG"] = "0"
os.environ["DJANGO_SECRET_KEY"] = "PASTE-A-LONG-RANDOM-STRING-HERE"
os.environ["DJANGO_ALLOWED_HOSTS"] = f"{USERNAME}.pythonanywhere.com"
os.environ["DJANGO_CSRF_TRUSTED"] = f"https://{USERNAME}.pythonanywhere.com"
os.environ["DJANGO_SSL_REDIRECT"] = "0"  # enable "Force HTTPS" on the Web tab instead
# Password-reset e-mail (Gmail). Use a Google "app password", not your normal password. Never commit real values.
os.environ["DJANGO_SITE_URL"] = f"https://{USERNAME}.pythonanywhere.com"
os.environ["EMAIL_HOST_USER"] = "your-sender@gmail.com"
os.environ["EMAIL_HOST_PASSWORD"] = "PASTE-GOOGLE-APP-PASSWORD-HERE"
os.environ["DJANGO_DB_FILE"] = f"/home/{USERNAME}/cs-data/db.sqlite3"  # outside the git checkout
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
