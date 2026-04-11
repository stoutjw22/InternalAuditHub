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
│   ├── frameworks/              # Framework library & control mapping
│   ├── jurisdictions/           # Jurisdiction & regulator overlays
│   ├── reports/                 # Report generation & dashboards
│   ├── risks/                   # Risk register & assessments
│   ├── taxonomy/                # Risk taxonomy & scoring configs
│   ├── testing/                 # Test plans, instances & exceptions
│   └── universe/                # Auditable universe hierarchy
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

## Data Model / ERD

The domain model is organised into five conceptual layers that build on top of the original core modules.

### Layer 0 — Foundations (original)

| Model | App | Description |
|-------|-----|-------------|
| `User` | accounts | Custom auth user with RBAC roles |
| `BusinessProcess` | core | Top-level process grouping |
| `BusinessObjective` | core | Objective linked to a process |
| `AuditLog` | core | Immutable mutation audit trail |

---

### Layer 1 — Auditable Universe Hierarchy (`universe`)

Defines *what* can be audited before any engagement is created.

```
AuditableDomain  ──(self-ref parent)──▶  AuditableDomain (subdomain)
       │
       └──▶  AuditableEntity  ──▶  Subprocess ──▶ BusinessProcess (core)
```

| Model | Key Fields |
|-------|-----------|
| `AuditableDomain` | name, parent (self), is_active |
| `AuditableEntity` | domain, entity_type, inherent_risk_rating, owner, next_audit_date |
| `Subprocess` | business_process, auditable_entity, sequence_order |

---

### Layer 2 — Risk Taxonomy & Scoring (`taxonomy`)

Classifies risks into a two-level hierarchy and provides configurable scoring.

```
RiskCategory ──▶ RiskSubcategory
Risk (risks app) ──FK──▶ RiskCategory
                 ──FK──▶ RiskSubcategory
                 ──FK──▶ RiskScoringConfig
```

| Model | Key Fields |
|-------|-----------|
| `RiskCategory` | name, is_active |
| `RiskSubcategory` | category (FK), name |
| `RiskScoringConfig` | scoring_method (×/+/weighted), likelihood_scale, impact_scale, thresholds, is_default |

---

### Layer 3 — Framework Library & Control Mapping (`frameworks`)

Maintains versioned compliance frameworks and maps controls to their requirements.

```
CitationSource ◀──── Framework ──▶ FrameworkRequirement (self-ref hierarchy)
                                           │
                           ControlObjective (M2M)
                                           │
                         ControlActivity ──▶ Control (controls app)
                                           │
                   ControlRequirementMapping ──▶ Control + FrameworkRequirement
```

| Model | Key Fields |
|-------|-----------|
| `CitationSource` | name, source_type, publisher, url, publication_date |
| `Framework` | short_name, framework_type, version, effective_date, expiry_date |
| `FrameworkRequirement` | framework, parent (self), requirement_id, title, requirement_type, effective_date |
| `ControlObjective` | reference_code, framework_requirements (M2M) |
| `ControlActivity` | control, control_objective, activity_type, framework_requirements (M2M) |
| `ControlRequirementMapping` | control, framework_requirement, mapping_type, effective_date, expiry_date |

**Many-to-many links**

- `Control ↔ FrameworkRequirement` via `ControlRequirementMapping` (explicit through-table with mapping_type and effective dating)
- `Control ↔ Risk` via existing M2M on `Control.risks`
- `ControlObjective ↔ FrameworkRequirement` via M2M
- `ControlActivity ↔ FrameworkRequirement` via M2M

---

### Layer 4 — Testing Layer (`testing`)

Captures the full testing lifecycle from plan to exception.

```
TestPlan ──▶ Control + AuditEngagement
   │
TestInstance ──▶ TestPlan
   │
SampleItem ──▶ TestInstance ──▶ Evidence (findings app)
   │
TestException ──▶ TestInstance + SampleItem ──▶ Finding (findings app)
```

| Model | Key Fields |
|-------|-----------|
| `TestingMethod` | name, method_type (inquiry/observation/inspection/reperformance/…) |
| `AssertionType` | name (existence, completeness, accuracy, …) |
| `TestPlan` | control, engagement, testing_method, assertion_types (M2M), population_size, sample_size, sampling_method, design_effectiveness_status |
| `TestInstance` | test_plan, instance_number, test_period_start/end, operating_effectiveness_status |
| `SampleItem` | test_instance, item_identifier, result (pass/fail/exception) |
| `TestException` | test_instance, sample_item, exception_type, severity, finding (optional escalation) |

---

### Layer 5 — Jurisdiction & Regulator Overlay (`jurisdictions`)

Allows jurisdiction-specific requirements to overlay base framework requirements, with applicability logic and effective dating.

```
Jurisdiction ──▶ RequirementOverlay ──▶ FrameworkRequirement (frameworks)
     │                                         │
     └──▶ ApplicabilityLogic ──▶ AuditableEntity (universe)
```

| Model | Key Fields |
|-------|-----------|
| `Jurisdiction` | name, short_name, jurisdiction_type, country, region |
| `RequirementOverlay` | jurisdiction, framework_requirement, overlay_type, overlay_text, effective_date, expiry_date |
| `ApplicabilityLogic` | jurisdiction, auditable_entity, framework_requirement, condition_type, condition_config (JSON), is_applicable, effective_date |

