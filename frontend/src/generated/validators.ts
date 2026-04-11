// ─────────────────────────────────────────────────────────────────────────────
// Zod validation schemas for Internal Audit Hub.
// Field names match the Django REST API (snake_case) and the types in models.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";

// ── Shared primitives ─────────────────────────────────────────────────────────

const uuidField = z.string().uuid({ message: "Must be a valid UUID" });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date (YYYY-MM-DD)");
const urlField = z.string().url({ message: "Must be a valid URL" }).or(z.literal(""));
const optionalUuid = uuidField.optional().nullable();
const optionalDate = isoDate.optional().nullable();
const optionalUrl = urlField.optional();

// ── Business Process ──────────────────────────────────────────────────────────

export const BusinessProcessSchema = z.object({
  id: uuidField,
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  owner: optionalUuid,
  is_active: z.boolean().optional(),
});

export const CreateBusinessProcessSchema = BusinessProcessSchema.omit({ id: true });
export const UpdateBusinessProcessSchema = BusinessProcessSchema;

export type BusinessProcessInput = z.infer<typeof BusinessProcessSchema>;
export type CreateBusinessProcessInput = z.infer<typeof CreateBusinessProcessSchema>;

// ── Business Objective ────────────────────────────────────────────────────────

export const BusinessObjectiveSchema = z.object({
  id: uuidField,
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  business_process: optionalUuid,
  owner: optionalUuid,
});

export const CreateBusinessObjectiveSchema = BusinessObjectiveSchema.omit({ id: true });
export const UpdateBusinessObjectiveSchema = BusinessObjectiveSchema;

export type BusinessObjectiveInput = z.infer<typeof BusinessObjectiveSchema>;
export type CreateBusinessObjectiveInput = z.infer<typeof CreateBusinessObjectiveSchema>;

// ── Risk ──────────────────────────────────────────────────────────────────────

const RiskCategoryEnum = z.enum([
  "operational", "financial", "compliance", "strategic",
  "reputational", "technology", "fraud", "other",
]);
const RiskStatusEnum = z.enum([
  "identified", "assessed", "mitigated", "accepted", "closed",
]);

export const RiskSchema = z.object({
  id: uuidField,
  name: z.string().min(1, "Name is required").max(300),
  description: z.string().optional(),
  category: RiskCategoryEnum,
  status: RiskStatusEnum,
  inherent_likelihood: z.number().int().min(1).max(5),
  inherent_impact: z.number().int().min(1).max(5),
  residual_likelihood: z.number().int().min(1).max(5).nullable().optional(),
  residual_impact: z.number().int().min(1).max(5).nullable().optional(),
  owner: optionalUuid,
  business_process: optionalUuid,
  treatment_plan: z.string().optional(),
});

export const CreateRiskSchema = RiskSchema.omit({ id: true });
export const UpdateRiskSchema = RiskSchema;

export type RiskInput = z.infer<typeof RiskSchema>;
export type CreateRiskInput = z.infer<typeof CreateRiskSchema>;
export type UpdateRiskInput = z.infer<typeof UpdateRiskSchema>;

// ── Control ───────────────────────────────────────────────────────────────────

const ControlTypeEnum = z.enum([
  "preventive", "detective", "corrective", "directive", "compensating",
]);
const ControlFrequencyEnum = z.enum([
  "continuous", "daily", "weekly", "monthly", "quarterly", "annually", "ad_hoc",
]);
const ControlStatusEnum = z.enum([
  "active", "inactive", "design_deficiency", "under_review",
]);

export const ControlSchema = z.object({
  id: uuidField,
  name: z.string().min(1, "Name is required").max(300),
  description: z.string().optional(),
  control_type: ControlTypeEnum,
  frequency: ControlFrequencyEnum.optional(),
  status: ControlStatusEnum,
  owner: optionalUuid,
  control_reference: z.string().max(100).optional(),
  business_process: optionalUuid,
  risks: z.array(uuidField).optional(),
});

export const CreateControlSchema = ControlSchema.omit({ id: true });
export const UpdateControlSchema = ControlSchema;

