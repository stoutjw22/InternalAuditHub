import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  useEngagementList,
  useFindingList,
  useApprovalList,
  useApprovalDecision,
  useRemediationList,
} from "@/generated/hooks";
import {
  FINDING_SEVERITY_COLORS,
  FINDING_STATUS_LABELS,
  APPROVAL_STATUS_COLORS,
} from "@/generated/models";
import { cn, formatDate } from "@/lib/utils";

function StatCard({
  label,
  value,
  icon,
  color,
  loading,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {loading ? (
            <div className="mt-1 h-8 w-16 animate-pulse rounded bg-gray-200" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
          )}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", color)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const { data: activeEngagements, isLoading: engLoading } = useEngagementList({
    status: "in_progress",
  });
  const { data: highFindings, isLoading: findingsLoading } = useFindingList({
    severity: "high",
  });
  const { data: pendingApprovals, isLoading: approvalsLoading } = useApprovalList({
    status: "pending",
  });
  const { data: overdueRemediations, isLoading: overdueLoading } = useRemediationList({
    status: "overdue",
  });
  const { data: recentEngagements, isLoading: recentEngLoading } = useEngagementList({});

  const approvalDecision = useApprovalDecision();

  async function handleDecision(id: string, decision: "approved" | "rejected") {
    setApprovingId(id);
    try {
      await approvalDecision.mutateAsync({ id, decision });
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your internal audit programme
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Engagements"
          value={activeEngagements?.count ?? 0}
          loading={engLoading}
          icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          label="Open Findings"
          value={highFindings?.count ?? 0}
          loading={findingsLoading}
          icon={<AlertTriangle className="h-6 w-6 text-orange-600" />}
          color="bg-orange-100"
        />
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals?.count ?? 0}
          loading={approvalsLoading}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
        <StatCard
          label="Overdue Remediations"
          value={overdueRemediations?.count ?? 0}
          loading={overdueLoading}
          icon={<XCircle className="h-6 w-6 text-red-600" />}
          color="bg-red-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent High-Severity Findings */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">High-Severity Findings</h2>
            <Link
              to="/findings"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {findingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !highFindings?.results.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle className="mb-2 h-8 w-8" />
              <p className="text-sm">No high-severity findings</p>
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
                  {highFindings.results.slice(0, 8).map((finding) => (
                    <tr key={finding.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <Link
                          to={`/findings/${finding.id}`}
                          className="font-medium text-gray-900 hover:text-primary"
                        >
                          {finding.title}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            FINDING_SEVERITY_COLORS[finding.severity]
                          )}
                        >
                          {finding.severity_display}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {FINDING_STATUS_LABELS[finding.status]}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(finding.due_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Pending Approvals</h2>
            <Link
              to="/approvals"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {approvalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !pendingApprovals?.results.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle className="mb-2 h-8 w-8" />
              <p className="text-sm">No pending approvals</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingApprovals.results.slice(0, 6).map((approval) => (
                <li key={approval.id} className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {approval.entity_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {approval.entity_type} &middot; Requested{" "}
                      {formatDate(approval.requested_at)}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        APPROVAL_STATUS_COLORS[approval.status]
                      )}
                    >
                      {approval.status_display}
                    </span>
                  </div>
                  <div className="ml-4 flex shrink-0 gap-2">
                    <button
                      onClick={() => handleDecision(approval.id, "approved")}
                      disabled={approvingId === approval.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(approval.id, "rejected")}
                      disabled={approvingId === approval.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Engagements */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">Recent Engagements</h2>
          <Link
            to="/engagements"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {recentEngLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !recentEngagements?.results.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No engagements found</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentEngagements.results.slice(0, 5).map((eng) => (
              <li key={eng.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <Link
                    to={`/engagements/${eng.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-primary"
                  >
                    {eng.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    Manager: {eng.audit_manager_name} &middot; {formatDate(eng.start_date)} –{" "}
                    {formatDate(eng.end_date)}
                  </p>
                </div>
                <span className="ml-4 text-xs text-gray-500">{eng.status_display}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
