"""Gunicorn settings for a Linux server:  gunicorn -c gunicorn.conf.py config.wsgi

Workers are separate processes (use every CPU core); threads let one worker overlap waiting on SQLite/network.
SQLite runs in WAL mode, so several workers can read while one writes.
"""
import multiprocessing
import os

workers = int(os.environ.get("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", 4))
bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:8000")
timeout = 60
keepalive = 5
max_requests = 2000          # recycle workers now and then to keep memory flat
max_requests_jitter = 200
accesslog = "-"
