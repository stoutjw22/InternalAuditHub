// ─────────────────────────────────────────────────────────────────────────────
// React Query hooks for the Internal Audit Hub Django REST API.
// Each hook wraps a DRF endpoint and returns standard TanStack Query objects.
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  ApprovalRequest,
  AuditEngagement,
  AuditEngagementList,
  AuditLog,
  AuditReport,
  AuditReportList,
  AuditReportTemplate,
  AuditTask,
  BusinessObjective,
  BusinessProcess,
  Control,
  EngagementControl,
  EngagementRisk,
  Evidence,
  Finding,
  FindingListItem,
  PaginatedResponse,
  RemediationAction,
  Risk,
  UserListItem,
  UserProfile,
} from "./models";

// ── Generic helpers ───────────────────────────────────────────────────────────

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const { data } = await apiClient.post<T>(url, body);
  return data;
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  const { data } = await apiClient.patch<T>(url, body);
  return data;
}

async function del(url: string): Promise<void> {
  await apiClient.delete(url);
}

// ── Query key factories ───────────────────────────────────────────────────────
export const QK = {
  users: (params?: object) => ["users", params],
  usersByRole: (role: string) => ["users", "role", role],
  businessProcesses: () => ["business-processes"],
  businessProcess: (id: string) => ["business-processes", id],
  businessObjectives: (params?: object) => ["business-objectives", params],
  businessObjective: (id: string) => ["business-objectives", id],
  auditLogs: (params?: object) => ["audit-logs", params],
  engagements: (params?: object) => ["engagements", params],
  engagement: (id: string) => ["engagements", id],
  engagementAuditors: (engId: string) => ["engagements", engId, "auditors"],
  engagementTasks: (engId: string) => ["engagements", engId, "tasks"],
  risks: (params?: object) => ["risks", params],
  risk: (id: string) => ["risks", id],
  engagementRisks: (engId: string) => ["engagements", engId, "risks"],
  controls: (params?: object) => ["controls", params],
  control: (id: string) => ["controls", id],
  engagementControls: (engId: string) => ["engagements", engId, "controls"],
  findings: (params?: object) => ["findings", params],
  finding: (id: string) => ["findings", id],
  engagementFindings: (engId: string) => ["engagements", engId, "findings"],
  remediations: (params?: object) => ["remediations", params],
  findingRemediations: (findingId: string) => ["findings", findingId, "remediations"],
  evidence: (findingId: string) => ["findings", findingId, "evidence"],
  engagementEvidence: (engId: string) => ["engagements", engId, "evidence"],
  approvals: (params?: object) => ["approvals", params],
  approval: (id: string) => ["approvals", id],
  reportTemplates: (params?: object) => ["report-templates", params],
  reportTemplate: (id: string) => ["report-templates", id],
  reports: (params?: object) => ["reports", params],
  report: (id: string) => ["reports", id],
  engagementReports: (engId: string) => ["engagements", engId, "reports"],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS
// ─────────────────────────────────────────────────────────────────────────────

export function useUserList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.users(params),
    queryFn: () => get<UserListItem[]>("/auth/users/", params),
  });
}

