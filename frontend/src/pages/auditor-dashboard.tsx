import { useAtom } from "jotai";
import { AlertTriangle, CheckCircle, ClipboardList } from "lucide-react";
import { currentUserAtom } from "@/lib/auth";
import { useFindingList, useRemediationList } from "@/generated/hooks";
import {
  FINDING_SEVERITY_COLORS,
  FINDING_STATUS_LABELS,
  REMEDIATION_STATUS_COLORS,
} from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

// ── Findings Table ─────────────────────────────────────────────────────────────

function MyFindingsSection({ userId }: { userId: string }) {
  const { data: findings, isLoading } = useFindingList({ owner: userId });
  const items = findings?.results ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h2 className="font-semibold text-gray-900">My Findings</h2>
        </div>
        {!isLoading && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {findings?.count ?? 0}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !items.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <CheckCircle className="mb-2 h-8 w-8 text-green-400" />
          <p className="text-sm">No findings assigned to you</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Severity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((finding) => (
                <tr key={finding.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{finding.title}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        FINDING_SEVERITY_COLORS[finding.severity]
                      )}
                    >
                      {finding.severity_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {FINDING_STATUS_LABELS[finding.status]}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(finding.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Remediations Table ────────────────────────────────────────────────────────

function MyRemediationsSection({ userId }: { userId: string }) {
  const { data: remediations, isLoading } = useRemediationList({
    owner: userId,
    status: "open",
  });
  const items = remediations?.results ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">My Open Remediations</h2>
        </div>
        {!isLoading && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {remediations?.count ?? 0}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !items.length ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <CheckCircle className="mb-2 h-8 w-8 text-green-400" />
          <p className="text-sm">No open remediations assigned to you</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="max-w-sm px-6 py-4">
                    <span className="line-clamp-2 text-gray-900">{item.description}</span>
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
                  <td className="px-6 py-4 text-gray-500">{formatDate(item.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditorDashboardPage() {
  const [user] = useAtom(currentUserAtom);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, <strong>{user.full_name || user.email}</strong>. Here is your current
          workload.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm font-medium text-orange-700">Role</p>
          <p className="mt-1 text-lg font-bold text-orange-900 capitalize">
            {user.role.replace(/_/g, " ")}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-700">Department</p>
          <p className="mt-1 text-lg font-bold text-blue-900">
            {user.department || "Not specified"}
          </p>
        </div>
      </div>

      {/* Findings and remediations */}
      <MyFindingsSection userId={user.id} />
      <MyRemediationsSection userId={user.id} />
    </div>
  );
}
