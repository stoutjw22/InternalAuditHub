"""
Development settings — never use in production.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Allow the Vite dev server and any localhost port
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_ALL_ORIGINS = False

# Relax email verification in dev so you can log in without an SMTP server
ACCOUNT_EMAIL_VERIFICATION = "none"

# Django Debug Toolbar (install separately: pip install django-debug-toolbar)
try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405
    MIDDLEWARE.insert(1, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass

# Axes: disable lockouts locally so repeated test logins don't lock you out
AXES_ENABLED = False
