// ─────────────────────────────────────────────────────────────────────────────
// React Query hooks for the Internal Audit Hub Django REST API.
// Transformation layer: maps Django API responses to Dataverse-shaped types so
// all page components work without modification.
// ─────────────────────────────────────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type {
  AuditableEntity,
  AuditableEntityDetail,
  AuditPlanSummary as AuditPlanSummaryModel,
  AuditPlanYear,
  BulkImportResult,
  ControlEffectivenessScale,
  ControlRelianceCycle,
  GRCTestingTheme,
  KeyControlAssignment,
  MARTestingEngagement,
  RiskScoringConfig,
} from "./models/audit-plan";
import type {
  ApprovalRequest,
  AuditEngagement,
  AuditEngagementList,
  AuditLog,
  AuditManager,
  AuditReport,
  AuditReportList,
  AuditReportTemplate,
  AuditTask,
  AuditUser,
  BusinessObjective,
  BusinessProcess,
  Control,
  ControlOwner,
  EngagementAuditor,
  EngagementAuditorRoleKey,
  EngagementControl,
  EngagementRisk,
  Evidence,
  Finding,
  FindingListItem,
  FindingOwner,
  LoginResponse,
  PaginatedResponse,
  RemediationAction,
  Risk,
  RiskOwner,
  SampleItem,
  TestException,
  TestInstance,
  TestInstanceStatistics,
  TestPlan,
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

/** Unwrap DRF paginated response or pass through a plain array. */
function unwrap<T>(response: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(response) ? response : response.results;
}

// ── Query key factories ───────────────────────────────────────────────────────
export const QK = {
  // Auth
  me: () => ["me"] as const,
  // Users (generic)
  users: (params?: object) => ["users", params] as const,
  usersByRole: (role: string) => ["users", "role", role] as const,
  // Role-typed user lists
  auditUsers: () => ["audit-users"] as const,
  auditManagers: () => ["audit-managers"] as const,
  riskOwners: () => ["risk-owners"] as const,
  controlOwners: () => ["control-owners"] as const,
  findingOwners: () => ["finding-owners"] as const,
  // Core
  businessProcesses: () => ["business-processes"] as const,
  businessProcess: (id: string) => ["business-processes", id] as const,
  businessObjectives: (params?: object) => ["business-objectives", params] as const,
  businessObjective: (id: string) => ["business-objectives", id] as const,
  auditLogs: (params?: object) => ["audit-logs", params] as const,
  // Engagements
  engagements: (params?: object) => ["engagements", params] as const,
  engagement: (id: string) => ["engagements", id] as const,
  engagementAuditors: (engId: string) => ["engagements", engId, "auditors"] as const,
  engagementAuditorsFlat: () => ["engagement-auditors"] as const,
  engagementTasks: (engId: string) => ["engagements", engId, "tasks"] as const,
  // Risks
  risks: (params?: object) => ["risks", params] as const,
  risk: (id: string) => ["risks", id] as const,
  engagementRisks: (engId: string) => ["engagements", engId, "risks"] as const,
  engagementRisksFlat: () => ["engagement-risks"] as const,
  // Controls
  controls: (params?: object) => ["controls", params] as const,
  control: (id: string) => ["controls", id] as const,
  engagementControls: (engId: string) => ["engagements", engId, "controls"] as const,
  engagementControlsFlat: () => ["engagement-controls"] as const,
  // Findings
  findings: (params?: object) => ["findings", params] as const,
  finding: (id: string) => ["findings", id] as const,
  engagementFindings: (engId: string) => ["engagements", engId, "findings"] as const,
  // Remediations & Evidence
  remediations: (params?: object) => ["remediations", params] as const,
  findingRemediations: (findingId: string) => ["findings", findingId, "remediations"] as const,
  evidence: (findingId: string) => ["findings", findingId, "evidence"] as const,
  evidenceFlat: (params?: object) => ["evidence", params] as const,
  engagementEvidence: (engId: string) => ["engagements", engId, "evidence"] as const,
  // Approvals
  approvals: (params?: object) => ["approvals", params] as const,
  approval: (id: string) => ["approvals", id] as const,
  // Reports
  reportTemplates: (params?: object) => ["report-templates", params] as const,
  reportTemplate: (id: string) => ["report-templates", id] as const,
  reports: (params?: object) => ["reports", params] as const,
  report: (id: string) => ["reports", id] as const,
  engagementReports: (engId: string) => ["engagements", engId, "reports"] as const,
  // Testing (Epic 4)
  testPlans: (params?: object) => ["test-plans", params] as const,
  testPlan: (id: string) => ["test-plans", id] as const,
  controlTestPlans: (controlId: string) => ["controls", controlId, "test-plans"] as const,
  testInstances: (planId: string) => ["test-plans", planId, "instances"] as const,
  testInstance: (id: string) => ["test-instances", id] as const,
  testInstanceStats: (id: string) => ["test-instances", id, "statistics"] as const,
  sampleItems: (instanceId: string) => ["test-instances", instanceId, "samples"] as const,
  testExceptions: (instanceId: string) => ["test-instances", instanceId, "exceptions"] as const,
  // Audit Plan (6-Year)
  auditPlanEntities: (params?: object) => ["audit-plan-entities", params] as const,
  auditPlanEntity: (id: number) => ["audit-plan-entities", id] as const,
  auditPlanEntityPlanYears: (id: number) => ["audit-plan-entities", id, "plan-years"] as const,
  auditPlanEntityControls: (id: number) => ["audit-plan-entities", id, "controls"] as const,
  auditPlanYears: (params?: object) => ["audit-plan-years", params] as const,
  auditPlanRiskScoring: () => ["audit-plan-risk-scoring"] as const,
  auditPlanEffectivenessScale: () => ["audit-plan-effectiveness-scale"] as const,
  auditPlanControls: (params?: object) => ["audit-plan-controls", params] as const,
  auditPlanRelianceCycles: (params?: object) => ["audit-plan-reliance-cycles", params] as const,
  auditPlanGrcThemes: (params?: object) => ["audit-plan-grc-themes", params] as const,
  auditPlanMarEngagements: (params?: object) => ["audit-plan-mar-engagements", params] as const,
  auditPlanSummary: () => ["audit-plan-summary"] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      post<LoginResponse>("/auth/token/", { email, password }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (refresh: string) =>
      post<void>("/auth/token/blacklist/", { refresh }),
    onSuccess: () => qc.clear(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS — Generic user endpoints
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
    queryKey: QK.me(),
    queryFn: () => get<UserProfile>("/auth/me/"),
    staleTime: Infinity,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserProfile>) => patch<UserProfile>("/auth/me/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.me() }); },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
      post<void>("/auth/password/change/", data),
  });
}

// ── Role-typed user hooks (Dataverse transformation layer) ────────────────────
// Each hook fetches UserListItem[] from a Django role-slug endpoint and maps to
// the Dataverse-shaped type (AuditUser, AuditManager, etc.) that pages expect.

export function useAuditUserList() {
  return useQuery({
    queryKey: QK.auditUsers(),
    queryFn: async () => {
      const users = await get<UserListItem[]>("/auth/users/auditors/");
      return users.map((u): AuditUser => ({
        id: u.id,
        auditusername: u.full_name,
        email: u.email,
      }));
    },
  });
}

export function useCreateAuditUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AuditUser, "id">) =>
      post<UserListItem>("/auth/register/", {
        username: data.auditusername,
        email: data.email,
        phone: data.phone,
        role: "auditor",
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.auditUsers() }); },
  });
}

