import { useState } from "react";
import { CheckSquare, Plus, X, Search, ThumbsUp, ThumbsDown } from "lucide-react";
import {
  useApprovalList,
  useCreateApproval,
  useApprovalDecision,
  useUserList,
} from "@/generated/hooks";
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
  type ApprovalStatus,
  type ApprovalEntityType,
} from "@/generated/models";
import { cn, formatDateTime } from "@/lib/utils";

const ENTITY_LABELS: Record<ApprovalEntityType, string> = {
  finding: "Finding", report: "Audit Report", engagement: "Engagement",
};

interface FormState {
  entity_type: ApprovalEntityType | "";
  entity_id: string;
  entity_name: string;
  approver: string;
  request_notes: string;
}
const EMPTY_FORM: FormState = {
  entity_type: "", entity_id: "", entity_name: "", approver: "", request_notes: "",
};

export default function ApprovalsPage() {
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useApprovalList({
    status: filterStatus || undefined,
    entity_type: filterType || undefined,
  });
  const { data: usersData } = useUserList();
  const createMutation = useCreateApproval();
  const decisionMutation = useApprovalDecision();

  const approvals = data?.results ?? [];
  const filtered = search
    ? approvals.filter((a) =>
        a.entity_name.toLowerCase().includes(search.toLowerCase()) ||
        (a.requested_by_detail?.full_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : approvals;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createMutation.mutateAsync(form as any);
    setDialogOpen(false);
    setForm(EMPTY_FORM);
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    await decisionMutation.mutateAsync({
      id,
      decision,
      review_notes: reviewNotes[id] ?? "",
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Approval Requests</h1>
          {data && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {data.count}
            </span>
          )}
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Statuses</option>
          {Object.entries(APPROVAL_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Types</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <CheckSquare className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No approval requests found.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((a) => (
              <div key={a.id} className="px-6 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground">
                        {ENTITY_LABELS[a.entity_type]}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", APPROVAL_STATUS_COLORS[a.status])}>
                        {APPROVAL_STATUS_LABELS[a.status]}
                      </span>
                    </div>
                    <p className="mt-1 font-medium truncate">{a.entity_name || a.entity_id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Requested by {a.requested_by_detail?.full_name ?? "—"} · {formatDateTime(a.requested_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Approver: {a.approver_detail?.full_name ?? "—"}
                    </p>
                    {a.request_notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">&ldquo;{a.request_notes}&rdquo;</p>
                    )}
                  </div>

                  {a.status === "pending" && (
                    <div className="flex flex-col gap-2 min-w-[160px]">
                      <input
                        placeholder="Review notes (optional)"
                        value={reviewNotes[a.id] ?? ""}
                        onChange={(e) => setReviewNotes((p) => ({ ...p, [a.id]: e.target.value }))}
                        className="rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => decide(a.id, "approved")}
                          disabled={decisionMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                        >
                          <ThumbsUp className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => decide(a.id, "rejected")}
                          disabled={decisionMutation.isPending}
                          className="flex-1 flex items-center justify-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                        >
                          <ThumbsDown className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {a.review_notes && a.status !== "pending" && (
                  <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                    Review notes: {a.review_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold">New Approval Request</h2>
              <button onClick={() => setDialogOpen(false)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Entity Type *</label>
                <select
                  required
                  value={form.entity_type}
                  onChange={(e) => setForm((p) => ({ ...p, entity_type: e.target.value as ApprovalEntityType }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Select —</option>
                  {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Entity ID (UUID) *</label>
                <input
                  required
                  value={form.entity_id}
                  onChange={(e) => setForm((p) => ({ ...p, entity_id: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Entity Name</label>
                <input
                  value={form.entity_name}
                  onChange={(e) => setForm((p) => ({ ...p, entity_name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Approver *</label>
                <select
                  required
                  value={form.approver}
                  onChange={(e) => setForm((p) => ({ ...p, approver: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">— Select —</option>
                  {usersData?.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Request Notes</label>
                <textarea
                  rows={3}
                  value={form.request_notes}
                  onChange={(e) => setForm((p) => ({ ...p, request_notes: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDialogOpen(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