**Effective dating** is present on `Framework`, `FrameworkRequirement`, `ControlRequirementMapping`, `RequirementOverlay`, and `ApplicabilityLogic` — each carries `effective_date` / `expiry_date` so historical snapshots are never lost.

---

### Full Relationship Summary

```
accounts.User
    ├── owns → AuditableEntity, Subprocess, Risk, Control, AuditEngagement, TestPlan
    └── performs → TestInstance

universe
    AuditableDomain → AuditableEntity → Subprocess → core.BusinessProcess

taxonomy
    RiskCategory → RiskSubcategory
    risks.Risk → RiskCategory, RiskSubcategory, RiskScoringConfig

frameworks
    CitationSource ← Framework → FrameworkRequirement (tree)
    ControlObjective ↔ FrameworkRequirement (M2M)
    ControlActivity → controls.Control, ControlObjective
    ControlActivity ↔ FrameworkRequirement (M2M)
    ControlRequirementMapping → controls.Control + FrameworkRequirement

testing
    TestPlan → controls.Control, engagements.AuditEngagement
    TestPlan ↔ AssertionType (M2M)
    TestInstance → TestPlan
    SampleItem → TestInstance, findings.Evidence
    TestException → TestInstance, SampleItem, findings.Finding

jurisdictions
    Jurisdiction → RequirementOverlay → frameworks.FrameworkRequirement
    Jurisdiction → ApplicabilityLogic → universe.AuditableEntity, FrameworkRequirement
```

---

## API Documentation

With the server running, interactive API docs are available at:

- **Swagger UI:** `http://localhost:8000/api/v1/docs/`
- **ReDoc:** `http://localhost:8000/api/v1/redoc/`
- **OpenAPI schema:** `http://localhost:8000/api/v1/schema/`

Authentication uses JWT. Obtain tokens at `/api/v1/auth/token/` and refresh at `/api/v1/auth/token/refresh/`.

### New API Endpoints (v1)

All endpoints require JWT authentication (`Authorization: Bearer <token>`).

#### Risk Taxonomy (`/api/v1/`)
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `risk-categories/` | List / create risk categories |
| GET/PUT/PATCH/DELETE | `risk-categories/<uuid>/` | Retrieve / update / delete |
| GET/POST | `risk-subcategories/` | List / create subcategories |
| GET/PUT/PATCH/DELETE | `risk-subcategories/<uuid>/` | Retrieve / update / delete |
| GET/POST | `risk-scoring-configs/` | List / create scoring configs |
| GET/PUT/PATCH/DELETE | `risk-scoring-configs/<uuid>/` | Retrieve / update / delete |

#### Auditable Universe (`/api/v1/`)
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `auditable-domains/` | List / create domains |
| GET/PUT/PATCH/DELETE | `auditable-domains/<uuid>/` | Retrieve / update / delete |
| GET/POST | `auditable-entities/` | List / create entities |
| GET/PUT/PATCH/DELETE | `auditable-entities/<uuid>/` | Retrieve / update / delete |
| GET/POST | `subprocesses/` | List / create subprocesses |
| GET/PUT/PATCH/DELETE | `subprocesses/<uuid>/` | Retrieve / update / delete |

#### Framework Library (`/api/v1/`)
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `citation-sources/` | List / create citation sources |
| GET/POST | `frameworks/` | List / create frameworks |
| GET/PUT/PATCH/DELETE | `frameworks/<uuid>/` | Retrieve / update / delete |
| GET/POST | `framework-requirements/` | List / create requirements |
| GET/PUT/PATCH/DELETE | `framework-requirements/<uuid>/` | Retrieve / update / delete |
| GET/POST | `control-objectives/` | List / create control objectives |
| GET/POST | `control-activities/` | List / create control activities |
| GET/POST | `control-requirement-mappings/` | List / create control↔requirement mappings |
| GET/PUT/PATCH/DELETE | `control-requirement-mappings/<uuid>/` | Retrieve / update / delete |

#### Testing Layer (`/api/v1/`)
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `testing-methods/` | List / create testing methods |
| GET/POST | `assertion-types/` | List / create assertion types |
| GET/POST | `test-plans/` | List / create test plans |
| GET/PUT/PATCH/DELETE | `test-plans/<uuid>/` | Retrieve / update / delete |
| GET/POST | `test-instances/` | List / create test instances |
| GET/PUT/PATCH/DELETE | `test-instances/<uuid>/` | Retrieve / update / delete |
| GET/POST | `sample-items/` | List / create sample items |
| GET/PUT/PATCH/DELETE | `sample-items/<uuid>/` | Retrieve / update / delete |
| GET/POST | `test-exceptions/` | List / create test exceptions |
| GET/PUT/PATCH/DELETE | `test-exceptions/<uuid>/` | Retrieve / update / delete |

#### Jurisdictions & Overlays (`/api/v1/`)
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `jurisdictions/` | List / create jurisdictions |
| GET/PUT/PATCH/DELETE | `jurisdictions/<uuid>/` | Retrieve / update / delete |
| GET/POST | `requirement-overlays/` | List / create requirement overlays |
| GET/PUT/PATCH/DELETE | `requirement-overlays/<uuid>/` | Retrieve / update / delete |
| GET/POST | `applicability-rules/` | List / create applicability logic rules |
| GET/PUT/PATCH/DELETE | `applicability-rules/<uuid>/` | Retrieve / update / delete |

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
