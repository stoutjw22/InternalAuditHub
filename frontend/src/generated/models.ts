// ─────────────────────────────────────────────────────────────────────────────
// Auto-generated TypeScript models for Internal Audit Hub Django API
// Matches the DRF serializer output.  Do not edit field names — they mirror
// the Django snake_case conventions returned by the API.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared ────────────────────────────────────────────────────────────────────

export type UUID = string;
export type ISODate = string;       // "2026-04-10"
export type ISODateTime = string;   // "2026-04-10T14:30:00Z"

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export type UserRole =
  | "admin"
  | "audit_manager"
  | "auditor"
  | "risk_owner"
  | "control_owner"
  | "finding_owner"
  | "read_only";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  audit_manager: "Audit Manager",
  auditor: "Auditor",
  risk_owner: "Risk Owner",
  control_owner: "Control Owner",
  finding_owner: "Finding Owner",
  read_only: "Read Only",
};

export interface UserProfile {
  id: UUID;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  department: string;
  title: string;
  phone: string;
  avatar: string | null;
  is_azure_user: boolean;
  is_active: boolean;
  date_joined: ISODateTime;
  last_login: ISODateTime | null;
}

export interface UserListItem {
  id: UUID;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: UserProfile;
}

// ── Core ──────────────────────────────────────────────────────────────────────

export interface BusinessProcess {
  id: UUID;
  name: string;
  description: string;
  owner: UUID | null;
  owner_detail?: UserListItem;
  is_active: boolean;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface BusinessObjective {
  id: UUID;
  name: string;
  description: string;
  business_process: UUID | null;
  owner: UUID | null;
  owner_detail?: UserListItem;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type AuditLogAction =
  | "create" | "update" | "delete" | "view"
  | "login" | "logout" | "export" | "approve" | "reject";

export const AUDIT_LOG_ACTION_LABELS: Record<AuditLogAction, string> = {
  create: "Create", update: "Update", delete: "Delete", view: "View",
  login: "Login", logout: "Logout", export: "Export",
  approve: "Approve", reject: "Reject",
};

export interface AuditLog {
  id: UUID;
  user: UUID | null;
  user_detail?: UserListItem;
  action: AuditLogAction;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string;
  timestamp: ISODateTime;
}

// ── Engagements ───────────────────────────────────────────────────────────────

export type EngagementStatus =
  | "planning" | "in_progress" | "review" | "completed" | "cancelled";

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  review: "Under Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ENGAGEMENT_STATUS_COLORS: Record<EngagementStatus, string> = {
  planning: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  review: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export interface EngagementAuditor {
  id: UUID;
  auditor: UUID;
  auditor_detail?: UserListItem;
  role_note: string;
  assigned_at: ISODateTime;
}

export interface AuditEngagementList {
  id: UUID;
  name: string;
  status: EngagementStatus;
  status_display: string;
  audit_manager: UUID;
  audit_manager_name: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  created_at: ISODateTime;
}

export interface AuditEngagement {
  id: UUID;
  name: string;
  description: string;
  status: EngagementStatus;
  status_display: string;
  audit_manager: UUID;
  audit_manager_detail?: UserListItem;
  business_process: UUID | null;
  business_objective: UUID | null;
  period: string;
  scope: string;
  objectives: string;
  start_date: ISODate | null;
  end_date: ISODate | null;
  assigned_auditors: EngagementAuditor[];
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do", in_progress: "In Progress", review: "Under Review",
  done: "Done", blocked: "Blocked",
};
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low", medium: "Medium", high: "High", critical: "Critical",
};

export interface AuditTask {
  id: UUID;
  engagement: UUID;
  name: string;
  description: string;
  status: TaskStatus;
  status_display: string;
  priority: TaskPriority;
  priority_display: string;
  assigned_to: UUID | null;
  assigned_to_detail?: UserListItem;
  due_date: ISODate | null;
  completed_at: ISODateTime | null;
  notes: string;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── Risks ─────────────────────────────────────────────────────────────────────

export type RiskCategory =
  | "operational" | "financial" | "compliance" | "strategic"
  | "reputational" | "technology" | "fraud" | "other";

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  operational: "Operational", financial: "Financial", compliance: "Compliance",
  strategic: "Strategic", reputational: "Reputational", technology: "Technology",
  fraud: "Fraud", other: "Other",
};

export type RiskStatus =
  | "identified" | "assessed" | "mitigated" | "accepted" | "closed";

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  identified: "Identified", assessed: "Assessed", mitigated: "Mitigated",
  accepted: "Accepted", closed: "Closed",
};