export type ControlInput = z.infer<typeof ControlSchema>;
export type CreateControlInput = z.infer<typeof CreateControlSchema>;
export type UpdateControlInput = z.infer<typeof UpdateControlSchema>;

// ── Audit Engagement ──────────────────────────────────────────────────────────

const EngagementStatusEnum = z.enum([
  "planning", "in_progress", "review", "completed", "cancelled",
]);

export const AuditEngagementSchema = z.object({
  id: uuidField,
  name: z.string().min(1, "Engagement name is required").max(300),
  description: z.string().optional(),
  status: EngagementStatusEnum,
  audit_manager: uuidField,
  business_process: optionalUuid,
  business_objective: optionalUuid,
  period: z.string().max(100).optional(),
  scope: z.string().optional(),
  objectives: z.string().optional(),
  start_date: optionalDate,
  end_date: optionalDate,
});

export const CreateAuditEngagementSchema = AuditEngagementSchema.omit({ id: true });
export const UpdateAuditEngagementSchema = AuditEngagementSchema;

export type AuditEngagementInput = z.infer<typeof AuditEngagementSchema>;
export type CreateAuditEngagementInput = z.infer<typeof CreateAuditEngagementSchema>;
export type UpdateAuditEngagementInput = z.infer<typeof UpdateAuditEngagementSchema>;

// ── Audit Task ────────────────────────────────────────────────────────────────

const TaskStatusEnum = z.enum(["todo", "in_progress", "review", "done", "blocked"]);
const TaskPriorityEnum = z.enum(["low", "medium", "high", "critical"]);

export const AuditTaskSchema = z.object({
  id: uuidField,
  engagement: uuidField,
  name: z.string().min(1, "Task name is required").max(300),
  description: z.string().optional(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  assigned_to: optionalUuid,
  due_date: optionalDate,
  escalation_flag: z.boolean().optional(),
  notes: z.string().optional(),
});

export const CreateAuditTaskSchema = AuditTaskSchema.omit({ id: true });
export const UpdateAuditTaskSchema = AuditTaskSchema;

export type AuditTaskInput = z.infer<typeof AuditTaskSchema>;
export type CreateAuditTaskInput = z.infer<typeof CreateAuditTaskSchema>;
export type UpdateAuditTaskInput = z.infer<typeof UpdateAuditTaskSchema>;

// ── Finding ───────────────────────────────────────────────────────────────────

const FindingTypeEnum = z.enum([
  "control_deficiency", "process_gap", "compliance_issue",
  "fraud_indicator", "observation", "best_practice",
]);
const FindingSeverityEnum = z.enum(["critical", "high", "medium", "low", "info"]);
const FindingStatusEnum = z.enum([
  "draft", "open", "in_remediation", "resolved", "closed", "risk_accepted",
]);

export const FindingSchema = z.object({
  id: uuidField,
  engagement: uuidField,
  title: z.string().min(1, "Title is required").max(300),
  description: z.string().optional(),
  finding_type: FindingTypeEnum.optional(),
  severity: FindingSeverityEnum,
  status: FindingStatusEnum,
  root_cause: z.string().optional(),
  management_response: z.string().optional(),
  control: optionalUuid,
  risk: optionalUuid,
  owner: optionalUuid,
  identified_date: optionalDate,
  due_date: optionalDate,
});

export const CreateFindingSchema = FindingSchema.omit({ id: true });
export const UpdateFindingSchema = FindingSchema;

export type FindingInput = z.infer<typeof FindingSchema>;
export type CreateFindingInput = z.infer<typeof CreateFindingSchema>;
export type UpdateFindingInput = z.infer<typeof UpdateFindingSchema>;

// ── Remediation Action ────────────────────────────────────────────────────────

const RemediationStatusEnum = z.enum([
  "open", "in_progress", "completed", "overdue", "cancelled",
]);

export const RemediationActionSchema = z.object({
  id: uuidField,
  finding: uuidField,
  description: z.string().min(1, "Description is required"),
  owner: optionalUuid,
  due_date: optionalDate,
  status: RemediationStatusEnum,
  completion_notes: z.string().optional(),
});

export const CreateRemediationActionSchema = RemediationActionSchema.omit({ id: true });
export const UpdateRemediationActionSchema = RemediationActionSchema;

export type RemediationActionInput = z.infer<typeof RemediationActionSchema>;
export type CreateRemediationActionInput = z.infer<typeof CreateRemediationActionSchema>;
export type UpdateRemediationActionInput = z.infer<typeof UpdateRemediationActionSchema>;

// ── Evidence ──────────────────────────────────────────────────────────────────

const EvidenceTypeEnum = z.enum([
  "workpaper", "screenshot", "document", "spreadsheet", "email", "photo", "other",
]);

const EvidenceBaseSchema = z.object({
  id: uuidField,
  finding: optionalUuid,
  engagement: optionalUuid,
  task: optionalUuid,
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  evidence_type: EvidenceTypeEnum,
  sharepoint_url: optionalUrl,
});

const evidenceLinkRefinement = (d: { finding?: string | null; engagement?: string | null; task?: string | null }) =>
  !!(d.finding || d.engagement || d.task);

export const EvidenceSchema = EvidenceBaseSchema.refine(evidenceLinkRefinement, {
  message: "Evidence must be linked to a finding, engagement, or task",
});

export const CreateEvidenceSchema = EvidenceBaseSchema.omit({ id: true }).refine(evidenceLinkRefinement, {
  message: "Evidence must be linked to a finding, engagement, or task",
});

export type EvidenceInput = z.infer<typeof EvidenceSchema>;
export type CreateEvidenceInput = z.infer<typeof CreateEvidenceSchema>;

// ── Approval Request ──────────────────────────────────────────────────────────

const ApprovalEntityTypeEnum = z.enum(["finding", "report", "engagement"]);

export const ApprovalRequestSchema = z.object({
  id: uuidField,
  entity_type: ApprovalEntityTypeEnum,
  entity_id: uuidField,
  entity_name: z.string().max(300).optional(),
  approver: uuidField,
  request_notes: z.string().optional(),
});

export const CreateApprovalRequestSchema = ApprovalRequestSchema.omit({ id: true });

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  review_notes: z.string().optional(),
});