export function useUpdateAuditUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<AuditUser> }) =>
      patch<UserListItem>(`/auth/users/${id}/`, {
        full_name: changedFields.auditusername,
        email: changedFields.email,
        phone: changedFields.phone,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.auditUsers() }); },
  });
}

export function useDeleteAuditUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/auth/users/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.auditUsers() }); },
  });
}

export function useAuditManagerList() {
  return useQuery({
    queryKey: QK.auditManagers(),
    queryFn: async () => {
      const users = await get<UserListItem[]>("/auth/users/managers/");
      return users.map((u): AuditManager => ({
        id: u.id,
        auditmanagername: u.full_name,
        email: u.email,
      }));
    },
  });
}

export function useCreateAuditManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<AuditManager, "id">) =>
      post<UserListItem>("/auth/register/", {
        username: data.auditmanagername,
        email: data.email,
        phone: data.phone,
        role: "manager",
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.auditManagers() }); },
  });
}

export function useUpdateAuditManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<AuditManager> }) =>
      patch<UserListItem>(`/auth/users/${id}/`, {
        full_name: changedFields.auditmanagername,
        email: changedFields.email,
        phone: changedFields.phone,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.auditManagers() }); },
  });
}

export function useDeleteAuditManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/auth/users/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.auditManagers() }); },
  });
}