export function useUsersByRole(role: "auditors" | "managers" | "risk-owners" | "control-owners" | "finding-owners") {
  return useQuery({
    queryKey: QK.usersByRole(role),
    queryFn: () => get<UserListItem[]>(`/auth/users/${role}/`),
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => get<UserProfile>("/auth/me/"),
    staleTime: Infinity,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => patch<UserProfile>("/auth/me/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["me"] }); },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
      post<void>("/auth/password/change/", data),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE — Business Processes
// ─────────────────────────────────────────────────────────────────────────────

export function useBusinessProcessList() {
  return useQuery({
    queryKey: QK.businessProcesses(),
    queryFn: () => get<BusinessProcess[]>("/business-processes/"),
  });
}

export function useBusinessProcess(id: string) {
  return useQuery({
    queryKey: QK.businessProcess(id),
    queryFn: () => get<BusinessProcess>(`/business-processes/${id}/`),
    enabled: !!id,
  });
}

export function useCreateBusinessProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessProcess>) => post<BusinessProcess>("/business-processes/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.businessProcesses() }); },
  });
}

export function useUpdateBusinessProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BusinessProcess> & { id: string }) =>
      patch<BusinessProcess>(`/business-processes/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.businessProcesses() });
      qc.invalidateQueries({ queryKey: QK.businessProcess(id) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE — Business Objectives
// ─────────────────────────────────────────────────────────────────────────────

export function useBusinessObjectiveList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.businessObjectives(params),
    queryFn: () => get<BusinessObjective[]>("/business-objectives/", params),
  });
}

export function useCreateBusinessObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<BusinessObjective>) => post<BusinessObjective>("/business-objectives/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-objectives"] }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE — Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditLogList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditLogs(params),
    queryFn: () => get<PaginatedResponse<AuditLog>>("/audit-logs/", params),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGAGEMENTS
// ─────────────────────────────────────────────────────────────────────────────

export function useEngagementList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.engagements(params),
    queryFn: () => get<PaginatedResponse<AuditEngagementList>>("/engagements/", params),
  });
}

export function useEngagement(id: string) {
  return useQuery({
    queryKey: QK.engagement(id),
    queryFn: () => get<AuditEngagement>(`/engagements/${id}/`),
    enabled: !!id,
  });
}

export function useCreateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AuditEngagement>) => post<AuditEngagement>("/engagements/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagements"] }); },
  });
}

export function useUpdateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AuditEngagement> & { id: string }) =>
      patch<AuditEngagement>(`/engagements/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["engagements"] });
      qc.invalidateQueries({ queryKey: QK.engagement(id) });
    },
  });
}

export function useDeleteEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/engagements/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagements"] }); },
  });
}

// ── Auditors ──────────────────────────────────────────────────────────────────

export function useEngagementAuditorList(engagementId: string) {
  return useQuery({
    queryKey: QK.engagementAuditors(engagementId),
    queryFn: () => get<{ results: { id: string; auditor: string; auditor_detail?: UserListItem; role_note: string; assigned_at: string }[] }>(
      `/engagements/${engagementId}/auditors/`
    ),
    enabled: !!engagementId,
  });
}

export function useAddEngagementAuditor(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { auditor: string; role_note?: string }) =>
      post(`/engagements/${engagementId}/auditors/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementAuditors(engagementId) }); },
  });
}

export function useRemoveEngagementAuditor(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (auditorId: string) => del(`/engagements/${engagementId}/auditors/${auditorId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementAuditors(engagementId) }); },
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function useEngagementTaskList(engagementId: string) {
  return useQuery({
    queryKey: QK.engagementTasks(engagementId),
    queryFn: () => get<AuditTask[]>(`/engagements/${engagementId}/tasks/`),
    enabled: !!engagementId,
  });
}

export function useCreateTask(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AuditTask>) =>
      post<AuditTask>(`/engagements/${engagementId}/tasks/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementTasks(engagementId) }); },
  });
}

export function useUpdateTask(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AuditTask> & { id: string }) =>
      patch<AuditTask>(`/engagements/${engagementId}/tasks/${id}/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementTasks(engagementId) }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RISKS
// ─────────────────────────────────────────────────────────────────────────────

export function useRiskList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.risks(params),
    queryFn: () => get<PaginatedResponse<Risk>>("/risks/", params),
  });
}

export function useRisk(id: string) {
  return useQuery({
    queryKey: QK.risk(id),
    queryFn: () => get<Risk>(`/risks/${id}/`),
    enabled: !!id,
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Risk>) => post<Risk>("/risks/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risks"] }); },
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Risk> & { id: string }) =>
      patch<Risk>(`/risks/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["risks"] });
      qc.invalidateQueries({ queryKey: QK.risk(id) });
    },
  });
}

export function useDeleteRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/risks/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risks"] }); },
  });
}

export function useEngagementRiskList(engagementId: string) {
  return useQuery({
    queryKey: QK.engagementRisks(engagementId),
    queryFn: () => get<EngagementRisk[]>(`/engagements/${engagementId}/risks/`),
    enabled: !!engagementId,
  });
}

export function useAddEngagementRisk(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { risk: string; assessment_notes?: string; is_in_scope?: boolean }) =>
      post<EngagementRisk>(`/engagements/${engagementId}/risks/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementRisks(engagementId) }); },
  });
}

