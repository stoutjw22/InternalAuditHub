import { useState, useMemo } from "react";
import { CheckCircle, Clock, TrendingUp, Users, XCircle } from "lucide-react";
import { useApprovalList, useApprovalDecision, useEngagementList } from "@/generated/hooks";
import {
  APPROVAL_STATUS_COLORS,
  ENGAGEMENT_STATUS_COLORS,
  type ApprovalRequest,
} from "@/generated/models";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

// ── Stat Card ─────────────────────────────────────────────────────────────────

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

// ── Pending Approvals Queue ────────────────────────────────────────────────────

function PendingApprovalsQueue() {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const { data: pendingApprovals, isLoading } = useApprovalList({ status: "pending" });
  const approvalDecision = useApprovalDecision();

  const items: ApprovalRequest[] = pendingApprovals?.results ?? [];

  async function handleDecision(
    id: string,
    decision: "approved" | "rejected"
  ) {
    setProcessingId(id);
    try {
      await approvalDecision.mutateAsync({
        id,
        decision,
        review_notes: reviewNotes[id] ?? "",
      });
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          <h2 className="font-semibold text-gray-900">Pending Approvals</h2>
        </div>
        {!isLoading && (
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
            {pendingApprovals?.count ?? 0} pending
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
          <p className="text-sm">No pending approvals</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((approval) => (
            <li key={approval.id} className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{approval.entity_name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    <span className="capitalize">{approval.entity_type}</span>
                    {approval.requested_by_detail && (
                      <> &middot; Requested by {approval.requested_by_detail.full_name}</>
                    )}
                    &middot; {formatDateTime(approval.requested_at)}
                  </p>
                  {approval.request_notes && (
                    <p className="mt-1 text-xs italic text-gray-500">
                      "{approval.request_notes}"
                    </p>
                  )}
                  <span
                    className={cn(
                      "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      APPROVAL_STATUS_COLORS[approval.status]
                    )}
                  >
                    {approval.status_display}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <input
                    type="text"
                    value={reviewNotes[approval.id] ?? ""}
                    onChange={(e) =>
                      setReviewNotes((prev) => ({ ...prev, [approval.id]: e.target.value }))
                    }
                    placeholder="Notes (optional)"
                    className="w-44 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision(approval.id, "approved")}
                      disabled={processingId === approval.id}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(approval.id, "rejected")}
                      disabled={processingId === approval.id}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Team Workload ─────────────────────────────────────────────────────────────

function TeamWorkloadSection() {
  const { data: allFindings, isLoading } = useApprovalList({});

  // Build owner → count map from findings via approvals (proxy)
  // We use a separate findings query to compute per-user counts.
  const { data: engagements, isLoading: engLoading } = useEngagementList({});

  const ownerCounts = useMemo(() => {
    if (!allFindings?.results) return [];
    const map: Record<string, { name: string; count: number }> = {};
    for (const a of allFindings.results) {
      if (a.requested_by_detail) {
        const key = a.requested_by;
        if (!map[key]) {
          map[key] = { name: a.requested_by_detail.full_name, count: 0 };
        }
        map[key].count++;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [allFindings]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Team approval workload */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <Users className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-gray-900">Team Approval Activity</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !ownerCounts.length ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No approval data available
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {ownerCounts.slice(0, 8).map((entry) => (
              <li key={entry.name} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-gray-700">{entry.name}</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  {entry.count} request{entry.count !== 1 ? "s" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Engagement summary */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <TrendingUp className="h-5 w-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Engagement Summary</h2>
        </div>
        {engLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !engagements?.results.length ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            No engagements found
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {engagements.results.slice(0, 8).map((eng) => (
              <li key={eng.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{eng.name}</p>
                  <p className="text-xs text-gray-500">
                    {eng.audit_manager_name} &middot; {formatDate(eng.end_date)}
                  </p>
                </div>
                <span
                  className={cn(
                    "ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ENGAGEMENT_STATUS_COLORS[eng.status]
                  )}
                >
                  {eng.status_display}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManagerDashboardPage() {
  const { data: pendingApprovals, isLoading: pendingLoading } = useApprovalList({
    status: "pending",
  });
  const { data: allEngagements, isLoading: engLoading } = useEngagementList({});
  const { data: inProgressEngagements, isLoading: inProgressLoading } = useEngagementList({
    status: "in_progress",
  });

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Approval queue and team engagement overview
        </p>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals?.count ?? 0}
          loading={pendingLoading}
          icon={<Clock className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-100"
        />
        <StatCard
          label="Active Engagements"
          value={inProgressEngagements?.count ?? 0}
          loading={inProgressLoading}
          icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          label="Total Engagements"
          value={allEngagements?.count ?? 0}
          loading={engLoading}
          icon={<Users className="h-6 w-6 text-indigo-600" />}
          color="bg-indigo-100"
        />
      </div>

      {/* Approval queue */}
      <PendingApprovalsQueue />

      {/* Team workload + engagement summary */}
      <TeamWorkloadSection />
    </div>
  );
}
