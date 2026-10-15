# Feedback Note Portal — Sixth National Conference of Chief Secretaries

Online version of **Template 1 – Feedback Note**. Officers sign up, log in and write up to **three notes (one per topic)**;
admins review notes and **print them in the exact template layout** (single, selected, or compiled per State/UT with the
*Summary of Feedback Notes* page, as in the "Process to upload Compiled Feedback Note" document).

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, React Router, hand-written design system (`frontend/src/styles`) |
| Backend | Django 5 + Django REST Framework (session auth + CSRF) |
| Database | SQLite (WAL mode) — `backend/db.sqlite3` |
| Print | Server-rendered Django templates (`backend/core/templates/print`) so output matches the Word template |

```
backend/    Django project  (accounts = users/auth, notes = feedback notes + admin API, core = print + SPA shell)
frontend/   React app       (builds into backend/frontend_dist)
```

## Run it (development)

Two terminals. Requires Python 3.11+ and Node 18+.

```bash
# 1) API  → http://127.0.0.1:8000
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # email + name + password → this is the admin login
python manage.py runserver
```

```bash
# 2) UI   → http://localhost:5173   (proxies /api and /print to Django)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. If port 8000 is taken, run Django on another port and start Vite with
`VITE_API_TARGET=http://127.0.0.1:<port> npm run dev`.

Optional demo data (never in production): `python manage.py seed_demo` → 5 officers, password `Demo-Pass-123`.

## Run it (production, single server)

```bash
cd frontend && npm ci && npm run build        # writes backend/frontend_dist
cd ../backend
export DJANGO_DEBUG=0
export DJANGO_SECRET_KEY="<long random string>"
export DJANGO_ALLOWED_HOSTS="feedback.example.gov.in"
export DJANGO_CSRF_TRUSTED="https://feedback.example.gov.in"
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn config.wsgi --workers 3 --bind 0.0.0.0:8000      # Windows: pip install waitress; waitress-serve config.wsgi:application
```

Django serves the API, the print pages **and** the built React app (WhiteNoise); put it behind HTTPS (nginx/Caddy/IIS).
With `DJANGO_DEBUG=0` cookies are `Secure`, HTTPS redirect and HSTS are on (`DJANGO_SSL_REDIRECT=0` if TLS is terminated elsewhere and
the proxy does not send `X-Forwarded-Proto`).

**Back up** `backend/db.sqlite3` (plus `-wal`/`-shm` files if present) regularly. Set `DJANGO_DB_FILE` to keep it outside the code folder.

## Deploy

Free hosting on PythonAnywhere: see **[DEPLOY_PYTHONANYWHERE.md](DEPLOY_PYTHONANYWHERE.md)**. The built React app is committed in `backend/frontend_dist`, so the server needs no Node.

## Rules implemented

* **Sign up / log in** with email + password (min. 8, common/numeric passwords rejected). Login/sign-up are rate-limited and CSRF-protected.
* **Forgot password:** e-mails a one-hour, single-use reset link (Gmail SMTP via `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` env vars; the form never reveals whether an address is registered). Without those variables the e-mail is printed to the server console, which is handy in development.
* One person can file **1–3 notes, one per topic**: enforced in the API *and* by a database unique constraint on (user, topic).
* Drafts may be incomplete (and **autosave**); **Submit** requires Section 1 and all three answers. A submitted note must stay complete when edited
  (use "Move back to draft" to edit freely).
* Users only ever see their own notes. Admins (`is_staff`) see everything; admin accounts cannot be created through sign-up.
* **Admin printing** (`/print/…`, Print / Save as PDF from the browser, A4, 1-inch margins, Times New Roman):
  single note, selected notes, or compiled per topic → *Summary page per State/UT* + notes in alphabetical order of officer name.
  Options: omit the "Instructions" block. Compiled prints include submitted notes only.
* Admin also gets filters/search, a note viewer, user list, overview charts and **CSV export** (formula-injection safe).

## API (JSON, under `/api/`)

`GET csrf/` · `GET meta/` · `POST auth/signup/` · `POST auth/login/` · `POST auth/logout/` · `GET|PATCH auth/me/` · `POST auth/password/` · `POST auth/password-reset/` · `POST auth/password-reset/confirm/`
`GET|POST notes/` · `GET|PATCH|DELETE notes/<id>/` — user's own notes (`submit: true|false` controls status)
`GET admin/stats/` · `GET admin/notes/` · `GET admin/notes/<id>/` · `GET admin/notes/export.csv` · `GET admin/users/` — admin only

## Tests

```bash
cd backend && python manage.py test        # 32 tests: auth, 3-note rule, submit validation, permissions, admin API, print, CSV
```

## Notes

* The template file is US Letter, but its own instructions say A4 with one-inch margins; the print views use **A4**
  (`@page` in `backend/core/templates/print/print.css`).
* Page headers repeat on every printed page; use "Headers and footers: off" in the browser print dialog.