export type ApprovalRequestInput = z.infer<typeof ApprovalRequestSchema>;
export type CreateApprovalRequestInput = z.infer<typeof CreateApprovalRequestSchema>;
export type ApprovalDecisionInput = z.infer<typeof ApprovalDecisionSchema>;

// ── Audit Report Template ─────────────────────────────────────────────────────

export const AuditReportTemplateSchema = z.object({
  id: uuidField,
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  content_template: z.string().min(1, "Template content is required"),
  sharepoint_template_url: optionalUrl,
  is_active: z.boolean().optional(),
});

export const CreateAuditReportTemplateSchema = AuditReportTemplateSchema.omit({ id: true });
export const UpdateAuditReportTemplateSchema = AuditReportTemplateSchema;

export type AuditReportTemplateInput = z.infer<typeof AuditReportTemplateSchema>;
export type CreateAuditReportTemplateInput = z.infer<typeof CreateAuditReportTemplateSchema>;
export type UpdateAuditReportTemplateInput = z.infer<typeof UpdateAuditReportTemplateSchema>;

// ── Audit Report ──────────────────────────────────────────────────────────────

const ReportStatusEnum = z.enum(["draft", "pending_review", "final", "archived"]);

export const AuditReportSchema = z.object({
  id: uuidField,
  engagement: uuidField,
  template: optionalUuid,
  title: z.string().min(1, "Title is required").max(300),
  executive_summary: z.string().optional(),
  content: z.string().optional(),
  status: ReportStatusEnum.optional(),
  distribution_list: z.string().optional(),
  sharepoint_report_url: optionalUrl,
});

export const CreateAuditReportSchema = AuditReportSchema.omit({ id: true });
export const UpdateAuditReportSchema = AuditReportSchema;

export type AuditReportInput = z.infer<typeof AuditReportSchema>;
export type CreateAuditReportInput = z.infer<typeof CreateAuditReportSchema>;
export type UpdateAuditReportInput = z.infer<typeof UpdateAuditReportSchema>;

// ── User / Auth ───────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const ChangePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    new_password_confirm: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.new_password === d.new_password_confirm, {
    message: "Passwords do not match",
    path: ["new_password_confirm"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
