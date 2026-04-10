import { useState } from "react";
import { ScrollText, Search, X, ChevronDown } from "lucide-react";
import { useAuditLogList } from "@/generated/hooks";
import { AUDIT_LOG_ACTION_LABELS, type AuditLog, type AuditLogAction } from "@/generated/models";
import { cn, formatDateTime } from "@/lib/utils";

const ACTION_COLORS: Record<AuditLogAction, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  view: "bg-gray-100 text-gray-700",
  login: "bg-purple-100 text-purple-800",
  logout: "bg-purple-100 text-purple-800",
  export: "bg-yellow-100 text-yellow-800",
  approve: "bg-emerald-100 text-emerald-800",
  reject: "bg-orange-100 text-orange-800",
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data, isLoading } = useAuditLogList({
    search: search || undefined,
    action: filterAction || undefined,
    page,
  });

  const logs = data?.results ?? [];
  const totalPages = data ? Math.ceil(data.count / 50) : 1;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold">Audit Logs</h1>
        {data && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {data.count.toLocaleString()} entries
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search entity type, name…"
            className="w-full rounded-lg border pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All Actions</option>
          {Object.entries(AUDIT_LOG_ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {(search || filterAction) && (
          <button
            onClick={() => { setSearch(""); setFilterAction(""); setPage(1); }}
            className="flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <ScrollText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No audit log entries found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP Address</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.user_detail?.full_name ?? log.user ?? "System"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ACTION_COLORS[log.action])}>
                      {AUDIT_LOG_ACTION_LABELS[log.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.entity_type}</td>
                  <td className="px-4 py-3 text-xs max-w-[200px] truncate">{log.entity_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.ip_address ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {(log.old_values || log.new_values) && (
                      <button
                        onClick={() => setSelected(log)}
                        className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-semibold">Log Entry Details</h2>
              <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Timestamp</p>
                  <p>{formatDateTime(selected.timestamp)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", ACTION_COLORS[selected.action])}>
                    {AUDIT_LOG_ACTION_LABELS[selected.action]}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity Type</p>
                  <p className="font-mono">{selected.entity_type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity Name</p>
                  <p>{selected.entity_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IP Address</p>
                  <p>{selected.ip_address ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User</p>
                  <p>{selected.user_detail?.full_name ?? selected.user ?? "System"}</p>
                </div>
              </div>

              {selected.old_values && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Previous Values</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {selected.new_values && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">New Values</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
