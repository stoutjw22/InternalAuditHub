# InternalAuditHub — Permission Matrix (EPIC 2)

## Overview

EPIC 2 replaces the coarse role-only checks from EPIC 1 with a layered
authorization model that considers **role**, **object ownership**, and
**workflow state** simultaneously.

All policy logic is centralized in `apps/accounts/policies.py`.  DRF
permission classes in `apps/accounts/permissions.py` delegate to those
functions.  Views remain thin.

---

## Roles

| Role | Token | Description |
|------|-------|-------------|
| `admin` | ADMIN | Full system access |
| `audit_manager` | AUDIT_MANAGER | Manages engagements and their teams |
| `auditor` | AUDITOR | Executes audit work within assigned engagements |
| `risk_owner` | RISK_OWNER | Owns risk register entries |
| `control_owner` | CONTROL_OWNER | Owns control definitions |
| `finding_owner` | FINDING_OWNER | Business stakeholder responsible for remediation |
| `read_only` | READ_ONLY | Minimal access; no write operations |

---

## Engagement Team Membership

A user is an **engagement team member** if ANY of the following are true:

1. Their role is `admin`
2. They are the `audit_manager` field of the `AuditEngagement` record
3. They appear in the `EngagementAuditor` table for that engagement

Team membership is evaluated per-engagement (not globally).  An `audit_manager`
who manages Engagement A is **not** automatically a member of Engagement B's team.

---

## Finding Permission Matrix

### By Workflow State

| State | Who can READ | Who can WRITE core fields | Who can update `management_response` | Who can DELETE |
|-------|-------------|--------------------------|--------------------------------------|----------------|
| `draft` | Team members only | Team members | Team members (via write) | Engagement manager + admin |
| `open` | Team members + owner + identified_by + created_by | Engagement manager + admin | Finding owner + any manager + admin | Engagement manager + admin |
| `in_remediation` | Same as `open` | Engagement manager + admin | Finding owner + any manager + admin | Engagement manager + admin |
| `resolved` | Same as `open` | Engagement manager + admin | Finding owner + any manager + admin | Engagement manager + admin |
| `closed` | Same as `open` | **NOBODY** (immutable) | **NOBODY** (immutable) | **NOBODY** (not even admin) |
| `risk_accepted` | Same as `open` | **NOBODY** (immutable) | **NOBODY** (immutable) | Engagement manager + admin |

> **Draft findings are internal working documents.**  Stakeholders (finding owners,
> risk owners) cannot see them until the finding is promoted to `open`.

### By Role (Summary)

