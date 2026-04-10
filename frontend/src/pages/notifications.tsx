import { useState } from "react";
import { Bell, BellOff, AlertCircle } from "lucide-react";
import { useRemediationList } from "@/generated/hooks";
import { REMEDIATION_STATUS_COLORS, type RemediationStatus } from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
}

let toastCounter = 0;

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string) {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  return { toasts, addToast };
}

// ── Status filter ─────────────────────────────────────────────────────────────

type StatusFilter = "" | RemediationStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("overdue");
  const { toasts, addToast } = useToasts();

  const params: Record<string, unknown> = {};
  if (statusFilter) params.status = statusFilter;

  const { data: remediations, isLoading } = useRemediationList(params);

  const items = remediations?.results ?? [];
  const totalOverdue = remediations?.count ?? 0;

  function handleSendReminder(description: string, ownerName: string) {
    addToast(
      `Reminder sent to ${ownerName || "the owner"} for: "${description.slice(0, 60)}${description.length > 60 ? "…" : ""}"`
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {statusFilter === "overdue" && totalOverdue > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                {totalOverdue} overdue
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Remediation actions requiring attention
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
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
        ) : !items.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BellOff className="mb-3 h-10 w-10" />
            <p className="text-sm font-medium">No items found</p>
            <p className="mt-1 text-xs">
              {statusFilter === "overdue"
                ? "All remediation actions are on track."
                : "No remediation actions match this filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Finding</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Due Date</th>
                  <th className="px-6 py-3">Days Overdue</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => {
                  const overdueDays = daysOverdue(item.due_date);
                  const ownerName = item.owner_detail?.full_name ?? "Unassigned";
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="max-w-xs px-6 py-4">
                        <span className="line-clamp-2 text-gray-900">{item.description}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="font-mono text-xs text-gray-400">
                          {item.finding.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{ownerName}</td>
                      <td className="px-6 py-4 text-gray-500">{formatDate(item.due_date)}</td>
                      <td className="px-6 py-4">
                        {overdueDays > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {overdueDays}d
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            REMEDIATION_STATUS_COLORS[item.status]
                          )}
                        >
                          {item.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSendReminder(item.description, ownerName)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Bell className="h-3 w-3" />
                          Send Reminder
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Count summary */}
      {!isLoading && items.length > 0 && (
        <p className="text-right text-xs text-gray-400">
          Showing {items.length} of {remediations?.count ?? items.length} items
        </p>
      )}
    </div>
  );
}
