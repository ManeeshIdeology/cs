import os

from django.contrib.auth.hashers import PBKDF2PasswordHasher


class PBKDF2SHA256Hasher600k(PBKDF2PasswordHasher):
    """PBKDF2-HMAC-SHA256 at 600,000 iterations - the current OWASP minimum.

    Django 5.2's default is 1,000,000, which costs hundreds of milliseconds of CPU per login/sign-up and
    queues requests behind each other on a small single-worker host. Existing 1M-iteration hashes still verify
    (the iteration count is stored in each hash) and are upgraded to this cost the next time the user logs in.
    """

    # Tunable for very small hosts (e.g. DJANGO_PBKDF2_ITERATIONS=300000); keep >= 600000 where CPU allows.
    iterations = int(os.environ.get("DJANGO_PBKDF2_ITERATIONS", "600000"))
