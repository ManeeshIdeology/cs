"""Print views (server-rendered so the output matches the Word template exactly) and the SPA shell."""
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, HttpResponseBadRequest, HttpResponseForbidden
from django.shortcuts import get_object_or_404, render
from django.views.decorators.cache import never_cache

from notes.models import Note
from notes.views import filter_notes

from .constants import PROBATIONER, STATES_UTS, TOPIC_TITLES, TOPICS


def _render(request, notes_or_sheets, title, instructions=True):
    sheets = notes_or_sheets
    count = sum(1 for s in sheets if not s.get("summary"))
    return render(
        request,
        "print/document.html",
        {"sheets": sheets, "title": title, "count": count, "instructions": instructions, "topics": TOPICS},
    )


def print_note(request, pk):
    """One note, exactly as the template. Owner or admin only."""
    if not request.user.is_authenticated:
        return HttpResponseForbidden("Please log in first.")
    note = get_object_or_404(Note.objects.select_related("user"), pk=pk)
    if note.user_id != request.user.id and not request.user.is_staff:
        raise Http404
    return _render(request, [{"note": note}], f"Feedback Note - {note.name}")


def print_many(request):
    """Admin: ?id=1&id=2 (selected) or any list filter (topic/state/status/q).

    summary=1 puts a "Summary of Feedback Notes" page in front of each State/UT + topic group
    (the format in the "Process to upload Compiled Feedback Note" document);
    noinstr=1 leaves out the "Instructions for filing" block.
    """
    if not (request.user.is_authenticated and request.user.is_staff):
        return HttpResponseForbidden("Admin access required.")
    p = request.GET
    ids = [int(i) for i in p.getlist("id") if i.isdigit()][:500]
    qs = Note.objects.select_related("user")
    if ids:
        qs = qs.filter(pk__in=ids)
    elif p.get("topic") in TOPIC_TITLES:
        qs = filter_notes(qs, p)
        if p.get("status") not in (Note.DRAFT, Note.SUBMITTED):
            qs = qs.filter(status=Note.SUBMITTED)  # compiled prints only use submitted notes by default
    else:
        return HttpResponseBadRequest("Select at least one note or choose a topic.")
    notes = sorted(qs, key=lambda n: (n.name.casefold(), n.pk))
    if not notes:
        return HttpResponse("No notes match your selection.", status=404)

    instructions = p.get("noinstr") != "1"
    sheets = []
    if p.get("summary") == "1":
        groups = {}
        for n in notes:
            groups.setdefault((n.user.state_ut, n.topic), []).append(n)
        order = {k: i for i, (k, _) in enumerate(TOPICS)}
        for (state, topic), rows in sorted(groups.items(), key=lambda kv: (kv[0][0], order[kv[0][1]])):
            people = {}  # one line per officer, even if they wrote several notes on this topic
            for r in rows:
                person = people.setdefault(r.user_id, {"name": r.name, "current_posting": r.current_posting, "service_status": r.service_status, "notes": 0})
                person["notes"] += 1
            probationers = sum(1 for person in people.values() if person["service_status"] == PROBATIONER)
            sheets.append(
                {
                    "summary": True, "state": state, "topic_title": TOPIC_TITLES[topic], "rows": list(people.values()),
                    "officers": len(people) - probationers, "probationers": probationers,
                }
            )
            sheets.extend({"note": r} for r in rows)
    else:
        sheets = [{"note": n} for n in notes]
    return _render(request, sheets, f"Feedback Notes ({len(notes)})", instructions)


STALE_ASSET_JS = (
    "/* This file belongs to an older version of the site. Reload once to get the current version. */\n"
    # window.name survives a reload even when storage is blocked, so the guard can never fail open into a loop
    "(function(){var m=/asset-reload=(\\d+)/.exec(window.name||''),t=m?+m[1]:0;"
    "if(Date.now()-t>30000){window.name='asset-reload='+Date.now();location.reload();}})();\n"
)


@never_cache
def stale_asset(request, path=""):
    """Old browser tabs keep asking for hashed files from a previous build, which no longer exist.

    A 404 there means a blank page. For scripts we answer with a tiny program that reloads the page once
    (at most once every 30 seconds, so a genuinely broken deploy cannot cause a reload loop).
    """
    if path.endswith(".js") or path.endswith(".mjs"):
        return HttpResponse(STALE_ASSET_JS, content_type="text/javascript")
    raise Http404


@never_cache
def spa(request, path=""):
    """Serves the React app (index.html) for every non-API route."""
    index = settings.FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(open(index, "rb"), content_type="text/html")
    return HttpResponse(
        "<h3>Frontend not built</h3><p>For development run <code>npm run dev</code> in <code>frontend/</code> "
        "and open http://localhost:5173. For production run <code>npm run build</code>.</p>",
        status=200,
    )