export function useRiskOwnerList() {
  return useQuery({
    queryKey: QK.riskOwners(),
    queryFn: async () => {
      const users = await get<UserListItem[]>("/auth/users/risk-owners/");
      return users.map((u): RiskOwner => ({
        id: u.id,
        riskownername: u.full_name,
        email: u.email,
      }));
    },
  });
}

export function useCreateRiskOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<RiskOwner, "id">) =>
      post<UserListItem>("/auth/register/", {
        username: data.riskownername,
        email: data.email,
        phone: data.phone,
        role: "risk_owner",
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.riskOwners() }); },
  });
}

export function useUpdateRiskOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<RiskOwner> }) =>
      patch<UserListItem>(`/auth/users/${id}/`, {
        full_name: changedFields.riskownername,
        email: changedFields.email,
        phone: changedFields.phone,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.riskOwners() }); },
  });
}

export function useDeleteRiskOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/auth/users/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.riskOwners() }); },
  });
}

export function useControlOwnerList() {
  return useQuery({
    queryKey: QK.controlOwners(),
    queryFn: async () => {
      const users = await get<UserListItem[]>("/auth/users/control-owners/");
      return users.map((u): ControlOwner => ({
        id: u.id,
        controlownername: u.full_name,
        email: u.email,
      }));
    },
  });
}

export function useCreateControlOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ControlOwner, "id">) =>
      post<UserListItem>("/auth/register/", {
        username: data.controlownername,
        email: data.email,
        phone: data.phone,
        role: "control_owner",
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.controlOwners() }); },
  });
}

export function useUpdateControlOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<ControlOwner> }) =>
      patch<UserListItem>(`/auth/users/${id}/`, {
        full_name: changedFields.controlownername,
        email: changedFields.email,
        phone: changedFields.phone,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.controlOwners() }); },
  });
}

export function useDeleteControlOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/auth/users/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.controlOwners() }); },
  });
}

export function useFindingOwnerList() {
  return useQuery({
    queryKey: QK.findingOwners(),
    queryFn: async () => {
      const users = await get<UserListItem[]>("/auth/users/finding-owners/");
      return users.map((u): FindingOwner => ({
        id: u.id,
        findingownername: u.full_name,
        email: u.email,
      }));
    },
  });
}

export function useCreateFindingOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<FindingOwner, "id">) =>
      post<UserListItem>("/auth/register/", {
        username: data.findingownername,
        email: data.email,
        phone: data.phone,
        role: "finding_owner",
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.findingOwners() }); },
  });
}

export function useUpdateFindingOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<FindingOwner> }) =>
      patch<UserListItem>(`/auth/users/${id}/`, {
        full_name: changedFields.findingownername,
        email: changedFields.email,
        phone: changedFields.phone,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.findingOwners() }); },
  });
}

export function useDeleteFindingOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/auth/users/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.findingOwners() }); },
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<BusinessProcess> }) =>
      patch<BusinessProcess>(`/business-processes/${id}/`, changedFields),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.businessProcesses() });
      qc.invalidateQueries({ queryKey: QK.businessProcess(id) });
    },
  });
}

export function useDeleteBusinessProcess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/business-processes/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.businessProcesses() }); },
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

export function useDeleteBusinessObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/business-objectives/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["business-objectives"] }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE — Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a paginated response — pages access .count for pagination controls. */
export function useAuditLogList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditLogs(params),
    queryFn: () => get<PaginatedResponse<AuditLog>>("/audit-logs/", params),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGAGEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Unwraps DRF pagination — pages default to `[]`. */
