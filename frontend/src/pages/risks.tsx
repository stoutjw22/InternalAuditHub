import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ShieldAlert, Search, X } from "lucide-react";
import {
  useRiskList,
  useCreateRisk,
  useUpdateRisk,
  useDeleteRisk,
  useUsersByRole,
  useBusinessProcessList,
} from "@/generated/hooks";
import {
  RISK_CATEGORY_LABELS,
  RISK_STATUS_LABELS,
  type Risk,
  type RiskCategory,
  type RiskStatus,
} from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiskFormState {
  name: string;
  description: string;
  category: RiskCategory | "";
  status: RiskStatus | "";
  inherent_likelihood: string;
  inherent_impact: string;
  residual_likelihood: string;
  residual_impact: string;
  owner: string;
  business_process: string;
  treatment_plan: string;
}

const EMPTY_FORM: RiskFormState = {
  name: "",
  description: "",
  category: "",
  status: "",
  inherent_likelihood: "1",
  inherent_impact: "1",
  residual_likelihood: "",
  residual_impact: "",
  owner: "",
  business_process: "",
  treatment_plan: "",
};

// ── Risk rating helpers ────────────────────────────────────────────────────────

const RATING_BADGE: Record<string, string> = {
  Low: "bg-blue-100 text-blue-800",
  Medium: "bg-yellow-100 text-yellow-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-100 text-red-800",
};

