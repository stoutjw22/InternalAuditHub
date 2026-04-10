import { useState } from "react";
import { Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import { Plus, X, ClipboardCheck, ChevronLeft, Pencil } from "lucide-react";
import {
  useEngagementList,
  useEngagement,
  useCreateEngagement,
  useUpdateEngagement,
  useDeleteEngagement,
  useEngagementAuditorList,
  useAddEngagementAuditor,
  useRemoveEngagementAuditor,
  useEngagementTaskList,
  useCreateTask,
  useEngagementRiskList,
  useEngagementControlList,
  useEngagementFindingList,
  useEngagementReportList,
  useUsersByRole,
  useBusinessProcessList,
  useBusinessObjectiveList,
} from "@/generated/hooks";
import {
  ENGAGEMENT_STATUS_LABELS,
  ENGAGEMENT_STATUS_COLORS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  FINDING_SEVERITY_COLORS,
  FINDING_SEVERITY_LABELS,
  REPORT_STATUS_LABELS,
  type EngagementStatus,
  type TaskPriority,
  type TaskStatus,
} from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EngFormState {
  name: string;
  description: string;
  status: EngagementStatus | "";
  audit_manager: string;
  business_process: string;
  business_objective: string;
  period: string;
  scope: string;
  objectives: string;
  start_date: string;
  end_date: string;
}

const EMPTY_ENG: EngFormState = {
  name: "", description: "", status: "", audit_manager: "",
  business_process: "", business_objective: "", period: "",
  scope: "", objectives: "", start_date: "", end_date: "",
};

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EngagementStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", ENGAGEMENT_STATUS_COLORS[status])}>
      {ENGAGEMENT_STATUS_LABELS[status]}
    </span>
  );
}

// ── Engagement List ────────────────────────────────────────────────────────────