export function useEngagementList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.engagements(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<AuditEngagementList> | AuditEngagementList[]>("/engagements/", params);
      return unwrap(r);
    },
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<AuditEngagement> }) =>
      patch<AuditEngagement>(`/engagements/${id}/`, changedFields),
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

// ── Engagement Auditors ───────────────────────────────────────────────────────

/** Django auditor record shape from the nested endpoint. */
interface DjangoAuditorRecord {
  id: string;
  engagement?: string;
  auditor: string;
  auditor_detail?: UserListItem;
  role?: string;
  role_note?: string;
  assigned_at?: string;
}

/**
 * List engagement auditors.
 * Called without args on dashboard/engagements pages → hits flat /engagement-auditors/.
 * Called with engagementId → hits nested /engagements/{id}/auditors/.
 * Transforms Django response to Dataverse EngagementAuditor shape.
 */
export function useEngagementAuditorList(engagementId?: string) {
  return useQuery({
    queryKey: engagementId
      ? QK.engagementAuditors(engagementId)
      : QK.engagementAuditorsFlat(),
    queryFn: async () => {
      const url = engagementId
        ? `/engagements/${engagementId}/auditors/`
        : "/engagement-auditors/";
      const response = await get<PaginatedResponse<DjangoAuditorRecord> | DjangoAuditorRecord[]>(url);
      const items = unwrap(response);
      return items.map((ea): EngagementAuditor => ({
        id: ea.id,
        auditengagement: ea.engagement ? { id: ea.engagement } : undefined,
        audituser: ea.auditor_detail
          ? { id: ea.auditor, auditusername: ea.auditor_detail.full_name }
          : { id: ea.auditor, auditusername: ea.auditor },
        roleKey: (ea.role ?? ea.role_note ?? undefined) as EngagementAuditorRoleKey | undefined,
      }));
    },
    enabled: engagementId === undefined ? true : !!engagementId,
  });
}

/**
 * Add an auditor to an engagement.
 * Accepts the Dataverse EngagementAuditor shape; translates to Django API format.
 */
export function useAddEngagementAuditor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EngagementAuditor> & { assigneddate?: string; engagementauditorname?: string }) => {
      const engId = data.auditengagement?.id;
      if (!engId) throw new Error("auditengagement.id is required");
      return post(`/engagements/${engId}/auditors/`, {
        auditor: data.audituser?.id,
        role_note: data.roleKey ?? "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.engagementAuditorsFlat() });
      qc.invalidateQueries({ queryKey: ["engagements"] });
    },
  });
}

