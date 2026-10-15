# Deploy on PythonAnywhere (free tier)

The React app is already built and committed (`backend/frontend_dist`), so PythonAnywhere only needs Python.
Django serves the API, the print pages and the React app (WhiteNoise) from one web app.

Replace `yourusername` everywhere below.

## 1. Get the code
Open a **Bash console** (Consoles tab):

```bash
git clone https://github.com/ManeeshIdeology/cs.git
mkdir -p ~/cs-data                      # the SQLite file lives here, outside the checkout
```

## 2. Virtualenv and packages
```bash
mkvirtualenv cs --python=python3.12     # any Python 3.10+ offered on your account
pip install -r ~/cs/backend/requirements.txt
```

## 3. Create the web app
Web tab -> **Add a new web app** -> **Manual configuration** -> choose the same Python version.

* **Virtualenv:** `/home/yourusername/.virtualenvs/cs`
* **WSGI configuration file:** open it, delete its content and paste the body of
  `backend/pythonanywhere_wsgi.py`. Set `USERNAME` and a long random `DJANGO_SECRET_KEY`
  (generate one with `python -c "import secrets; print(secrets.token_urlsafe(50))"`).
* **Force HTTPS:** switch on.

No "Static files" mapping is needed - WhiteNoise serves everything (including the React build).

## 3b. Password-reset e-mail (Gmail)
The "Forgot password?" link e-mails a one-hour reset link. In the same WSGI file set (see the template):

```python
os.environ["DJANGO_SITE_URL"] = "https://yourusername.pythonanywhere.com"
os.environ["EMAIL_HOST_USER"] = "your-sender@gmail.com"
os.environ["EMAIL_HOST_PASSWORD"] = "<Google app password>"
```
Create the app password at https://myaccount.google.com/apppasswords (needs 2-step verification on that Google account).
Without these two variables, no e-mail is sent (messages are only printed to the log). If your network blocks port 587 you can add
`os.environ["EMAIL_PORT"] = "465"`. **Never put the password in git** - this repository is public.

## 4. Database and admin user
In the Bash console (same env vars as the WSGI file):

```bash
cd ~/cs/backend
export DJANGO_DEBUG=0 DJANGO_SECRET_KEY=any-value-for-this-command DJANGO_DB_FILE=$HOME/cs-data/db.sqlite3 DJANGO_ALLOWED_HOSTS=yourusername.pythonanywhere.com
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser        # your admin login (email + name + password)
```

Then click **Reload** on the Web tab and open `https://yourusername.pythonanywhere.com`.

## Updating later
```bash
cd ~/cs && git pull
pip install -r backend/requirements.txt
cd backend && python manage.py migrate && python manage.py collectstatic --noinput
```
then **Reload**. If you change the React code, run `npm run build` on your PC (`frontend/`) and commit the new `backend/frontend_dist`.

## Free-tier notes
* Free accounts get one web app on `yourusername.pythonanywhere.com`, and you must press the "Run until" / extend
  button on the Web tab periodically (about every 3 months) or the app is disabled.
* SQLite is fine here. **Back up** `~/cs-data/db.sqlite3` (download it from the Files tab) before and after the conference.
* The console cannot reach most outside websites on the free tier; this app needs none (fonts are bundled).
