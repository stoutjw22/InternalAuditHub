import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Search, X } from "lucide-react";
import {
  useFindingList,
  useCreateFinding,
  useUpdateFinding,
  useDeleteFinding,
  useUsersByRole,
  useEngagementList,
} from "@/generated/hooks";
import {
  FINDING_TYPE_LABELS,
  FINDING_SEVERITY_LABELS,
  FINDING_SEVERITY_COLORS,
  FINDING_STATUS_LABELS,
  type Finding,
  type FindingListItem,
  type FindingType,
  type FindingSeverity,
  type FindingStatus,
} from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FindingFormState {
  title: string;
  description: string;
  engagement: string;
  finding_type: FindingType | "";
  severity: FindingSeverity | "";
  status: FindingStatus | "";
  owner: string;
  due_date: string;
  root_cause: string;
  management_response: string;
}

const EMPTY_FORM: FindingFormState = {
  title: "",
  description: "",
  engagement: "",
  finding_type: "",
  severity: "",
  status: "",
  owner: "",
  due_date: "",
  root_cause: "",
  management_response: "",
};

// ── Badges ────────────────────────────────────────────────────────────────────

function SeverityBadge({ severity, label }: { severity: FindingSeverity; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        FINDING_SEVERITY_COLORS[severity] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {label}
    </span>
  );
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
      {label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── Modal ──────────────────────────────────────────────────────────────────────

function FindingModal({
  editing,
  onClose,
}: {
  editing: FindingListItem | null;
  onClose: () => void;
}) {
  // When editing we only have FindingListItem fields in the list view.
  // We initialise the form with what we have; the API will accept partial patches.
  const [form, setForm] = useState<FindingFormState>(
    editing
      ? {
          title: editing.title,
          description: "",
          engagement: "",
          finding_type: editing.finding_type,
          severity: editing.severity,
          status: editing.status,
          owner: editing.owner ?? "",
          due_date: editing.due_date ?? "",
          root_cause: "",
          management_response: "",
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);

  const createFinding = useCreateFinding();
  const updateFinding = useUpdateFinding();
  const { data: owners } = useUsersByRole("finding-owners");
  const { data: engagementsPage } = useEngagementList();
  const engagements = engagementsPage?.results ?? [];

  const isPending = createFinding.isPending || updateFinding.isPending;

  function set(field: keyof FindingFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!editing && !form.engagement) { setError("Engagement is required."); return; }
    if (!form.severity) { setError("Severity is required."); return; }
    if (!form.status) { setError("Status is required."); return; }

    const payload: Partial<Finding> = {
      title: form.title.trim(),
      description: form.description,
      finding_type: form.finding_type as FindingType || undefined,
      severity: form.severity as FindingSeverity,
      status: form.status as FindingStatus,
      owner: form.owner || null,
      due_date: form.due_date || null,
      root_cause: form.root_cause,
      management_response: form.management_response,
      ...(form.engagement ? { engagement: form.engagement } : {}),
    };

    try {
      if (editing) {
        await updateFinding.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createFinding.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Failed to save finding. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? "Edit Finding" : "Add Finding"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form id="finding-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="Finding title"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-none")}
              placeholder="Describe the finding..."
            />
          </Field>

          {/* Engagement (required on create) */}
          <Field label="Engagement" required={!editing}>
            <select
              value={form.engagement}
              onChange={(e) => set("engagement", e.target.value)}
              className={inputCls}
              disabled={!!editing}
            >
              <option value="">Select engagement</option>
              {engagements.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>
            {editing && (
              <p className="text-xs text-gray-400 mt-0.5">Engagement cannot be changed after creation.</p>
            )}
          </Field>

          {/* Type + Severity */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Finding Type">
              <select
                value={form.finding_type}
                onChange={(e) => set("finding_type", e.target.value)}
                className={inputCls}
              >
                <option value="">Select type</option>
                {Object.entries(FINDING_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Severity" required>
              <select
                value={form.severity}
                onChange={(e) => set("severity", e.target.value)}
                className={inputCls}
              >
                <option value="">Select severity</option>
                {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Status + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputCls}
              >
                <option value="">Select status</option>
                {Object.entries(FINDING_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set("due_date", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Owner */}
          <Field label="Owner">
            <select
              value={form.owner}
              onChange={(e) => set("owner", e.target.value)}
              className={inputCls}
            >
              <option value="">Unassigned</option>
              {owners?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.department}
                </option>
              ))}
            </select>
          </Field>

          {/* Root Cause */}
          <Field label="Root Cause">
            <textarea
              value={form.root_cause}
              onChange={(e) => set("root_cause", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-none")}
              placeholder="Describe the root cause..."
            />
          </Field>

          {/* Management Response */}
          <Field label="Management Response">
            <textarea
              value={form.management_response}
              onChange={(e) => set("management_response", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-none")}
              placeholder="Management's response to the finding..."
            />
          </Field>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="finding-form"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? "Saving…" : editing ? "Save Changes" : "Create Finding"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({
  finding,
  onClose,
}: {
  finding: FindingListItem;
  onClose: () => void;
}) {
  const deleteFinding = useDeleteFinding();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteFinding.mutateAsync(finding.id);
      onClose();
    } catch {
      setError("Failed to delete. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900">Delete Finding</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">"{finding.title}"</span>? This action cannot be undone.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteFinding.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
          >
            {deleteFinding.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function FindingsPage() {
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<FindingSeverity | "">("");
  const [filterStatus, setFilterStatus] = useState<FindingStatus | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<FindingListItem | null>(null);
  const [deletingFinding, setDeletingFinding] = useState<FindingListItem | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search) p.search = search;
    if (filterSeverity) p.severity = filterSeverity;
    if (filterStatus) p.status = filterStatus;
    return p;
  }, [search, filterSeverity, filterStatus]);

  const { data, isLoading, error } = useFindingList(queryParams);
  const findings = data?.results ?? [];

  function openCreate() {
    setEditingFinding(null);
    setModalOpen(true);
  }

  function openEdit(finding: FindingListItem) {
    setEditingFinding(finding);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingFinding(null);
  }

  const hasFilters = !!(search || filterSeverity || filterStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Findings</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {data?.count ?? 0} finding{(data?.count ?? 0) !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Finding
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search findings…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as FindingSeverity | "")}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            {Object.entries(FINDING_SEVERITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FindingStatus | "")}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(FINDING_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setFilterSeverity("");
                setFilterStatus("");
              }}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Title", "Severity", "Status", "Owner", "Due Date", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <TableSkeleton rows={6} />
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-red-500">
                      Failed to load findings. Please refresh.
                    </td>
                  </tr>
                ) : findings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <AlertTriangle className="mx-auto text-gray-300 mb-3" size={40} />
                      <p className="text-sm font-medium text-gray-500">No findings found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {hasFilters
                          ? "Try adjusting your filters."
                          : "No findings have been recorded yet."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  findings.map((finding) => (
                    <tr key={finding.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[260px]">
                        <span className="line-clamp-2">{finding.title}</span>
                        <span className="block text-xs text-gray-400 font-normal mt-0.5">
                          {FINDING_TYPE_LABELS[finding.finding_type] ?? finding.finding_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SeverityBadge
                          severity={finding.severity}
                          label={finding.severity_display}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge label={finding.status_display} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {finding.owner_name || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {finding.due_date ? (
                          <span
                            className={cn(
                              formatDate(finding.due_date),
                              new Date(finding.due_date) < new Date() &&
                                finding.status !== "resolved" &&
                                finding.status !== "closed"
                                ? "text-red-600 font-medium"
                                : ""
                            )}
                          >
                            {formatDate(finding.due_date)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(finding)}
                            title="Edit"
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingFinding(finding)}
                            title="Delete"
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination hint */}
          {data && (data.next || data.previous) && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              Showing {findings.length} of {data.count} findings
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <FindingModal editing={editingFinding} onClose={closeModal} />
      )}
      {deletingFinding && (
        <DeleteConfirm finding={deletingFinding} onClose={() => setDeletingFinding(null)} />
      )}
    </div>
  );
}
