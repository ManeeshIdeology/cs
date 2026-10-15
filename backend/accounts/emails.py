import logging
import threading

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import EmailMultiAlternatives
from django.utils.encoding import force_bytes
from django.utils.html import escape
from django.utils.http import urlsafe_base64_encode

log = logging.getLogger(__name__)


def build_reset_url(request, user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    base = settings.SITE_URL or request.build_absolute_uri("/").rstrip("/")  # Host is validated by ALLOWED_HOSTS
    return f"{base}/reset-password/{uid}/{token}"


def _send(message):
    try:
        message.send()
    except Exception:  # never leak SMTP problems to the (anonymous) caller; the admin sees them in the log
        log.exception("Could not send password-reset e-mail to %s", message.to)


def send_password_reset_email(request, user, background=True):
    """E-mail a one-hour reset link. Sending runs in a thread so the response time does not reveal whether the address exists."""
    url = build_reset_url(request, user)
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60
    subject = "Reset your password - Feedback Note Portal"
    text = (
        f"Hello {user.name},\n\n"
        "We received a request to reset the password for your Feedback Note Portal account "
        "(Sixth National Conference of Chief Secretaries).\n\n"
        f"Set a new password here (the link works for {minutes} minutes):\n{url}\n\n"
        "If you did not ask for this, you can ignore this e-mail - your password will not change.\n"
    )
    html = f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#2a2f3a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>
    <td height="5" width="34%" bgcolor="#e8851f" style="font-size:0;line-height:0">&nbsp;</td>
    <td height="5" width="33%" bgcolor="#1b3a6b" style="font-size:0;line-height:0">&nbsp;</td>
    <td height="5" width="33%" bgcolor="#2a7f4e" style="font-size:0;line-height:0">&nbsp;</td>
  </tr></table>
  <div style="padding:24px 4px">
    <h2 style="margin:0 0 4px;color:#16305c;font-family:Georgia,serif">Reset your password</h2>
    <p style="margin:0 0 20px;color:#646a78">Sixth National Conference of Chief Secretaries &middot; Feedback Note Portal</p>
    <p>Hello {escape(user.name)},</p>
    <p>We received a request to reset the password for your account. This link works for <b>{minutes} minutes</b>.</p>
    <p style="margin:26px 0"><a href="{escape(url)}" style="background:#1b3a6b;color:#fff;text-decoration:none;padding:13px 24px;border-radius:6px;font-weight:bold;display:inline-block">Set a new password</a></p>
    <p style="font-size:13px;color:#646a78">Or paste this address into your browser:<br><span style="word-break:break-all">{escape(url)}</span></p>
    <p style="font-size:13px;color:#646a78">If you did not ask for this, ignore this e-mail &mdash; your password will not change.</p>
  </div>
</div>"""
    msg = EmailMultiAlternatives(subject, text, settings.DEFAULT_FROM_EMAIL, [user.email])
    msg.attach_alternative(html, "text/html")
    if background:
        threading.Thread(target=_send, args=(msg,), daemon=True).start()
    else:
        _send(msg)
