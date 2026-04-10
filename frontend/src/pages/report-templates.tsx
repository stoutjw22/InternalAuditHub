import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, X } from "lucide-react";
import {
  useReportTemplateList,
  useCreateReportTemplate,
  useUpdateReportTemplate,
  useDeleteReportTemplate,
} from "@/generated/hooks";
import type { AuditReportTemplate } from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

// ── Form ──────────────────────────────────────────────────────────────────────

interface TemplateFormState {
  name: string;
  description: string;
  content_template: string;
  is_active: boolean;
}

const EMPTY_FORM: TemplateFormState = {
  name: "",
  description: "",
  content_template: "",
  is_active: true,
};

const CONTENT_PLACEHOLDER = `# Audit Report

## Executive Summary
{{ executive_summary }}

## Scope and Objectives
Describe the scope...

## Findings Summary
{{ findings_table }}

## Recommendations
...

## Conclusion
...`;

function TemplateFormDialog({
  template,
  onClose,
}: {
  template?: AuditReportTemplate;
  onClose: () => void;
}) {
  const isEditing = !!template;
  const [form, setForm] = useState<TemplateFormState>(
    template
      ? {
          name: template.name,
          description: template.description,
          content_template: template.content_template,
          is_active: template.is_active,
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState("");

  const createTemplate = useCreateReportTemplate();
  const updateTemplate = useUpdateReportTemplate();

  function set<K extends keyof TemplateFormState>(field: K, value: TemplateFormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    try {
      if (isEditing && template) {
        await updateTemplate.mutateAsync({ id: template.id, ...form });
      } else {
        await createTemplate.mutateAsync(form);
      }
      onClose();
    } catch {
      setError("Failed to save template. Please try again.");
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Template" : "New Report Template"}
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
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Standard IT Audit Report"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Brief description of when to use this template"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Content Template
            </label>
            <p className="mb-1.5 text-xs text-gray-500">
              Use {"{{ variable }}"} placeholders for dynamic content.
            </p>
            <textarea
              rows={12}
              value={form.content_template}
              onChange={(e) => set("content_template", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={CONTENT_PLACEHOLDER}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active (available for use in reports)
            </label>
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
              {isPending ? "Saving…" : isEditing ? "Update Template" : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────────────

function DeleteConfirmDialog({
  templateName,
  onConfirm,
  onCancel,
  isPending,
}: {
  templateName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900">Delete Template?</h2>
        <p className="mt-2 text-sm text-gray-500">
          <strong className="text-gray-700">{templateName}</strong> will be permanently deleted.
          This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportTemplatesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AuditReportTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<AuditReportTemplate | null>(null);

  const { data: templates, isLoading } = useReportTemplateList();
  const deleteTemplate = useDeleteReportTemplate();

  async function handleDelete() {
    if (!deletingTemplate) return;
    await deleteTemplate.mutateAsync(deletingTemplate.id);
    setDeletingTemplate(null);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            {templates?.length ?? 0} template{templates?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !templates?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText className="mb-3 h-10 w-10" />
            <p className="text-sm">No report templates found.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Active</th>
                  <th className="px-6 py-3">Created At</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="font-medium text-gray-900">{tpl.name}</span>
                      </div>
                    </td>
                    <td className="max-w-xs px-6 py-4 text-gray-500">
                      <span className="line-clamp-2">{tpl.description || "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          tpl.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {tpl.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(tpl.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingTemplate(tpl)}
                          className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingTemplate(tpl)}
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

      {showCreate && <TemplateFormDialog onClose={() => setShowCreate(false)} />}
      {editingTemplate && (
        <TemplateFormDialog template={editingTemplate} onClose={() => setEditingTemplate(null)} />
      )}
      {deletingTemplate && (
        <DeleteConfirmDialog
          templateName={deletingTemplate.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTemplate(null)}
          isPending={deleteTemplate.isPending}
        />
      )}
    </div>
  );
}