export function useRemoveEngagementRisk(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (engagementRiskId: string) =>
      del(`/engagements/${engagementId}/risks/${engagementRiskId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementRisks(engagementId) }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

export function useControlList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.controls(params),
    queryFn: () => get<PaginatedResponse<Control>>("/controls/", params),
  });
}

export function useControl(id: string) {
  return useQuery({
    queryKey: QK.control(id),
    queryFn: () => get<Control>(`/controls/${id}/`),
    enabled: !!id,
  });
}

export function useCreateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Control>) => post<Control>("/controls/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["controls"] }); },
  });
}

export function useUpdateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Control> & { id: string }) =>
      patch<Control>(`/controls/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["controls"] });
      qc.invalidateQueries({ queryKey: QK.control(id) });
    },
  });
}

export function useDeleteControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/controls/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["controls"] }); },
  });
}

export function useEngagementControlList(engagementId: string) {
  return useQuery({
    queryKey: QK.engagementControls(engagementId),
    queryFn: () => get<EngagementControl[]>(`/engagements/${engagementId}/controls/`),
    enabled: !!engagementId,
  });
}

export function useAddEngagementControl(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EngagementControl>) =>
      post<EngagementControl>(`/engagements/${engagementId}/controls/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementControls(engagementId) }); },
  });
}

export function useUpdateEngagementControl(engagementId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<EngagementControl> & { id: string }) =>
      patch<EngagementControl>(`/engagements/${engagementId}/controls/${id}/`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementControls(engagementId) }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FINDINGS
// ─────────────────────────────────────────────────────────────────────────────

export function useFindingList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.findings(params),
    queryFn: () => get<PaginatedResponse<FindingListItem>>("/findings/", params),
  });
}

export function useFinding(id: string) {
  return useQuery({
    queryKey: QK.finding(id),
    queryFn: () => get<Finding>(`/findings/${id}/`),
    enabled: !!id,
  });
}

export function useEngagementFindingList(engagementId: string) {
  return useQuery({
    queryKey: QK.engagementFindings(engagementId),
    queryFn: () => get<FindingListItem[]>(`/engagements/${engagementId}/findings/`),
    enabled: !!engagementId,
  });
}

export function useCreateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Finding>) => post<Finding>("/findings/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["findings"] }); },
  });
}

export function useUpdateFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Finding> & { id: string }) =>
      patch<Finding>(`/findings/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["findings"] });
      qc.invalidateQueries({ queryKey: QK.finding(id) });
    },
  });
}

export function useDeleteFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/findings/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["findings"] }); },
  });
}

// ── Remediation Actions ───────────────────────────────────────────────────────

export function useRemediationList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.remediations(params),
    queryFn: () => get<PaginatedResponse<RemediationAction>>("/remediations/", params),
  });
}

export function useFindingRemediationList(findingId: string) {
  return useQuery({
    queryKey: QK.findingRemediations(findingId),
    queryFn: () => get<RemediationAction[]>(`/findings/${findingId}/remediations/`),
    enabled: !!findingId,
  });
}

export function useCreateRemediation(findingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RemediationAction>) =>
      post<RemediationAction>(`/findings/${findingId}/remediations/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.findingRemediations(findingId) });
      qc.invalidateQueries({ queryKey: ["remediations"] });
    },
  });
}

export function useUpdateRemediation(findingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<RemediationAction> & { id: string }) =>
      patch<RemediationAction>(`/findings/${findingId}/remediations/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.findingRemediations(findingId) });
      qc.invalidateQueries({ queryKey: ["remediations"] });
    },
  });
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export function useFindingEvidenceList(findingId: string) {
  return useQuery({
    queryKey: QK.evidence(findingId),
    queryFn: () => get<Evidence[]>(`/findings/${findingId}/evidence/`),
    enabled: !!findingId,
  });
}

