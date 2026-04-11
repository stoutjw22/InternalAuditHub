// ─────────────────────────────────────────────────────────────────────────────
// TypeScript models for Internal Audit Hub — Dataverse naming conventions.
// Field names mirror the original PowerApps/Dataverse entity shapes.
// ─────────────────────────────────────────────────────────────────────────────

export type UUID = string;
export type ISODate = string;       // "2026-04-10"
export type ISODateTime = string;   // "2026-04-10T14:30:00Z"

// ── User / People Entities ────────────────────────────────────────────────────

export interface AuditUser {
  id: UUID;
  auditusername: string;
  email?: string;
  phone?: string;
}

export interface AuditManager {
  id: UUID;
  auditmanagername: string;
  email?: string;
  phone?: string;
}

export interface RiskOwner {
  id: UUID;
  riskownername: string;
  email?: string;
  phone?: string;
}

export interface FindingOwner {
  id: UUID;
  findingownername: string;
  email?: string;
  phone?: string;
}

export interface ControlOwner {
  id: UUID;
  controlownername: string;
  email?: string;
  phone?: string;
}

// ── Business Process / Objective ──────────────────────────────────────────────

export interface BusinessProcess {
  id: UUID;
  processname: string;
  description?: string;
}

export interface BusinessObjective {
  id: UUID;
  objectivename: string;
  description?: string;
  processname?: { id: UUID; processname: string };
}

// ── Risk ──────────────────────────────────────────────────────────────────────

export type RiskLikelihood =
  | 'rare'
  | 'unlikely'
  | 'possible'
  | 'likely'
  | 'almost_certain';

export type RiskImpact =
  | 'insignificant'
  | 'minor'
  | 'moderate'
  | 'major'
  | 'catastrophic';

export type RiskRating = 'low' | 'medium' | 'high' | 'critical';

export const RiskLikelihoodToLabel: Record<RiskLikelihood, string> = {
  rare: 'Rare',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  almost_certain: 'Almost Certain',
};

export const RiskImpactToLabel: Record<RiskImpact, string> = {
  insignificant: 'Insignificant',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  catastrophic: 'Catastrophic',
};

export const RiskRatingToLabel: Record<RiskRating, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export interface Risk {
  id: UUID;
  riskname: string;
  description?: string;
  riskownername?: { id: UUID; riskownername: string };
  inherentLikelihood: RiskLikelihood;
  inherentImpact: RiskImpact;
  inherentRating: RiskRating;
  residualLikelihood?: RiskLikelihood;
  residualImpact?: RiskImpact;
  residualRating?: RiskRating;
}

// ── Control ───────────────────────────────────────────────────────────────────

export interface Control {
  id: UUID;
  controlname: string;
  description?: string;
  riskname?: { id: UUID; riskname: string };
  riskownername?: { id: UUID; riskownername: string };
}

// ── Finding ───────────────────────────────────────────────────────────────────

export type FindingSeverityKey = 'SeverityKey0' | 'SeverityKey1' | 'SeverityKey2';

export const FindingSeverityKeyToLabel: Record<FindingSeverityKey, string> = {
  SeverityKey0: 'Low',
  SeverityKey1: 'Medium',
  SeverityKey2: 'High',
};

export interface Finding {
  id: UUID;
  findingtitle: string;
  recommendation?: string;
  severityKey: FindingSeverityKey;
  controlname?: { id: UUID; controlname: string };
  auditusername?: { id: UUID; auditusername: string };
  findingownername?: { id: UUID; findingownername: string };
  /** Engagement FK — needed when creating via flat endpoint. */
  auditengagement?: { id: UUID };
}

// ── Audit Engagement ──────────────────────────────────────────────────────────

export type AuditEngagementStatusKey =
  | 'StatusKey0'
  | 'StatusKey1'
  | 'StatusKey2'
  | 'StatusKey3';

