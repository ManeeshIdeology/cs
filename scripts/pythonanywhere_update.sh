#!/bin/bash
# One safe command to update the live site on PythonAnywhere:   bash ~/cs/scripts/pythonanywhere_update.sh
#
# 1. backs up the live database   2. pulls the new code   3. installs packages
# 4. migrates THE LIVE database   5. collects static files   6. reloads the web app (no manual Reload needed)
set -euo pipefail

USERNAME="$(whoami)"
DB="$HOME/cs-data/db.sqlite3"
WSGI="/var/www/${USERNAME}_pythonanywhere_com_wsgi.py"

if [ ! -f "$DB" ]; then
  echo "!! Live database not found at $DB - stopping so nothing is migrated on the wrong file." >&2
  exit 1
fi

# Same settings the web app uses (the console does not inherit them from the WSGI file).
export DJANGO_DEBUG=0 DJANGO_SECRET_KEY=maintenance-only DJANGO_DB_FILE="$DB" DJANGO_ALLOWED_HOSTS="${USERNAME}.pythonanywhere.com"
source "$HOME/.virtualenvs/cs/bin/activate"

echo "== 1/6 Backing up the database"
mkdir -p "$HOME/cs-data/backups"
BACKUP="$HOME/cs-data/backups/db-$(date +%Y%m%d-%H%M%S).sqlite3"
python - "$DB" "$BACKUP" <<'PY'
import sqlite3, sys
src = sqlite3.connect(sys.argv[1]); dst = sqlite3.connect(sys.argv[2])
src.backup(dst); dst.close(); src.close()   # consistent copy even while the site is running
print("   saved", sys.argv[2])
PY
ls -1t "$HOME"/cs-data/backups/db-*.sqlite3 | tail -n +15 | xargs -r rm -f   # keep the newest 14

echo "== 2/6 Pulling the new code"
cd "$HOME/cs" && git pull --ff-only

echo "== 3/6 Installing packages"
pip install -q -r backend/requirements.txt

cd "$HOME/cs/backend"
echo "== 4/6 Migrating $DB"
python manage.py migrate --noinput
python manage.py showmigrations notes accounts | sed 's/^/   /'

echo "== 5/6 Collecting static files"
python manage.py collectstatic --noinput | tail -n 1

echo "== 6/6 Reloading the web app"
touch "$WSGI"
echo "Done. Open https://${USERNAME}.pythonanywhere.com and press Ctrl+Shift+R once."