export function useUploadEvidence(findingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient
        .post<Evidence>(`/findings/${findingId}/evidence/`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.evidence(findingId) }); },
  });
}

export function useDeleteEvidence(findingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      del(`/findings/${findingId}/evidence/${evidenceId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.evidence(findingId) }); },
  });
}

// ── Approval Requests ─────────────────────────────────────────────────────────

export function useApprovalList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.approvals(params),
    queryFn: () => get<PaginatedResponse<ApprovalRequest>>("/approvals/", params),
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: QK.approval(id),
    queryFn: () => get<ApprovalRequest>(`/approvals/${id}/`),
    enabled: !!id,
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ApprovalRequest>) => post<ApprovalRequest>("/approvals/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); },
  });
}

export function useApprovalDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, review_notes }: { id: string; decision: "approved" | "rejected"; review_notes?: string }) =>
      post<ApprovalRequest>(`/approvals/${id}/decision/`, { decision, review_notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────────────────────

export function useReportTemplateList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.reportTemplates(params),
    queryFn: () => get<AuditReportTemplate[]>("/report-templates/", params),
  });
}

export function useReportTemplate(id: string) {
  return useQuery({
    queryKey: QK.reportTemplate(id),
    queryFn: () => get<AuditReportTemplate>(`/report-templates/${id}/`),
    enabled: !!id,
  });
}

export function useCreateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AuditReportTemplate>) =>
      post<AuditReportTemplate>("/report-templates/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report-templates"] }); },
  });
}

export function useUpdateReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AuditReportTemplate> & { id: string }) =>
      patch<AuditReportTemplate>(`/report-templates/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["report-templates"] });
      qc.invalidateQueries({ queryKey: QK.reportTemplate(id) });
    },
  });
}

export function useDeleteReportTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/report-templates/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report-templates"] }); },
  });
}

export function useReportList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.reports(params),
    queryFn: () => get<PaginatedResponse<AuditReportList>>("/reports/", params),
  });
}

export function useReport(id: string) {
  return useQuery({
    queryKey: QK.report(id),
    queryFn: () => get<AuditReport>(`/reports/${id}/`),
    enabled: !!id,
  });
}

export function useEngagementReportList(engagementId: string) {
  return useQuery({
    queryKey: QK.engagementReports(engagementId),
    queryFn: () => get<AuditReportList[]>(`/engagements/${engagementId}/reports/`),
    enabled: !!engagementId,
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AuditReport>) => post<AuditReport>("/reports/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); },
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AuditReport> & { id: string }) =>
      patch<AuditReport>(`/reports/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: QK.report(id) });
    },
  });
}

export function useFinalizeReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<AuditReport>(`/reports/${id}/finalize/`, {}),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: QK.report(id) });
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/reports/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ALIAS EXPORTS — original PowerApps hook name compatibility
// These allow original page components that used Dataverse-generated hook names
// to work alongside the Django-backed hooks above without any code changes.
// ─────────────────────────────────────────────────────────────────────────────

/** Alias: useAuditEngagementList → useEngagementList */
export const useAuditEngagementList = useEngagementList;

/** Alias: useAuditEngagement → useEngagement */
export const useAuditEngagement = useEngagement;

/** Alias: useApprovalRequestList → useApprovalList */
export const useApprovalRequestList = useApprovalList;

/** Alias: useApprovalRequest → useApproval */
export const useApprovalRequest = useApproval;

/** Alias: useRemediationActionList → useRemediationList */
export const useRemediationActionList = useRemediationList;

/** Alias: useAuditReportList → useReportList */
export const useAuditReportList = useReportList;

/** Alias: useAuditReport → useReport */
export const useAuditReport = useReport;

/** Alias: useAuditReportTemplateList → useReportTemplateList */
export const useAuditReportTemplateList = useReportTemplateList;

/** Alias: useAuditReportTemplate → useReportTemplate */
export const useAuditReportTemplate = useReportTemplate;