export interface Risk {
  id: UUID;
  name: string;
  description: string;
  category: RiskCategory;
  category_display: string;
  status: RiskStatus;
  status_display: string;
  inherent_likelihood: number;  // 1-5
  inherent_impact: number;      // 1-5
  inherent_score: number;       // computed
  residual_likelihood: number | null;
  residual_impact: number | null;
  residual_score: number | null;
  risk_rating: string;          // Low / Medium / High / Critical
  owner: UUID | null;
  owner_detail?: UserListItem;
  business_process: UUID | null;
  business_objective: UUID | null;
  treatment_plan: string;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface EngagementRisk {
  id: UUID;
  engagement: UUID;
  risk: UUID;
  risk_detail?: Risk;
  assessment_notes: string;
  is_in_scope: boolean;
  created_by: UUID | null;
  created_at: ISODateTime;
}

// ── Controls ──────────────────────────────────────────────────────────────────

export type ControlType =
  | "preventive" | "detective" | "corrective" | "directive" | "compensating";

export const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  preventive: "Preventive", detective: "Detective", corrective: "Corrective",
  directive: "Directive", compensating: "Compensating",
};

export type ControlFrequency =
  | "continuous" | "daily" | "weekly" | "monthly" | "quarterly" | "annually" | "ad_hoc";

export const CONTROL_FREQUENCY_LABELS: Record<ControlFrequency, string> = {
  continuous: "Continuous", daily: "Daily", weekly: "Weekly",
  monthly: "Monthly", quarterly: "Quarterly", annually: "Annually", ad_hoc: "Ad-Hoc",
};

export type ControlStatus =
  | "active" | "inactive" | "design_deficiency" | "under_review";

export const CONTROL_STATUS_LABELS: Record<ControlStatus, string> = {
  active: "Active", inactive: "Inactive",
  design_deficiency: "Design Deficiency", under_review: "Under Review",
};

export interface Control {
  id: UUID;
  name: string;
  description: string;
  control_type: ControlType;
  control_type_display: string;
  frequency: ControlFrequency;
  frequency_display: string;
  status: ControlStatus;
  status_display: string;
  owner: UUID | null;
  owner_detail?: UserListItem;
  business_process: UUID | null;
  risks: UUID[];
  control_reference: string;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type TestResult = "not_tested" | "pass" | "fail" | "partial" | "na";
export type EffectivenessRating =
  | "effective" | "partially_effective" | "ineffective" | "not_assessed";

export const TEST_RESULT_LABELS: Record<TestResult, string> = {
  not_tested: "Not Tested", pass: "Pass", fail: "Fail",
  partial: "Partial", na: "N/A",
};
export const EFFECTIVENESS_LABELS: Record<EffectivenessRating, string> = {
  effective: "Effective", partially_effective: "Partially Effective",
  ineffective: "Ineffective", not_assessed: "Not Assessed",
};

export interface EngagementControl {
  id: UUID;
  engagement: UUID;
  control: UUID;
  control_detail?: Control;
  test_procedure: string;
  test_result: TestResult;
  test_result_display: string;
  effectiveness_rating: EffectivenessRating;
  effectiveness_rating_display: string;
  notes: string;
  tested_by: UUID | null;
  tested_by_detail?: UserListItem;
  tested_at: ISODateTime | null;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

// ── Findings ──────────────────────────────────────────────────────────────────

export type FindingType =
  | "control_deficiency" | "process_gap" | "compliance_issue"
  | "fraud_indicator" | "observation" | "best_practice";

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  control_deficiency: "Control Deficiency", process_gap: "Process Gap",
  compliance_issue: "Compliance Issue", fraud_indicator: "Fraud Indicator",
  observation: "Observation", best_practice: "Best Practice Recommendation",
};

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: "Critical", high: "High", medium: "Medium",
  low: "Low", info: "Informational",
};

export const FINDING_SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
  info: "bg-gray-100 text-gray-800",
};