| Role | Read draft | Read open | Write draft | Write open | Mgmt response | Delete |
|------|------------|-----------|-------------|------------|---------------|--------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| audit_manager (engagement's) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (if not closed) |
| audit_manager (other) | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| auditor (team member) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| auditor (not on team) | ❌ | ❌* | ❌ | ❌ | ❌ | ❌ |
| finding_owner (the owner) | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| finding_owner (not the owner) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| risk_owner | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| control_owner | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| read_only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Auditors not on the team can read open/in_remediation/resolved findings only if
   they are the `owner`, `identified_by`, or `created_by` of that finding.

### Management Response Special Rule

A `PATCH` request that contains **only** the `management_response` field is
treated as a management response update and uses a lighter access check:

- Finding owner (the `owner` FK) → **ALLOWED** (on open/in_remediation/resolved)
- Any `audit_manager` → **ALLOWED**
- Admin → **ALLOWED**
- Everyone else → **DENIED**

This allows business stakeholders to formally respond to audit findings without
gaining broader write access.

### Creating Findings

Creating a finding requires:
1. Role of `auditor` or above, AND
2. The user is a team member of the target engagement

Admins may create findings for any engagement.

---

## Report Permission Matrix

### By Workflow State

| State | Who can READ | Who can EDIT | Who can DELETE | Who can FINALIZE |
|-------|-------------|-------------|----------------|-----------------|
| `draft` | Team members | Team members | Engagement manager + admin | N/A |
| `pending_review` | Team members | Team members | Engagement manager + admin | Engagement manager + admin |
| `final` | **All authenticated users** | **NOBODY** | **NOBODY** | N/A (already final) |
| `archived` | **All authenticated users** | **NOBODY** | **NOBODY** | N/A |

> **Final and Archived reports are governance artifacts — they are immutable
> for everyone, including admin.**  If a correction is required, archive the
> existing report and issue a new one.

### Finalize Rule

Only the **engagement's designated `audit_manager`** or an `admin` may call
`POST /reports/<pk>/finalize/`.  An audit manager who is not assigned to that
specific engagement is blocked.

---

## Approval Decision Matrix

| Actor | Can act on approval request? |
|-------|------------------------------|
| The designated `approver` | ✅ |
| Any `audit_manager` (who is not the requester) | ✅ |
| `admin` (who is not the requester) | ✅ |
| The `requested_by` user (self-approval) | ❌ — always blocked, regardless of role |
| Random `auditor` | ❌ |
| `finding_owner` | ❌ unless they are the designated `approver` |

### Self-Approval Block

The `policies.can_approve_request()` function checks `requested_by_id == user.pk`
first and returns `False` unconditionally.  This prevents an audit manager from
approving their own requests.

---

## Access Control Architecture

```
HTTP Request
    │
    ▼
DRF Permission Class (apps/accounts/permissions.py)
    │
    ├─ has_permission()  ──▶  Role check (coarse gate)
    │
    └─ has_object_permission()  ──▶  Policy function (apps/accounts/policies.py)
                                          │
                                          ├─ is_engagement_team_member()
                                          ├─ can_read_finding()
                                          ├─ can_write_finding()
                                          ├─ can_add_management_response()
                                          ├─ can_delete_finding()
                                          ├─ can_read_report()
                                          ├─ can_edit_report()
                                          ├─ can_delete_report()
                                          ├─ can_finalize_report()
                                          └─ can_approve_request()
```

### Key Files

| File | Purpose |
|------|---------|
| `apps/accounts/policies.py` | All permission logic — the single source of truth |
| `apps/accounts/permissions.py` | DRF permission classes; delegates to `policies.py` |
| `apps/findings/views.py` | Uses `FindingObjectPermission`, `ApprovalObjectPermission` |
| `apps/reports/views.py` | Uses `ReportObjectPermission`; `FinalizeReportView` uses `can_finalize_report()` |
| `apps/accounts/tests/test_policies.py` | Unit tests for every policy function |
| `apps/findings/tests/test_permissions.py` | HTTP-layer permission matrix tests (findings) |
| `apps/reports/tests/test_permissions.py` | HTTP-layer permission matrix tests (reports) |

---

## What Was Preserved from EPIC 1

- All existing role constants (`UserRole.*`)
- Coarse permission classes (`IsAdminRole`, `IsAuditManagerOrAbove`, etc.)
- JWT authentication, SSO, brute-force protection
- Audit log middleware
- Engagement list scoping (non-managers only see their assigned engagements)
- Approval request list scoping (non-managers see only their own)

---

## Follow-up Items

| Priority | Item |
|----------|------|
| High | Wire engagement team membership check into `risks` and `controls` nested routes |
| High | Add `can_read_finding` scoping to the remediation action and evidence endpoints so stakeholders can't reach those via nested URLs on findings they can't see |
| Medium | Notify finding owner when a new finding is assigned to them (currently no notification hooks) |
| Medium | Add `approver` role validation — enforce that `ApprovalRequest.approver` must hold `audit_manager` or above role (currently any user can be designated) |
| Medium | Restrict `READ_ONLY` users to read-only access on the risk and control register endpoints (currently blocked entirely) |
| Low | Delegation / out-of-office pattern — allow a manager to temporarily delegate approval authority to another user |
| Low | IP-allowlist / time-window conditional access |
| Low | Resource-level access log (who viewed which finding at what time) beyond the current mutation-only audit log |
