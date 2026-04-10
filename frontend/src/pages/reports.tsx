import { useState } from "react";
import { Plus, Pencil, CheckSquare, Trash2, X } from "lucide-react";
import {
  useReportList,
  useCreateReport,
  useUpdateReport,
  useFinalizeReport,
  useDeleteReport,
  useEngagementList,
  useReportTemplateList,
} from "@/generated/hooks";
import {
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
  type ReportStatus,
  type AuditReport,
  type AuditReportList,
} from "@/generated/models";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

type StatusFilter = "" | ReportStatus;

interface ReportFormState {
  title: string;
  engagement: string;
  template: string;
  executive_summary: string;
  content: string;
  distribution_list: string;
}

const EMPTY_FORM: ReportFormState = {
  title: "",
  engagement: "",
  template: "",
  executive_summary: "",
  content: "",
  distribution_list: "",
};

function ReportFormDialog({
  initialData,
  editingId,
  onClose,
}: {
  initialData?: Partial<ReportFormState>;
  editingId?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ReportFormState>({
    ...EMPTY_FORM,
    ...initialData,
  });
  const [error, setError] = useState("");

  const { data: engagements } = useEngagementList({});
  const { data: templates } = useReportTemplateList({ is_active: true });
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();

  const isEditing = !!editingId;

  function set(field: keyof ReportFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      const payload: Partial<AuditReport> = {
        title: form.title,
        engagement: form.engagement || undefined,
        template: form.template || null,
        executive_summary: form.executive_summary,
        content: form.content,
        distribution_list: form.distribution_list,
      };
      if (isEditing) {
        await updateReport.mutateAsync({ id: editingId, ...payload });
      } else {
        await createReport.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Failed to save report. Please try again.");
    }
  }

  const isPending = createReport.isPending || updateReport.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Report" : "New Report"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Q1 2026 IT Audit Report"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Engagement</label>
              <select
                value={form.engagement}
                onChange={(e) => set("engagement", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— Select engagement —</option>
                {engagements?.results.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Template</label>
              <select
                value={form.template}
                onChange={(e) => set("template", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">— No template —</option>
                {(templates ?? []).map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Executive Summary
            </label>
            <textarea
              rows={3}
              value={form.executive_summary}
              onChange={(e) => set("executive_summary", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="High-level summary for executives..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Content</label>
            <textarea
              rows={5}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Full report content..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Distribution List
            </label>
            <input
              type="text"
              value={form.distribution_list}
              onChange={(e) => set("distribution_list", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="cfo@company.com, ceo@company.com"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Saving…" : isEditing ? "Update Report" : "Create Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingReport, setEditingReport] = useState<AuditReportList | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const params: Record<string, unknown> = {};
  if (statusFilter) params.status = statusFilter;

  const { data: reports, isLoading } = useReportList(params);
  const finalizeReport = useFinalizeReport();
  const deleteReport = useDeleteReport();

  async function handleFinalize(id: string) {
    if (!confirm("Finalize this report? This action cannot be undone.")) return;
    await finalizeReport.mutateAsync(id);
  }

  async function handleDelete(id: string) {
    await deleteReport.mutateAsync(id);
    setConfirmDelete(null);
  }

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "pending_review", label: "Pending Review" },
    { value: "final", label: "Final" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            {reports?.count ?? 0} report{reports?.count !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              statusFilter === opt.value
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !reports?.results.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm">No reports found.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Create your first report
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Engagement</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Generated By</th>
                  <th className="px-6 py-3">Finalized At</th>
                  <th className="px-6 py-3">Created At</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.results.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{report.title}</td>
                    <td className="px-6 py-4 text-gray-600">{report.engagement_name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          REPORT_STATUS_COLORS[report.status]
                        )}
                      >
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {report.generated_by ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDateTime(report.finalized_at)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {report.status === "draft" && (
                          <button
                            onClick={() => setEditingReport(report)}
                            className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {report.status !== "final" && report.status !== "archived" && (
                          <button
                            onClick={() => handleFinalize(report.id)}
                            disabled={finalizeReport.isPending}
                            className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckSquare className="h-3 w-3" />
                            Finalize
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(report.id)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && <ReportFormDialog onClose={() => setShowCreate(false)} />}

      {/* Edit dialog */}
      {editingReport && (
        <ReportFormDialog
          editingId={editingReport.id}
          initialData={{ title: editingReport.title }}
          onClose={() => setEditingReport(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete Report?</h2>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteReport.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteReport.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
