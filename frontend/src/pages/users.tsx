import { useState, useMemo } from "react";
import { Plus, Search, Users, X } from "lucide-react";
import { useUserList, useUsersByRole } from "@/generated/hooks";
import { USER_ROLE_LABELS, type UserRole, type UserListItem } from "@/generated/models";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabKey = "all" | "audit_manager" | "auditor" | "risk_owner" | "control_owner" | "finding_owner";

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: "all", label: "All Users" },
  { key: "audit_manager", label: "Audit Managers" },
  { key: "auditor", label: "Auditors" },
  { key: "risk_owner", label: "Risk Owners" },
  { key: "control_owner", label: "Control Owners" },
  { key: "finding_owner", label: "Finding Owners" },
];

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-800",
  audit_manager: "bg-blue-100 text-blue-800",
  auditor: "bg-indigo-100 text-indigo-800",
  risk_owner: "bg-orange-100 text-orange-800",
  control_owner: "bg-teal-100 text-teal-800",
  finding_owner: "bg-yellow-100 text-yellow-800",
  read_only: "bg-gray-100 text-gray-600",
};

// Map tab key to useUsersByRole endpoint slug
const TAB_TO_ROLE_SLUG: Partial<
  Record<TabKey, "auditors" | "managers" | "risk-owners" | "control-owners" | "finding-owners">
> = {
  audit_manager: "managers",
  auditor: "auditors",
  risk_owner: "risk-owners",
  control_owner: "control-owners",
  finding_owner: "finding-owners",
};

const ALL_ROLES: UserRole[] = [
  "admin",
  "audit_manager",
  "auditor",
  "risk_owner",
  "control_owner",
  "finding_owner",
  "read_only",
];

// ── Invite Dialog ─────────────────────────────────────────────────────────────

interface InviteFormState {
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | "";
  department: string;
  title: string;
}

const EMPTY_INVITE: InviteFormState = {
  email: "",
  first_name: "",
  last_name: "",
  role: "",
  department: "",
  title: "",
};

function InviteUserDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<InviteFormState>(EMPTY_INVITE);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function set<K extends keyof InviteFormState>(field: K, value: InviteFormState[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!form.role) {
      setError("Role is required.");
      return;
    }
    setIsPending(true);
    try {
      await apiClient.post("/auth/register/", {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        department: form.department,
        title: form.title,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail ?? "Failed to invite user. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">User Invited</h3>
            <p className="mt-1 text-sm text-gray-500">
              An account has been created for <strong>{form.email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="user@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value as UserRole)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              >
                <option value="">— Select role —</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="IT Audit"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Senior Auditor"
                />
              </div>
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
                {isPending ? "Inviting…" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── User Table ─────────────────────────────────────────────────────────────────

function UserTable({
  users,
  isLoading,
  search,
}: {
  users: UserListItem[] | undefined;
  isLoading: boolean;
  search: string;
}) {
  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [users, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Users className="mb-3 h-10 w-10" />
        <p className="text-sm">{search ? "No users match your search." : "No users found."}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="px-6 py-3">Full Name</th>
            <th className="px-6 py-3">Email</th>
            <th className="px-6 py-3">Role</th>
            <th className="px-6 py-3">Department</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <span className="font-medium text-gray-900">
                  {user.full_name || "—"}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-600">{user.email}</td>
              <td className="px-6 py-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    ROLE_BADGE_COLORS[user.role]
                  )}
                >
                  {USER_ROLE_LABELS[user.role]}
                </span>
              </td>
              <td className="px-6 py-4 text-gray-500">{user.department || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Role Tab content ──────────────────────────────────────────────────────────

function RoleTabContent({
  roleSlug,
  search,
}: {
  roleSlug: "auditors" | "managers" | "risk-owners" | "control-owners" | "finding-owners";
  search: string;
}) {
  const { data: users, isLoading } = useUsersByRole(roleSlug);
  return <UserTable users={users} isLoading={isLoading} search={search} />;
}

function AllUsersContent({ search }: { search: string }) {
  const { data: users, isLoading } = useUserList();
  return <UserTable users={users} isLoading={isLoading} search={search} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage team members and their roles</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Invite User
        </button>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {activeTab === "all" ? (
          <AllUsersContent search={search} />
        ) : (
          <RoleTabContent
            roleSlug={TAB_TO_ROLE_SLUG[activeTab]!}
            search={search}
          />
        )}
      </div>

      {showInvite && <InviteUserDialog onClose={() => setShowInvite(false)} />}
    </div>
  );
}