/** Remove an auditor assignment by its own ID (EngagementAuditor.id). */
export function useRemoveEngagementAuditor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (engagementAuditorId: string) =>
      del(`/engagement-auditors/${engagementAuditorId}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.engagementAuditorsFlat() });
      qc.invalidateQueries({ queryKey: ["engagements"] });
    },
  });
}

// ── Engagement Tasks ──────────────────────────────────────────────────────────

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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<AuditTask> }) =>
      patch<AuditTask>(`/engagements/${engagementId}/tasks/${id}/`, changedFields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementTasks(engagementId) }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RISKS
// ─────────────────────────────────────────────────────────────────────────────

/** Unwraps DRF pagination — pages default to `[]`. */
export function useRiskList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.risks(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<Risk> | Risk[]>("/risks/", params);
      return unwrap(r);
    },
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<Risk> }) =>
      patch<Risk>(`/risks/${id}/`, changedFields),
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

/**
 * List engagement risks.
 * Called without args → hits flat /engagement-risks/ (returns all, pages filter client-side).
 * Called with engagementId → hits nested /engagements/{id}/risks/.
 */
export function useEngagementRiskList(engagementId?: string) {
  return useQuery({
    queryKey: engagementId
      ? QK.engagementRisks(engagementId)
      : QK.engagementRisksFlat(),
    queryFn: async () => {
      const url = engagementId
        ? `/engagements/${engagementId}/risks/`
        : "/engagement-risks/";
      const r = await get<PaginatedResponse<EngagementRisk> | EngagementRisk[]>(url);
      return unwrap(r);
    },
    enabled: engagementId === undefined ? true : !!engagementId,
  });
}

/** Add a risk to an engagement scope. */
export function useAddEngagementRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EngagementRisk>) =>
      post<EngagementRisk>("/engagement-risks/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementRisksFlat() }); },
  });
}

/** Remove a risk from an engagement scope by EngagementRisk.id. */
export function useRemoveEngagementRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/engagement-risks/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementRisksFlat() }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

/** Unwraps DRF pagination — pages default to `[]`. */
export function useControlList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.controls(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<Control> | Control[]>("/controls/", params);
      return unwrap(r);
    },
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<Control> }) =>
      patch<Control>(`/controls/${id}/`, changedFields),
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

/**
 * List engagement controls.
 * Called without args → hits flat /engagement-controls/ (pages filter client-side).
 * Called with engagementId → hits nested /engagements/{id}/controls/.
 */
export function useEngagementControlList(engagementId?: string) {
  return useQuery({
    queryKey: engagementId
      ? QK.engagementControls(engagementId)
      : QK.engagementControlsFlat(),
    queryFn: async () => {
      const url = engagementId
        ? `/engagements/${engagementId}/controls/`
        : "/engagement-controls/";
      const r = await get<PaginatedResponse<EngagementControl> | EngagementControl[]>(url);
      return unwrap(r);
    },
    enabled: engagementId === undefined ? true : !!engagementId,
  });
}

/** Add a control to an engagement scope. */
export function useAddEngagementControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<EngagementControl>) =>
      post<EngagementControl>("/engagement-controls/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementControlsFlat() }); },
  });
}

export function useUpdateEngagementControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<EngagementControl> }) =>
      patch<EngagementControl>(`/engagement-controls/${id}/`, changedFields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementControlsFlat() }); },
  });
}

/** Remove a control from an engagement scope by EngagementControl.id. */
export function useRemoveEngagementControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/engagement-controls/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.engagementControlsFlat() }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FINDINGS
// ─────────────────────────────────────────────────────────────────────────────

/** Unwraps DRF pagination — pages default to `[]`. */
export function useFindingList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.findings(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<FindingListItem> | FindingListItem[]>("/findings/", params);
      return unwrap(r);
    },
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<Finding> }) =>
      patch<Finding>(`/findings/${id}/`, changedFields),
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

// ─────────────────────────────────────────────────────────────────────────────
// REMEDIATION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Flat list of all remediations — pages default to `[]` and filter client-side. */
export function useRemediationList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.remediations(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<RemediationAction> | RemediationAction[]>("/remediations/", params);
      return unwrap(r);
    },
  });
}

/** Nested remediations scoped to a specific finding. */
export function useFindingRemediationList(findingId: string) {
  return useQuery({
    queryKey: QK.findingRemediations(findingId),
    queryFn: () => get<RemediationAction[]>(`/findings/${findingId}/remediations/`),
    enabled: !!findingId,
  });
}

/** Create a remediation via the flat endpoint (no findingId closure required). */
export function useCreateRemediation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RemediationAction>) =>
      post<RemediationAction>("/remediations/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["remediations"] }); },
  });
}

/** Update a remediation via the flat endpoint. Uses `changedFields` pattern. */
export function useUpdateRemediation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<RemediationAction> }) =>
      patch<RemediationAction>(`/remediations/${id}/`, changedFields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["remediations"] }); },
  });
}

/** Delete a remediation via the flat endpoint. */
export function useDeleteRemediation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/remediations/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["remediations"] }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

/** Nested evidence scoped to a specific finding. */
export function useFindingEvidenceList(findingId: string) {
  return useQuery({
    queryKey: QK.evidence(findingId),
    queryFn: () => get<Evidence[]>(`/findings/${findingId}/evidence/`),
    enabled: !!findingId,
  });
}

/** Upload evidence as multipart/form-data to the nested finding endpoint. */
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

/** Delete a specific evidence file from a finding. */
export function useDeleteEvidence(findingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evidenceId: string) =>
      del(`/findings/${findingId}/evidence/${evidenceId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.evidence(findingId) }); },
  });
}

/** Flat evidence list — pages default to `[]`. */
export function useEvidenceList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.evidenceFlat(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<Evidence> | Evidence[]>("/evidence/", params);
      return unwrap(r);
    },
  });
}

