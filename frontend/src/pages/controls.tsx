import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, ShieldCheck, Search, X } from "lucide-react";
import {
  useControlList,
  useCreateControl,
  useUpdateControl,
  useDeleteControl,
  useUsersByRole,
  useBusinessProcessList,
} from "@/generated/hooks";
import {
  CONTROL_TYPE_LABELS,
  CONTROL_FREQUENCY_LABELS,
  CONTROL_STATUS_LABELS,
  type Control,
  type ControlType,
  type ControlFrequency,
  type ControlStatus,
} from "@/generated/models";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ControlFormState {
  name: string;
  description: string;
  control_type: ControlType | "";
  frequency: ControlFrequency | "";
  status: ControlStatus | "";
  owner: string;
  control_reference: string;
  business_process: string;
}

const EMPTY_FORM: ControlFormState = {
  name: "",
  description: "",
  control_type: "",
  frequency: "",
  status: "",
  owner: "",
  control_reference: "",
  business_process: "",
};

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ControlStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-700",
  design_deficiency: "bg-red-100 text-red-800",
  under_review: "bg-yellow-100 text-yellow-800",
};

function StatusBadge({ status, label }: { status: ControlStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"
      )}
    >
      {label}
    </span>
  );
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
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

function ControlModal({
  editing,
  onClose,
}: {
  editing: Control | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ControlFormState>(
    editing
      ? {
          name: editing.name,
          description: editing.description,
          control_type: editing.control_type,
          frequency: editing.frequency,
          status: editing.status,
          owner: editing.owner ?? "",
          control_reference: editing.control_reference,
          business_process: editing.business_process ?? "",
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState<string | null>(null);

  const createControl = useCreateControl();
  const updateControl = useUpdateControl();
  const { data: owners } = useUsersByRole("control-owners");
  const { data: processes } = useBusinessProcessList();

  const isPending = createControl.isPending || updateControl.isPending;

  function set(field: keyof ControlFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.control_type) { setError("Control type is required."); return; }
    if (!form.status) { setError("Status is required."); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description,
      control_type: form.control_type as ControlType,
      frequency: form.frequency as ControlFrequency || undefined,
      status: form.status as ControlStatus,
      owner: form.owner || null,
      control_reference: form.control_reference,
      business_process: form.business_process || null,
    };

    try {
      if (editing) {
        await updateControl.mutateAsync({ id: editing.id, ...payload });
      } else {
        await createControl.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Failed to save control. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? "Edit Control" : "Add Control"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form id="control-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Name */}
          <Field label="Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="Control name"
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={cn(inputCls, "resize-none")}
              placeholder="Optional description"
            />
          </Field>

          {/* Control Reference */}
          <Field label="Control Reference">
            <input
              type="text"
              value={form.control_reference}
              onChange={(e) => set("control_reference", e.target.value)}
              className={inputCls}
              placeholder="e.g. CTRL-001"
            />
          </Field>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Control Type" required>
              <select
                value={form.control_type}
                onChange={(e) => set("control_type", e.target.value)}
                className={inputCls}
              >
                <option value="">Select type</option>
                {Object.entries(CONTROL_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputCls}
              >
                <option value="">Select status</option>
                {Object.entries(CONTROL_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Frequency */}
          <Field label="Frequency">
            <select
              value={form.frequency}
              onChange={(e) => set("frequency", e.target.value)}
              className={inputCls}
            >
              <option value="">Select frequency</option>
              {Object.entries(CONTROL_FREQUENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

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

          {/* Business Process */}
          <Field label="Business Process">
            <select
              value={form.business_process}
              onChange={(e) => set("business_process", e.target.value)}
              className={inputCls}
            >
              <option value="">None</option>
              {processes?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
            form="control-form"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? "Saving…" : editing ? "Save Changes" : "Create Control"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({
  control,
  onClose,
}: {
  control: Control;
  onClose: () => void;
}) {
  const deleteControl = useDeleteControl();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteControl.mutateAsync(control.id);
      onClose();
    } catch {
      setError("Failed to delete. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900">Delete Control</h2>
        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium">"{control.name}"</span>? This action cannot be undone.
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
            disabled={deleteControl.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
          >
            {deleteControl.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ControlsPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<ControlType | "">("");
  const [filterStatus, setFilterStatus] = useState<ControlStatus | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [deletingControl, setDeletingControl] = useState<Control | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (search) p.search = search;
    if (filterType) p.control_type = filterType;
    if (filterStatus) p.status = filterStatus;
    return p;
  }, [search, filterType, filterStatus]);

  const { data, isLoading, error } = useControlList(queryParams);
  const controls = data?.results ?? [];

  function openCreate() {
    setEditingControl(null);
    setModalOpen(true);
  }

  function openEdit(control: Control) {
    setEditingControl(control);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingControl(null);
  }

  const hasFilters = !!(search || filterType || filterStatus);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Controls</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {data?.count ?? 0} control{(data?.count ?? 0) !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Control
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
              placeholder="Search controls…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ControlType | "")}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {Object.entries(CONTROL_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ControlStatus | "")}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(CONTROL_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setFilterType("");
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
                  {["Name", "Type", "Frequency", "Status", "Owner", "Reference", "Actions"].map((col) => (
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
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-red-500">
                      Failed to load controls. Please refresh.
                    </td>
                  </tr>
                ) : controls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <ShieldCheck className="mx-auto text-gray-300 mb-3" size={40} />
                      <p className="text-sm font-medium text-gray-500">No controls found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {hasFilters
                          ? "Try adjusting your filters."
                          : "Get started by adding your first control."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  controls.map((control) => (
                    <tr key={control.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px]">
                        <span className="line-clamp-2">{control.name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TypeBadge label={control.control_type_display} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {control.frequency_display || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={control.status} label={control.status_display} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {control.owner_detail?.full_name ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                        {control.control_reference || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(control)}
                            title="Edit"
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingControl(control)}
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
              Showing {controls.length} of {data.count} controls
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <ControlModal editing={editingControl} onClose={closeModal} />
      )}
      {deletingControl && (
        <DeleteConfirm control={deletingControl} onClose={() => setDeletingControl(null)} />
      )}
    </div>
  );
}