function RatingBadge({ rating }: { rating: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        RATING_BADGE[rating] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {rating}
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

// ── Score select ───────────────────────────────────────────────────────────────

function ScoreSelect({
  label,
  name,
  value,
  required,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        name={name}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {!required && <option value="">—</option>}
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={String(n)}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function RiskModal({
  editing,
  onClose,
}: {
  editing: Risk | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RiskFormState>(
    editing
      ? {
          name: editing.name,
          description: editing.description,
          category: editing.category,
          status: editing.status,
          inherent_likelihood: String(editing.inherent_likelihood),
          inherent_impact: String(editing.inherent_impact),
          residual_likelihood: editing.residual_likelihood != null ? String(editing.residual_likelihood) : "",
          residual_impact: editing.residual_impact != null ? String(editing.residual_impact) : "",
          owner: editing.owner ?? "",
          business_process: editing.business_process ?? "",
          treatment_plan: editing.treatment_plan,
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);

  const createRisk = useCreateRisk();
  const updateRisk = useUpdateRisk();
  const { data: owners } = useUsersByRole("risk-owners");
  const { data: processes } = useBusinessProcessList();

  const isPending = createRisk.isPending || updateRisk.isPending;

  function set(field: keyof RiskFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.category) { setError("Category is required."); return; }
    if (!form.status) { setError("Status is required."); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      category: form.category as RiskCategory,
      status: form.status as RiskStatus,
      inherent_likelihood: Number(form.inherent_likelihood),
      inherent_impact: Number(form.inherent_impact),
      residual_likelihood: form.residual_likelihood ? Number(form.residual_likelihood) : null,
      residual_impact: form.residual_impact ? Number(form.residual_impact) : null,
      owner: form.owner || null,
      business_process: form.business_process || null,
      treatment_plan: form.treatment_plan,
    };

    try {
      if (editing) {
        await updateRisk.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createRisk.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Failed to save risk. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? "Edit Risk" : "Add Risk"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Risk name"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional description"
            />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select status</option>
                {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Inherent scores */}
          <fieldset className="border border-gray-200 rounded-lg p-3">
            <legend className="text-xs font-semibold text-gray-500 px-1 uppercase tracking-wide">
              Inherent Risk
            </legend>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <ScoreSelect
                label="Likelihood"
                name="inherent_likelihood"
                value={form.inherent_likelihood}
                required
                onChange={(v) => set("inherent_likelihood", v)}
              />
              <ScoreSelect
                label="Impact"
                name="inherent_impact"
                value={form.inherent_impact}
                required
                onChange={(v) => set("inherent_impact", v)}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Inherent score: {Number(form.inherent_likelihood) * Number(form.inherent_impact)}
            </p>
          </fieldset>

          {/* Residual scores */}
          <fieldset className="border border-gray-200 rounded-lg p-3">
            <legend className="text-xs font-semibold text-gray-500 px-1 uppercase tracking-wide">
              Residual Risk (optional)
            </legend>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <ScoreSelect
                label="Likelihood"
                name="residual_likelihood"
                value={form.residual_likelihood}
                onChange={(v) => set("residual_likelihood", v)}
              />
              <ScoreSelect
                label="Impact"
                name="residual_impact"
                value={form.residual_impact}
                onChange={(v) => set("residual_impact", v)}
              />
            </div>
            {form.residual_likelihood && form.residual_impact && (
              <p className="mt-2 text-xs text-gray-500">
                Residual score: {Number(form.residual_likelihood) * Number(form.residual_impact)}
              </p>
            )}
          </fieldset>

          {/* Owner */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Owner</label>
            <select
              value={form.owner}
              onChange={(e) => set("owner", e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {owners?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.department}
                </option>
              ))}
            </select>
          </div>

          {/* Business Process */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Business Process</label>
            <select
              value={form.business_process}
              onChange={(e) => set("business_process", e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {processes?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Treatment Plan */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Treatment Plan</label>
            <textarea
              value={form.treatment_plan}
              onChange={(e) => set("treatment_plan", e.target.value)}
              rows={3}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe the risk treatment plan..."
            />
          </div>
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
            form=""
            disabled={isPending}
            onClick={(e) => {
              // Trigger the form inside the scrollable area
              const form = (e.currentTarget.closest(".fixed") as HTMLElement)
                ?.querySelector("form");
              form?.requestSubmit();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? "Saving…" : editing ? "Save Changes" : "Create Risk"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({
  risk,
  onClose,
}: {
  risk: Risk;
  onClose: () => void;
}) {
  const deleteRisk = useDeleteRisk();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteRisk.mutateAsync(risk.id);
      onClose();
    } catch {
      setError("Failed to delete. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900">Delete Risk</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">"{risk.name}"</span>? This action cannot be undone.
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteRisk.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
          >
            {deleteRisk.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RisksPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<RiskCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<RiskStatus | "">("");
  const [filterRating, setFilterRating] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search) p.search = search;
    if (filterCategory) p.category = filterCategory;
    if (filterStatus) p.status = filterStatus;
    if (filterRating) p.risk_rating = filterRating;
    return p;
  }, [search, filterCategory, filterStatus, filterRating]);

  const { data, isLoading, error } = useRiskList(queryParams);
  const risks = data?.results ?? [];

  function openCreate() {
    setEditingRisk(null);
    setModalOpen(true);
  }

  function openEdit(risk: Risk) {
    setEditingRisk(risk);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingRisk(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-blue-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Risk Register</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {data?.count ?? 0} risk{(data?.count ?? 0) !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Risk
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
              placeholder="Search risks…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as RiskCategory | "")}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {Object.entries(RISK_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as RiskStatus | "")}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(RISK_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Ratings</option>
            {["Low", "Medium", "High", "Critical"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {(search || filterCategory || filterStatus || filterRating) && (
            <button
              onClick={() => {
                setSearch("");
                setFilterCategory("");
                setFilterStatus("");
                setFilterRating("");
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
                  {["Name", "Category", "Status", "Inherent Score", "Risk Rating", "Owner", "Actions"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <TableSkeleton rows={6} />
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-red-500">
                      Failed to load risks. Please refresh.
                    </td>
                  </tr>
                ) : risks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <ShieldAlert className="mx-auto text-gray-300 mb-3" size={40} />
                      <p className="text-sm font-medium text-gray-500">No risks found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {search || filterCategory || filterStatus || filterRating
                          ? "Try adjusting your filters."
                          : "Get started by adding your first risk."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  risks.map((risk) => (
                    <tr key={risk.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[220px]">
                        <span className="line-clamp-2">{risk.name}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {risk.category_display}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge label={risk.status_display} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-center font-mono">
                        <span title={`${risk.inherent_likelihood} × ${risk.inherent_impact}`}>
                          {risk.inherent_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RatingBadge rating={risk.risk_rating} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {risk.owner_detail?.full_name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(risk)}
                            title="Edit"
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingRisk(risk)}
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
              Showing {risks.length} of {data.count} risks
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <RiskModal editing={editingRisk} onClose={closeModal} />
      )}
      {deletingRisk && (
        <DeleteConfirm risk={deletingRisk} onClose={() => setDeletingRisk(null)} />
      )}
    </div>
  );
}