/** Create evidence via the flat endpoint (JSON payload, no file upload). */
export function useCreateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Evidence>) => post<Evidence>("/evidence/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.evidenceFlat() }); },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/** Unwraps DRF pagination — pages default to `[]`. */
export function useApprovalList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.approvals(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<ApprovalRequest> | ApprovalRequest[]>("/approvals/", params);
      return unwrap(r);
    },
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

export function useUpdateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<ApprovalRequest> }) =>
      patch<ApprovalRequest>(`/approvals/${id}/`, changedFields),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: QK.approval(id) });
    },
  });
}

export function useDeleteApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/approvals/${id}/`),
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<AuditReportTemplate> }) =>
      patch<AuditReportTemplate>(`/report-templates/${id}/`, changedFields),
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

/** Unwraps DRF pagination — pages default to `[]`. */
export function useReportList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.reports(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<AuditReportList> | AuditReportList[]>("/reports/", params);
      return unwrap(r);
    },
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
    mutationFn: ({ id, changedFields }: { id: string; changedFields: Partial<AuditReport> }) =>
      patch<AuditReport>(`/reports/${id}/`, changedFields),
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
// ALIAS EXPORTS — Dataverse/PowerApps hook name compatibility
// These allow page components that use original Dataverse-generated hook names
// to work with the Django-backed hooks above without any code changes.
// ─────────────────────────────────────────────────────────────────────────────

// ── Engagements ───────────────────────────────────────────────────────────────
export const useAuditEngagementList     = useEngagementList;
export const useAuditEngagement         = useEngagement;
export const useCreateAuditEngagement   = useCreateEngagement;
export const useUpdateAuditEngagement   = useUpdateEngagement;
export const useDeleteAuditEngagement   = useDeleteEngagement;

// ── Approval Requests ─────────────────────────────────────────────────────────
export const useApprovalRequestList     = useApprovalList;
export const useApprovalRequest         = useApproval;
export const useCreateApprovalRequest   = useCreateApproval;
export const useUpdateApprovalRequest   = useUpdateApproval;
export const useDeleteApprovalRequest   = useDeleteApproval;

// ── Remediation Actions ───────────────────────────────────────────────────────
export const useRemediationActionList    = useRemediationList;
export const useCreateRemediationAction  = useCreateRemediation;
export const useUpdateRemediationAction  = useUpdateRemediation;
export const useDeleteRemediationAction  = useDeleteRemediation;

// ── Reports ───────────────────────────────────────────────────────────────────
export const useAuditReportList          = useReportList;
export const useAuditReport              = useReport;
export const useCreateAuditReport        = useCreateReport;
export const useUpdateAuditReport        = useUpdateReport;
export const useDeleteAuditReport        = useDeleteReport;

// ── Report Templates ──────────────────────────────────────────────────────────
export const useAuditReportTemplateList   = useReportTemplateList;
export const useAuditReportTemplate       = useReportTemplate;
export const useCreateAuditReportTemplate = useCreateReportTemplate;
export const useUpdateAuditReportTemplate = useUpdateReportTemplate;
export const useDeleteAuditReportTemplate = useDeleteReportTemplate;

// ── Engagement Relations ──────────────────────────────────────────────────────
export const useCreateEngagementAuditor = useAddEngagementAuditor;
export const useDeleteEngagementAuditor = useRemoveEngagementAuditor;
export const useCreateEngagementRisk    = useAddEngagementRisk;
export const useDeleteEngagementRisk    = useRemoveEngagementRisk;
export const useCreateEngagementControl = useAddEngagementControl;
export const useDeleteEngagementControl = useRemoveEngagementControl;

// ─────────────────────────────────────────────────────────────────────────────
// TESTING ENGINE (Epic 4)
// ─────────────────────────────────────────────────────────────────────────────

export function useTestPlanList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.testPlans(params),
    queryFn: async () => {
      const r = await get<PaginatedResponse<TestPlan> | TestPlan[]>("/test-plans/", params);
      return unwrap(r);
    },
  });
}

export function useTestPlan(id: string) {
  return useQuery({
    queryKey: QK.testPlan(id),
    queryFn: () => get<TestPlan>(`/test-plans/${id}/`),
    enabled: !!id,
  });
}

export function useControlTestPlanList(controlId: string) {
  return useQuery({
    queryKey: QK.controlTestPlans(controlId),
    queryFn: async () => {
      const r = await get<PaginatedResponse<TestPlan> | TestPlan[]>(`/controls/${controlId}/test-plans/`);
      return unwrap(r);
    },
    enabled: !!controlId,
  });
}

export function useCreateTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TestPlan>) => post<TestPlan>("/test-plans/", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["test-plans"] }); },
  });
}

export function useUpdateTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestPlan> }) =>
      patch<TestPlan>(`/test-plans/${id}/`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["test-plans"] });
      qc.invalidateQueries({ queryKey: QK.testPlan(id) });
    },
  });
}

export function useDeleteTestPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/test-plans/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["test-plans"] }); },
  });
}

export function useTestInstanceList(planId: string) {
  return useQuery({
    queryKey: QK.testInstances(planId),
    queryFn: async () => {
      const r = await get<PaginatedResponse<TestInstance> | TestInstance[]>(`/test-plans/${planId}/instances/`);
      return unwrap(r);
    },
    enabled: !!planId,
  });
}

export function useTestInstance(id: string) {
  return useQuery({
    queryKey: QK.testInstance(id),
    queryFn: () => get<TestInstance>(`/test-instances/${id}/`),
    enabled: !!id,
  });
}

export function useCreateTestInstance(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TestInstance>) =>
      post<TestInstance>(`/test-plans/${planId}/instances/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.testInstances(planId) });
      qc.invalidateQueries({ queryKey: QK.testPlan(planId) });
    },
  });
}