export type FindingStatus =
  | "draft" | "open" | "in_remediation" | "resolved" | "closed" | "risk_accepted";

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  draft: "Draft", open: "Open", in_remediation: "In Remediation",
  resolved: "Resolved", closed: "Closed", risk_accepted: "Risk Accepted",
};

export type RemediationStatus =
  | "open" | "in_progress" | "completed" | "overdue" | "cancelled";

export const REMEDIATION_STATUS_LABELS: Record<RemediationStatus, string> = {
  open: "Open", in_progress: "In Progress", completed: "Completed",
  overdue: "Overdue", cancelled: "Cancelled",
};

export const REMEDIATION_STATUS_COLORS: Record<RemediationStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export interface RemediationAction {
  id: UUID;
  finding: UUID;
  description: string;
  owner: UUID | null;
  owner_detail?: UserListItem;
  due_date: ISODate | null;
  status: RemediationStatus;
  status_display: string;
  completion_notes: string;
  completed_at: ISODateTime | null;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Evidence {
  id: UUID;
  finding: UUID | null;
  engagement: UUID | null;
  task: UUID | null;
  title: string;
  description: string;
  sharepoint_url: string;
  file: string | null;
  original_filename: string;
  file_size: number;
  file_size_kb: string;
  content_type: string;
  uploaded_by: UUID | null;
  uploaded_by_detail?: UserListItem;
  uploaded_at: ISODateTime;
}

export interface FindingListItem {
  id: UUID;
  title: string;
  finding_type: FindingType;
  severity: FindingSeverity;
  severity_display: string;
  status: FindingStatus;
  status_display: string;
  owner: UUID | null;
  owner_name: string;
  due_date: ISODate | null;
  created_at: ISODateTime;
}

export interface Finding {
  id: UUID;
  engagement: UUID;
  title: string;
  description: string;
  finding_type: FindingType;
  finding_type_display: string;
  severity: FindingSeverity;
  severity_display: string;
  status: FindingStatus;
  status_display: string;
  root_cause: string;
  management_response: string;
  control: UUID | null;
  risk: UUID | null;
  owner: UUID | null;
  owner_detail?: UserListItem;
  identified_by: UUID | null;
  identified_by_detail?: UserListItem;
  identified_date: ISODate | null;
  due_date: ISODate | null;
  remediation_actions: RemediationAction[];
  evidence_files: Evidence[];
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type ApprovalStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type ApprovalEntityType = "finding" | "report" | "engagement";

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending", approved: "Approved",
  rejected: "Rejected", withdrawn: "Withdrawn",
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-800",
};

export interface ApprovalRequest {
  id: UUID;
  entity_type: ApprovalEntityType;
  entity_id: UUID;
  entity_name: string;
  requested_by: UUID;
  requested_by_detail?: UserListItem;
  approver: UUID;
  approver_detail?: UserListItem;
  status: ApprovalStatus;
  status_display: string;
  request_notes: string;
  review_notes: string;
  requested_at: ISODateTime;
  reviewed_at: ISODateTime | null;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface AuditReportTemplate {
  id: UUID;
  name: string;
  description: string;
  content_template: string;
  is_active: boolean;
  created_by: UUID | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type ReportStatus = "draft" | "pending_review" | "final" | "archived";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: "Draft", pending_review: "Pending Review",
  final: "Final", archived: "Archived",
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending_review: "bg-yellow-100 text-yellow-800",
  final: "bg-green-100 text-green-800",
  archived: "bg-blue-100 text-blue-800",
};

export interface AuditReportList {
  id: UUID;
  engagement: UUID;
  engagement_name: string;
  title: string;
  status: ReportStatus;
  status_display: string;
  generated_by: UUID | null;
  finalized_at: ISODateTime | null;
  created_at: ISODateTime;
}

export interface AuditReport {
  id: UUID;
  engagement: UUID;
  template: UUID | null;
  title: string;
  executive_summary: string;
  content: string;
  status: ReportStatus;
  status_display: string;
  distribution_list: string;
  generated_by: UUID | null;
  generated_by_detail?: UserListItem;
  finalized_by: UUID | null;
  finalized_by_detail?: UserListItem;
  finalized_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}