export const AuditEngagementStatusKeyToLabel: Record<AuditEngagementStatusKey, string> = {
  StatusKey0: 'Planned',
  StatusKey1: 'In Progress',
  StatusKey2: 'Completed',
  StatusKey3: 'On Hold',
};

export interface AuditEngagement {
  id: UUID;
  engagementname: string;
  period?: string;
  statusKey: AuditEngagementStatusKey;
  auditmanagername?: { id: UUID; auditmanagername: string };
}

// ── Engagement Risk / Control / Auditor ───────────────────────────────────────

export interface EngagementRisk {
  id: UUID;
  engagementriskname: string;
  riskname?: { id: UUID; riskname: string };
  objectivename?: { id: UUID; objectivename: string };
  /** Engagement FK — needed when creating via flat endpoint. */
  auditengagement?: { id: UUID };
}

export interface EngagementControl {
  id: UUID;
  engagementcontrolname: string;
  controlname?: { id: UUID; controlname: string };
  engagementriskname?: { id: UUID; engagementriskname: string };
  /** Engagement FK — needed when creating via flat endpoint. */
  auditengagement?: { id: UUID };
}

export type EngagementAuditorRoleKey = 'RoleKey0' | 'RoleKey1';

export const EngagementAuditorRoleKeyToLabel: Record<EngagementAuditorRoleKey, string> = {
  RoleKey0: 'Lead Auditor',
  RoleKey1: 'Team Member',
};

export interface EngagementAuditor {
  id: UUID;
  auditengagement?: { id: UUID };
  audituser?: { id: UUID; auditusername: string };
  roleKey?: EngagementAuditorRoleKey;
}

// ── Remediation Action ────────────────────────────────────────────────────────

export type RemediationActionStatusKey =
  | 'StatusKey0'
  | 'StatusKey1'
  | 'StatusKey2'
  | 'StatusKey3';

export const RemediationActionStatusKeyToLabel: Record<RemediationActionStatusKey, string> = {
  StatusKey0: 'Not Started',
  StatusKey1: 'In Progress',
  StatusKey2: 'Completed',
  StatusKey3: 'Overdue',
};