export function useUpdateTestInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestInstance> }) =>
      patch<TestInstance>(`/test-instances/${id}/`, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QK.testInstance(result.id) });
      qc.invalidateQueries({ queryKey: QK.testInstances(result.test_plan as string) });
    },
  });
}

export function useDeleteTestInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) =>
      del(`/test-instances/${id}/`),
    onSuccess: (_, { planId }) => {
      qc.invalidateQueries({ queryKey: QK.testInstances(planId) });
    },
  });
}

export function useConcludeTestInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<TestInstance>(`/test-instances/${id}/conclude/`, {}),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QK.testInstance(result.id) });
      qc.invalidateQueries({ queryKey: QK.testInstances(result.test_plan as string) });
      qc.invalidateQueries({ queryKey: QK.testInstanceStats(result.id) });
    },
  });
}

export function useTestInstanceStatistics(instanceId: string) {
  return useQuery({
    queryKey: QK.testInstanceStats(instanceId),
    queryFn: () => get<TestInstanceStatistics>(`/test-instances/${instanceId}/statistics/`),
    enabled: !!instanceId,
  });
}

export function useSampleItemList(instanceId: string) {
  return useQuery({
    queryKey: QK.sampleItems(instanceId),
    queryFn: async () => {
      const r = await get<PaginatedResponse<SampleItem> | SampleItem[]>(
        `/test-instances/${instanceId}/samples/`
      );
      return unwrap(r);
    },
    enabled: !!instanceId,
  });
}

export function useCreateSampleItem(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SampleItem>) =>
      post<SampleItem>(`/test-instances/${instanceId}/samples/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sampleItems(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstance(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstanceStats(instanceId) });
    },
  });
}

export function useUpdateSampleItem(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SampleItem> }) =>
      patch<SampleItem>(`/sample-items/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sampleItems(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstanceStats(instanceId) });
    },
  });
}

export function useDeleteSampleItem(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/sample-items/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sampleItems(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstance(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstanceStats(instanceId) });
    },
  });
}

export function useTestExceptionList(instanceId: string) {
  return useQuery({
    queryKey: QK.testExceptions(instanceId),
    queryFn: async () => {
      const r = await get<PaginatedResponse<TestException> | TestException[]>(
        `/test-instances/${instanceId}/exceptions/`
      );
      return unwrap(r);
    },
    enabled: !!instanceId,
  });
}

export function useCreateTestException(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TestException>) =>
      post<TestException>(`/test-instances/${instanceId}/exceptions/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.testExceptions(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstance(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstanceStats(instanceId) });
    },
  });
}

export function useUpdateTestException(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestException> }) =>
      patch<TestException>(`/test-exceptions/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.testExceptions(instanceId) });
    },
  });
}

