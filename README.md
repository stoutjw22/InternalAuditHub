# InternalAuditHub

**Modern Internal Audit & Compliance Management Platform**

A full-stack audit management system built as a migration from Microsoft PowerApps to Django + TypeScript. Designed for internal audit teams to manage risks, controls, engagements, findings, evidence, and reporting with enterprise-grade security and scalability.

---

## Features

- **Risk Register** – Track and assess enterprise risks
- **Audit Engagements** – Plan, execute, and document audits
- **Internal Controls** – Test, document, and monitor controls
- **Findings & Remediation** – Issue tracking with evidence upload and follow-up
- **Reports & Dashboards** – Generate audit reports and compliance insights
- **Accounts & SSO** – User management with Azure AD / Entra ID support
- **REST API** – Full Django REST Framework backend with JWT auth (recently expanded)
- **TypeScript Frontend** – Modern, responsive UI with Tailwind CSS + Vite

---

## Tech Stack

**Backend**
- Python 3 + Django 5.0
- Django REST Framework + SimpleJWT
- PostgreSQL (recommended)
- django-allauth, django-axes, drf-spectacular

**Frontend**
- React 18 + TypeScript + Vite + Tailwind CSS
- Radix UI components + Framer Motion
- TanStack Query (React Query) + Jotai
- React Router v6 + React Hook Form + Zod

**Dev Tools**
- pytest + factory-boy
- Black, isort, flake8
- CORS + environment-based settings

---

## Quick Start (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/stoutjw22/InternalAuditHub.git
cd InternalAuditHub
```

### 2. Create and activate a virtual environment
```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows
```

### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)
```

### 5. Run database migrations
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 6. Start the Django development server
```bash
python manage.py runserver
```

### 7. Start the frontend (in a second terminal)
```bash
cd frontend
npm install
npm run dev
```

The API will be available at `http://localhost:8000` and the frontend at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file at the project root. Required variables:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL recommended)
DATABASE_URL=postgres://user:password@localhost:5432/internalaudithub

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Azure AD / Microsoft Entra ID (optional — for SSO)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
```

---

## Project Structure

```
InternalAuditHub/
├── apps/                        # Django applications
│   ├── accounts/                # User auth, profiles, SSO
│   ├── controls/                # Internal controls & testing
│   ├── core/                    # Shared models, middleware, utils
│   ├── engagements/             # Audit engagements & planning
│   ├── findings/                # Findings, evidence & remediation
│   ├── reports/                 # Report generation & dashboards
│   └── risks/                   # Risk register & assessments
├── config/                      # Django project configuration
│   ├── settings/
│   │   ├── base.py              # Shared settings
│   │   ├── development.py       # Dev overrides
│   │   └── production.py        # Production overrides
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── frontend/                    # React + TypeScript SPA
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── manage.py
├── pytest.ini
└── requirements.txt
```

---

## API Documentation

With the server running, interactive API docs are available at:

- **Swagger UI:** `http://localhost:8000/api/schema/swagger-ui/`
- **ReDoc:** `http://localhost:8000/api/schema/redoc/`
- **OpenAPI schema:** `http://localhost:8000/api/schema/`

Authentication uses JWT. Obtain tokens at `/api/token/` and refresh at `/api/token/refresh/`.

---

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps

# Run a specific app
pytest apps/risks/
```

---

## Code Quality

```bash
# Format
black .
isort .

# Lint
flake8 .
```

---

## Frontend Scripts

```bash
cd frontend

npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build (tsc + vite build)
npm run preview   # Preview production build
npm run lint      # ESLint check
```

---

## Deployment

For production, set `DEBUG=False` and configure:

- `SECRET_KEY` — long, random, secret
- `DATABASE_URL` — production PostgreSQL connection string
- `ALLOWED_HOSTS` — your domain(s)
- `CORS_ALLOWED_ORIGINS` — your frontend domain(s)
- Static files: `python manage.py collectstatic`
- Use `config.settings.production` via `DJANGO_SETTINGS_MODULE`

---

## Contributing

1. Fork the repo and create a feature branch
2. Write tests for new functionality
3. Ensure `pytest`, `black`, `isort`, and `flake8` all pass
4. Submit a pull request with a clear description

---

## License

MIT — see [LICENSE](LICENSE) for details.
