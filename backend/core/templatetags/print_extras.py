import re

from django import template
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe

register = template.Library()

# Matched on the already-escaped text, so user input can never inject markup.
_URL = re.compile(r"https?://(?:(?!&quot;|&#x27;|&lt;|&gt;)[^\s<])+")
_TRAIL = ".,;:!?)]"


def _link(m):
    url = m.group(0)
    tail = ""
    while url and url[-1] in _TRAIL:
        tail = url[-1] + tail
        url = url[:-1]
    return f'<a href="{url}" target="_blank" rel="noopener noreferrer">{url}</a>{tail}'


@register.filter
def linkify(value):
    """Escape, then turn bare URLs into hyperlinks (the template allows hyperlinks)."""
    return mark_safe(_URL.sub(_link, str(conditional_escape(value or ""))))