function EngagementList() {
  const [filterStatus, setFilterStatus] = useState<EngagementStatus | "">("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EngFormState>(EMPTY_ENG);

  const { data, isLoading } = useEngagementList({ status: filterStatus || undefined });
  const { data: managers } = useUsersByRole("managers");
  const { data: processes } = useBusinessProcessList();
  const { data: objectives } = useBusinessObjectiveList();
  const createMutation = useCreateEngagement();

  const engagements = data?.results ?? [];
  const STATUS_TABS: Array<EngagementStatus | ""> = ["", "planning", "in_progress", "review", "completed", "cancelled"];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...form,
      status: (form.status || "planning") as EngagementStatus,
      audit_manager: form.audit_manager || undefined,
      business_process: form.business_process || undefined,
      business_objective: form.business_objective || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    } as any);
    setDialogOpen(false);
    setForm(EMPTY_ENG);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Engagements</h1>
          {data && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{data.count}</span>
          )}
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Engagement
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto border-b">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              filterStatus === s
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {s === "" ? "All" : ENGAGEMENT_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : engagements.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardCheck className="mx-auto mb-2 h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No engagements found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {engagements.map((eng) => (
            <Link
              key={eng.id}
              to={`/engagements/${eng.id}`}
              className="group rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-2">{eng.name}</h3>
                <StatusBadge status={eng.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{eng.audit_manager_name}</p>
              {(eng.start_date || eng.end_date) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(eng.start_date)} – {formatDate(eng.end_date)}
                </p>
              )}
              {eng.period && (
                <p className="mt-1 text-xs text-muted-foreground">{eng.period}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {dialogOpen && (
        <EngagementFormDialog
          title="New Engagement"
          form={form}
          setForm={setForm}
          managers={managers ?? []}
          processes={processes ?? []}
          objectives={objectives ?? []}
          onSubmit={handleCreate}
          onClose={() => setDialogOpen(false)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Engagement Form Dialog ─────────────────────────────────────────────────────

function EngagementFormDialog({
  title, form, setForm, managers, processes, objectives, onSubmit, onClose, isPending,
}: {
  title: string;
  form: EngFormState;
  setForm: React.Dispatch<React.SetStateAction<EngFormState>>;
  managers: any[];
  processes: any[];
  objectives: any[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EngagementStatus }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Object.entries(ENGAGEMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Audit Manager</label>
              <select
                value={form.audit_manager}
                onChange={(e) => setForm((p) => ({ ...p, audit_manager: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Select —</option>
                {managers.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business Process</label>
              <select
                value={form.business_process}
                onChange={(e) => setForm((p) => ({ ...p, business_process: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— None —</option>
                {processes.map((bp) => <option key={bp.id} value={bp.id}>{bp.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business Objective</label>
              <select
                value={form.business_objective}
                onChange={(e) => setForm((p) => ({ ...p, business_objective: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— None —</option>
                {objectives.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Period</label>
              <input
                value={form.period}
                onChange={(e) => setForm((p) => ({ ...p, period: e.target.value }))}
                placeholder="e.g. Q1 2026"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Scope</label>
              <textarea
                rows={2}
                value={form.scope}
                onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Objectives</label>
              <textarea
                rows={2}
                value={form.objectives}
                onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Engagement Detail ──────────────────────────────────────────────────────────

function EngagementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "risks" | "controls" | "findings" | "reports">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EngFormState>(EMPTY_ENG);

  const { data: eng, isLoading } = useEngagement(id!);
  const { data: managers } = useUsersByRole("managers");
  const { data: processes } = useBusinessProcessList();
  const { data: objectives } = useBusinessObjectiveList();
  const updateMutation = useUpdateEngagement();
  const deleteMutation = useDeleteEngagement();

  // Tab data
  const { data: auditors } = useEngagementAuditorList(id!);
  const { data: tasks } = useEngagementTaskList(id!);
  const { data: risks } = useEngagementRiskList(id!);
  const { data: controls } = useEngagementControlList(id!);
  const { data: findings } = useEngagementFindingList(id!);
  const { data: reports } = useEngagementReportList(id!);

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!eng) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Engagement not found.</div>;
  }

  function openEdit() {
    setForm({
      name: eng!.name,
      description: eng!.description,
      status: eng!.status,
      audit_manager: eng!.audit_manager ?? "",
      business_process: eng!.business_process ?? "",
      business_objective: eng!.business_objective ?? "",
      period: eng!.period ?? "",
      scope: eng!.scope ?? "",
      objectives: eng!.objectives ?? "",
      start_date: eng!.start_date ?? "",
      end_date: eng!.end_date ?? "",
    });
    setEditOpen(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    await updateMutation.mutateAsync({ id: eng!.id, ...form } as any);
    setEditOpen(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this engagement? This cannot be undone.")) return;
    await deleteMutation.mutateAsync(eng!.id);
    navigate("/engagements");
  }

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "tasks", label: `Tasks${tasks ? ` (${tasks.length})` : ""}` },
    { key: "risks", label: `Risks${risks ? ` (${risks.length})` : ""}` },
    { key: "controls", label: `Controls${controls ? ` (${controls.length})` : ""}` },
    { key: "findings", label: `Findings${findings ? ` (${findings.length})` : ""}` },
    { key: "reports", label: `Reports${reports ? ` (${reports.length})` : ""}` },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/engagements" className="rounded p-1.5 hover:bg-muted mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold truncate">{eng.name}</h1>
            <StatusBadge status={eng.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manager: {eng.audit_manager_detail?.full_name ?? "—"}
            {eng.period && ` · ${eng.period}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={cn(
              "whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DetailField label="Status" value={<StatusBadge status={eng.status} />} />
            <DetailField label="Audit Manager" value={eng.audit_manager_detail?.full_name ?? "—"} />
            <DetailField label="Period" value={eng.period || "—"} />
            <DetailField label="Start Date" value={formatDate(eng.start_date)} />
            <DetailField label="End Date" value={formatDate(eng.end_date)} />
            {eng.scope && <DetailField label="Scope" value={eng.scope} className="col-span-2" />}
            {eng.objectives && <DetailField label="Objectives" value={eng.objectives} className="col-span-2" />}
            {eng.description && <DetailField label="Description" value={eng.description} className="col-span-2" />}

            {/* Auditors */}
            <div className="col-span-2 rounded-xl border p-5">
              <h3 className="font-medium mb-3">Assigned Auditors</h3>
              {!auditors?.results?.length ? (
                <p className="text-sm text-muted-foreground">No auditors assigned.</p>
              ) : (
                <div className="space-y-2">
                  {auditors.results.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between">
                      <span className="text-sm">{a.auditor_detail?.full_name ?? a.auditor}</span>
                      {a.role_note && <span className="text-xs text-muted-foreground">{a.role_note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-3">
            {!tasks?.length ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              <div className="divide-y rounded-xl border bg-white overflow-hidden">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(t.due_date)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {TASK_PRIORITY_LABELS[t.priority]}
                      </span>
                      <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
                        {TASK_STATUS_LABELS[t.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "risks" && (
          <div className="divide-y rounded-xl border bg-white overflow-hidden">
            {!risks?.length ? (
              <p className="p-5 text-sm text-muted-foreground">No risks linked.</p>
            ) : risks.map((er) => (
              <div key={er.id} className="px-5 py-3">
                <p className="text-sm font-medium">{er.risk_detail?.name ?? er.risk}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rating: {er.risk_detail?.risk_rating ?? "—"} · Scope: {er.is_in_scope ? "In Scope" : "Out of Scope"}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "controls" && (
          <div className="divide-y rounded-xl border bg-white overflow-hidden">
            {!controls?.length ? (
              <p className="p-5 text-sm text-muted-foreground">No controls linked.</p>
            ) : controls.map((ec) => (
              <div key={ec.id} className="px-5 py-3">
                <p className="text-sm font-medium">{ec.control_detail?.name ?? ec.control}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Result: {ec.test_result_display} · Effectiveness: {ec.effectiveness_rating_display}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "findings" && (
          <div className="divide-y rounded-xl border bg-white overflow-hidden">
            {!findings?.length ? (
              <p className="p-5 text-sm text-muted-foreground">No findings.</p>
            ) : findings.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-medium">{f.title}</p>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", FINDING_SEVERITY_COLORS[f.severity])}>
                    {FINDING_SEVERITY_LABELS[f.severity]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="divide-y rounded-xl border bg-white overflow-hidden">
            {!reports?.length ? (
              <p className="p-5 text-sm text-muted-foreground">No reports.</p>
            ) : reports.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-3">
                <p className="text-sm font-medium">{r.title}</p>
                <span className="rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs">
                  {REPORT_STATUS_LABELS[r.status as keyof typeof REPORT_STATUS_LABELS]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit dialog */}
      {editOpen && (
        <EngagementFormDialog
          title="Edit Engagement"
          form={form}
          setForm={setForm}
          managers={managers ?? []}
          processes={processes ?? []}
          objectives={objectives ?? []}
          onSubmit={handleUpdate}
          onClose={() => setEditOpen(false)}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function DetailField({
  label, value, className,
}: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

// ── Router wrapper ─────────────────────────────────────────────────────────────

export default function EngagementsPage() {
  return (
    <Routes>
      <Route index element={<EngagementList />} />
      <Route path=":id" element={<EngagementDetail />} />
    </Routes>
  );
}