export interface RemediationAction {
  id: UUID;
  actiondescription: string;
  findingtitle?: { id: UUID; findingtitle: string };
  ownername?: { id: UUID; findingownername: string };
  duedate?: ISODate;
  statusKey: RemediationActionStatusKey;
  comments?: string;
  completiondate?: ISODate;
  evidencename?: { id: UUID; evidencename: string };
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export type EvidenceEvidencetypeKey =
  | 'EvidencetypeKey0'
  | 'EvidencetypeKey1'
  | 'EvidencetypeKey2'
  | 'EvidencetypeKey3'
  | 'EvidencetypeKey4'
  | 'EvidencetypeKey5'
  | 'EvidencetypeKey6';

export const EvidenceEvidencetypeKeyToLabel: Record<EvidenceEvidencetypeKey, string> = {
  EvidencetypeKey0: 'Workpaper',
  EvidencetypeKey1: 'Policy',
  EvidencetypeKey2: 'Manual',
  EvidencetypeKey3: 'Screenshot',
  EvidencetypeKey4: 'Report',
  EvidencetypeKey5: 'Training Material',
  EvidencetypeKey6: 'Other',
};

export interface Evidence {
  id: UUID;
  evidencename: string;
  evidencetypeKey: EvidenceEvidencetypeKey;
  sharepointdocumenturl?: string;
  uploaddate?: ISODate;
  uploadedby?: { id: UUID; auditusername: string };
  finding?: { id: UUID; findingtitle: string };
}

// ── Approval Request ──────────────────────────────────────────────────────────

export type ApprovalRequestApprovalstatusKey =
  | 'ApprovalstatusKey0'
  | 'ApprovalstatusKey1'
  | 'ApprovalstatusKey2';

export const ApprovalRequestApprovalstatusKeyToLabel: Record<
  ApprovalRequestApprovalstatusKey,
  string
> = {
  ApprovalstatusKey0: 'Pending',
  ApprovalstatusKey1: 'Approved',
  ApprovalstatusKey2: 'Rejected',
};

export interface ApprovalRequest {
  id: UUID;
  requesttitle: string;
  approvalstatusKey: ApprovalRequestApprovalstatusKey;
  requestdate?: ISODate;
  findingtitle?: { id: UUID; findingtitle: string };
  requestedby?: { id: UUID; auditusername: string };
  approvedby?: { id: UUID; auditmanagername: string };
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

export type AuditLogActiontypeKey =
  | 'ActiontypeKey0'
  | 'ActiontypeKey1'
  | 'ActiontypeKey2'
  | 'ActiontypeKey3';

export const AuditLogActiontypeKeyToLabel: Record<AuditLogActiontypeKey, string> = {
  ActiontypeKey0: 'Create',
  ActiontypeKey1: 'Update',
  ActiontypeKey2: 'Delete',
  ActiontypeKey3: 'View',
};

export interface AuditLog {
  id: UUID;
  entityname: string;
  actiontypeKey: AuditLogActiontypeKey;
  changedby: string;
  changetimestamp: ISODateTime;
  fieldname?: string;
  newvalue?: string;
  oldvalue?: string;
  recordid: string;
  risk?: { id: UUID; riskname: string };
  control?: { id: UUID; controlname: string };
  finding?: { id: UUID; findingtitle: string };
  approvalrequest?: { id: UUID; requesttitle: string };
}

// ── Audit Report Template ─────────────────────────────────────────────────────

export interface AuditReportTemplate {
  id: UUID;
  templatename: string;
  description?: string;
  sharepointtemplateurl?: string;
  createdby?: { id: UUID; auditusername: string };
  createddate?: ISODate;
}

// ── Audit Report ──────────────────────────────────────────────────────────────

export type AuditReportStatusKey =
  | 'StatusKey0'
  | 'StatusKey1'
  | 'StatusKey2'
  | 'StatusKey3';

export const AuditReportStatusKeyToLabel: Record<AuditReportStatusKey, string> = {
  StatusKey0: 'Draft',
  StatusKey1: 'In Review',
  StatusKey2: 'Final',
  StatusKey3: 'Archived',
};

export interface AuditReport {
  id: UUID;
  reporttitle: string;
  auditengagement?: { id: UUID; engagementname: string };
  templatename?: { id: UUID; templatename: string };
  generatedby?: { id: UUID; auditusername: string };
  generateddate?: ISODate;
  statusKey: AuditReportStatusKey;
  sharepointreporturl?: string;
  scope?: string;
  businessobjectives?: string;
  rcmsummary?: string;
  findingssummary?: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: UUID;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
  };
}

// ── Generic pagination wrapper (DRF PageNumberPagination) ────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Django user shapes (returned by /auth/me/ and /auth/users/) ──────────────

export interface UserProfile {
  id: UUID;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  department?: string;
  title?: string;
  phone?: string;
  avatar?: string;
  is_azure_user: boolean;
  is_active: boolean;
  date_joined: ISODateTime;
  last_login?: ISODateTime;
}

/** Lightweight user shape returned by GET /auth/users/ and role-slug endpoints. */
export interface UserListItem {
  id: UUID;
  email: string;
  full_name: string;
  role: string;
  department?: string;
}

// ── Engagement task ───────────────────────────────────────────────────────────

export interface AuditTask {
  id: UUID;
  engagement: UUID;
  name: string;
  description?: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  assigned_to?: UUID;
  assigned_to_detail?: UserListItem;
  due_date?: ISODate;
  escalation_flag: boolean;
  completed_at?: ISODateTime;
  notes?: string;
  created_by?: UUID;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── Lightweight list-view shapes ─────────────────────────────────────────────
// These are identical to their full counterparts; the aliases let hooks.ts
// explicitly signal which serializer shape is expected.

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AuditEngagementList extends AuditEngagement {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AuditReportList extends AuditReport {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FindingListItem extends Finding {}