export function useDeleteTestException(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/test-exceptions/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.testExceptions(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstance(instanceId) });
      qc.invalidateQueries({ queryKey: QK.testInstanceStats(instanceId) });
    },
  });
}

export function useEscalateTestException(instanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<TestException>(`/test-exceptions/${id}/escalate/`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.testExceptions(instanceId) });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT PLAN — 6-Year Integrated Plan
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditPlanEntityList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditPlanEntities(params),
    queryFn: () => get<PaginatedResponse<AuditableEntity>>("/audit-plan/entities/", params),
  });
}

export function useAuditPlanEntity(id: number) {
  return useQuery({
    queryKey: QK.auditPlanEntity(id),
    queryFn: () => get<AuditableEntityDetail>(`/audit-plan/entities/${id}/`),
    enabled: !!id,
  });
}

export function useAuditPlanEntityPlanYears(id: number) {
  return useQuery({
    queryKey: QK.auditPlanEntityPlanYears(id),
    queryFn: () => get<PaginatedResponse<AuditPlanYear>>(`/audit-plan/entities/${id}/plan-years/`),
    enabled: !!id,
  });
}

export function useAuditPlanEntityControls(id: number) {
  return useQuery({
    queryKey: QK.auditPlanEntityControls(id),
    queryFn: () => get<PaginatedResponse<KeyControlAssignment>>(`/audit-plan/entities/${id}/controls/`),
    enabled: !!id,
  });
}

export function useAuditPlanYearList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditPlanYears(params),
    queryFn: () => get<PaginatedResponse<AuditPlanYear>>("/audit-plan/plan-years/", params),
  });
}

export function useAuditPlanRiskScoring() {
  return useQuery({
    queryKey: QK.auditPlanRiskScoring(),
    queryFn: () => get<PaginatedResponse<RiskScoringConfig>>("/audit-plan/risk-scoring/"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditPlanEffectivenessScale() {
  return useQuery({
    queryKey: QK.auditPlanEffectivenessScale(),
    queryFn: () => get<PaginatedResponse<ControlEffectivenessScale>>("/audit-plan/control-effectiveness-scale/"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditPlanControlList(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditPlanControls(params),
    queryFn: () => get<PaginatedResponse<KeyControlAssignment>>("/audit-plan/controls/", params),
  });
}

export function useAuditPlanRelianceCycles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditPlanRelianceCycles(params),
    queryFn: () => get<PaginatedResponse<ControlRelianceCycle>>("/audit-plan/reliance-cycles/", params),
  });
}

export function useAuditPlanGrcThemes(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditPlanGrcThemes(params),
    queryFn: () => get<PaginatedResponse<GRCTestingTheme>>("/audit-plan/grc-themes/", params),
  });
}

export function useAuditPlanMarEngagements(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.auditPlanMarEngagements(params),
    queryFn: () => get<PaginatedResponse<MARTestingEngagement>>("/audit-plan/mar-engagements/", params),
  });
}

export function useAuditPlanSummary() {
  return useQuery({
    queryKey: QK.auditPlanSummary(),
    queryFn: () => get<PaginatedResponse<AuditPlanSummaryModel>>("/audit-plan/summary/"),
  });
}

export function useAuditPlanBulkImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => post<BulkImportResult>("/audit-plan/import/", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan-entities"] });
      qc.invalidateQueries({ queryKey: ["audit-plan-years"] });
      qc.invalidateQueries({ queryKey: ["audit-plan-controls"] });
      qc.invalidateQueries({ queryKey: ["audit-plan-grc-themes"] });
      qc.invalidateQueries({ queryKey: ["audit-plan-mar-engagements"] });
      qc.invalidateQueries({ queryKey: ["audit-plan-summary"] });
    },
  });
}

export function useUpdateAuditPlanYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AuditPlanYear> }) =>
      patch<AuditPlanYear>(`/audit-plan/plan-years/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit-plan-years"] });
      qc.invalidateQueries({ queryKey: ["audit-plan-entities"] });
    },
  });
}
