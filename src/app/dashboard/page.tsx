"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Users, Activity, Building2, FileText, Shield, TrendingUp,
  Search, Filter, MoreVertical, CheckCircle2, XCircle, Clock,
  AlertCircle, Mail, Calendar, Eye, Edit, Trash2, Download,
  BarChart3, DollarSign, UserCheck, UserX, Sparkles, Ban, UserCog, Loader2,
  Bell, MapPin, Calculator, Gift
} from "lucide-react";

type Tier = "beta" | "pro" | "premium";

type User = {
  id: string;
  email?: string;
  full_name?: string;
  created_at: string;
  last_sign_in_at?: string;
  tier: Tier;
  role?: string;
  status?: "active" | "inactive" | "suspended";
  suspended?: boolean;
  requests_used?: number;
  requests_limit?: number;
};

type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  totalRequests: number;
  verifiedProperties: number;
  pendingVerifications: number;
  revenueThisMonth: number;
};

type ActivityLog = {
  id: string;
  type: 'user_created' | 'user_login' | 'request_submitted' | 'property_verified' | 'tier_changed';
  user_id?: string;
  user_email?: string;
  details?: any;
  created_at: string;
};

// Attach Supabase access token to API calls
async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers, credentials: "include", cache: "no-store" });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "requests" | "properties">("overview");
  
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRequests: 0,
    verifiedProperties: 0,
    pendingVerifications: 0,
    revenueThisMonth: 0
  });

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);

  useEffect(() => {
    checkAdminAuth();
  }, [router]);

  async function checkAdminAuth() {
    const meRes = await authFetch("/api/debug/me");
    const me = await meRes.json();

    if (!me?.id) {
      router.replace("/login");
      return;
    }
    if (me.role !== "admin") {
      router.replace("/dashboard");
      return;
    }

    setIsAdmin(true);
    await Promise.all([fetchAdminData(), fetchRecentActivity()]);
    setLoading(false);
  }

  async function fetchAdminData() {
    if (!supabase) return;

    try {
      // Fetch users with all details
      const url = new URL("/api/admin/tiers", location.origin);
      const res = await authFetch(url.toString());
      const data = await res.json();
      const usersData = data.users || [];

      // Fetch additional stats
      const [requestsResult, propertiesResult] = await Promise.all([
        supabase.from("property_requests").select("id, status", { count: "exact" }),
        supabase.from("properties").select("id, verified", { count: "exact" })
      ]);

      const totalUsers = usersData.length;
      const activeUsers = usersData.filter((u: User) => !u.suspended && u.status !== "inactive").length;
      const totalRequests = requestsResult.count || 0;
      const verifiedProperties = propertiesResult.data?.filter(p => p.verified).length || 0;
      const pendingVerifications = requestsResult.data?.filter(r => 
        r.status === "pending" || r.status === "in_review"
      ).length || 0;

      setStats({
        totalUsers,
        activeUsers,
        totalRequests,
        verifiedProperties,
        pendingVerifications,
        revenueThisMonth: calculateRevenue(usersData)
      });

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  }

  async function fetchRecentActivity() {
    if (!supabase) return;

    try {
      // Fetch recent activity from audit logs
      const { data: activityData } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (activityData) {
        setRecentActivity(activityData);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  }

  function calculateRevenue(users: User[]): number {
    const tierPrices: Record<string, number> = {
      beta: 98,
      pro: 297,
      premium: 496
    };

    return users.reduce((total, user) => {
      const tier = user.tier || "beta";
      return total + (tierPrices[tier] || 0);
    }, 0);
  }

  // Search filter
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  async function updateTier(userId: string, tier: Tier) {
    setBusyId(userId);
    try {
      const r = await authFetch("/api/admin/tiers", {
        method: "POST",
        body: JSON.stringify({ userId, tier }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed updating tier");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier } : u)));
      setFilteredUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, tier } : u)));
      await fetchRecentActivity(); // Refresh activity
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function setAdmin(userId: string, makeAdmin: boolean) {
    setBusyId(userId);
    try {
      const r = await authFetch("/api/admin/promote", {
        method: "POST",
        body: JSON.stringify({ userId, makeAdmin }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: makeAdmin ? "admin" : "operator" } : u))
      );
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: makeAdmin ? "admin" : "operator" } : u))
      );
      await fetchRecentActivity();
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleSuspend(userId: string, suspend: boolean) {
    if (!confirm(suspend ? "Suspend this account?" : "Unsuspend this account?")) return;
    setBusyId(userId);
    try {
      const r = await authFetch(`/api/admin/users/${userId}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspend }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, suspended: suspend } : u)));
      setFilteredUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, suspended: suspend } : u)));
      await fetchRecentActivity();
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Permanently delete ${email}? This cannot be undone.`)) return;
    setBusyId(userId);
    try {
      const r = await authFetch(`/api/admin/users/${userId}/delete`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setFilteredUsers((prev) => prev.filter((u) => u.id !== userId));
      await fetchRecentActivity();
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-300">
              <Shield size={12} className="inline mr-1" />
              ADMIN
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">
            System Dashboard
          </h1>
          <p className="mt-1 text-white/60">Monitor users, requests, and platform activity</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => fetchAdminData()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <Activity size={16} /> Refresh
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Back to Portal
          </Link>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <AdminStatCard
          icon={<Users size={20} />}
          label="Total Users"
          value={stats.totalUsers}
          color="blue"
        />
        <AdminStatCard
          icon={<UserCheck size={20} />}
          label="Active Users"
          value={stats.activeUsers}
          sublabel={`${Math.round((stats.activeUsers / stats.totalUsers) * 100 || 0)}% active`}
          color="emerald"
        />
        <AdminStatCard
          icon={<FileText size={20} />}
          label="Total Requests"
          value={stats.totalRequests}
          color="violet"
        />
        <AdminStatCard
          icon={<Building2 size={20} />}
          label="Verified Properties"
          value={stats.verifiedProperties}
          color="cyan"
        />
        <AdminStatCard
          icon={<Clock size={20} />}
          label="Pending"
          value={stats.pendingVerifications}
          color="amber"
        />
        <AdminStatCard
          icon={<DollarSign size={20} />}
          label="Revenue (MTD)"
          value={`$${(stats.revenueThisMonth / 1000).toFixed(1)}K`}
          color="green"
        />
      </section>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-white/10">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={<BarChart3 size={16} />}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === "users"}
          onClick={() => setActiveTab("users")}
          icon={<Users size={16} />}
        >
          Users ({users.length})
        </TabButton>
        <TabButton
          active={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          icon={<FileText size={16} />}
        >
          Requests
        </TabButton>
        <TabButton
          active={activeTab === "properties"}
          onClick={() => setActiveTab("properties")}
          icon={<Building2 size={16} />}
        >
          Properties
        </TabButton>
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && <OverviewTab stats={stats} activity={recentActivity} />}
      {activeTab === "users" && (
        <UsersTab
          users={filteredUsers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          busyId={busyId}
          onUpdateTier={updateTier}
          onSetAdmin={setAdmin}
          onToggleSuspend={toggleSuspend}
          onDeleteUser={deleteUser}
        />
      )}
      {activeTab === "requests" && <RequestsTab />}
      {activeTab === "properties" && <PropertiesTab />}
      
      {/* Add Premium Features Section after existing sections */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Premium Features</h2>
            <p className="text-sm text-white/60">Unlock powerful tools for your investment strategy</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/saved-searches"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="mb-3 rounded-lg bg-blue-500/10 p-2 w-fit">
              <Bell size={20} className="text-blue-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">Saved Searches</h3>
            <p className="text-xs text-white/60">Get alerts for matching properties</p>
          </Link>

          <Link
            href="/properties/map"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="mb-3 rounded-lg bg-emerald-500/10 p-2 w-fit">
              <MapPin size={20} className="text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">Map View</h3>
            <p className="text-xs text-white/60">Explore properties visually</p>
          </Link>

          <Link
            href="/analytics"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="mb-3 rounded-lg bg-violet-500/10 p-2 w-fit">
              <BarChart3 size={20} className="text-violet-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">Analytics</h3>
            <p className="text-xs text-white/60">Track your portfolio performance</p>
          </Link>

          <Link
            href="/calculators"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="mb-3 rounded-lg bg-cyan-500/10 p-2 w-fit">
              <Calculator size={20} className="text-cyan-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">Calculators</h3>
            <p className="text-xs text-white/60">ROI, mortgage, cash flow tools</p>
          </Link>

          <Link
            href="/referrals"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="mb-3 rounded-lg bg-amber-500/10 p-2 w-fit">
              <Gift size={20} className="text-amber-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">Referrals</h3>
            <p className="text-xs text-white/60">Earn rewards for inviting friends</p>
          </Link>

          <Link
            href="/market-reports"
            className="group rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all"
          >
            <div className="mb-3 rounded-lg bg-red-500/10 p-2 w-fit">
              <FileText size={20} className="text-red-400" />
            </div>
            <h3 className="font-semibold text-white mb-1">Market Reports</h3>
            <p className="text-xs text-white/60">Weekly insights and trends</p>
          </Link>
        </div>
      </section>
    </div>
  );
}

function AdminStatCard({ icon, label, value, sublabel, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    green: "from-green-500/10 to-green-500/5 border-green-500/20"
  };

  return (
    <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4`}>
      <div className="mb-2 rounded-lg bg-white/10 p-2 text-white/90 w-fit">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs font-medium text-white/70">{label}</p>
      {sublabel && <p className="text-[11px] text-white/50">{sublabel}</p>}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
        active
          ? "border-b-2 border-emerald-500 text-white"
          : "text-white/60 hover:text-white/90"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function OverviewTab({ stats, activity }: { stats: AdminStats; activity: ActivityLog[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recent Activity */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Recent Activity</h3>
        <div className="space-y-3">
          {activity.length > 0 ? (
            activity.map((log) => (
              <ActivityItem key={log.id} log={log} />
            ))
          ) : (
            <p className="text-sm text-white/50">No recent activity</p>
          )}
        </div>
      </section>

      {/* System Health */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">System Health</h3>
        <div className="space-y-4">
          <HealthMetric label="Total Users" value={stats.totalUsers.toString()} status="good" />
          <HealthMetric label="Active Users" value={stats.activeUsers.toString()} status="good" />
          <HealthMetric 
            label="Pending Verifications" 
            value={stats.pendingVerifications.toString()} 
            status={stats.pendingVerifications > 20 ? "warning" : "good"} 
          />
          <HealthMetric label="Monthly Revenue" value={`$${stats.revenueThisMonth}`} status="good" />
        </div>
      </section>
    </div>
  );
}

function UsersTab({ users, searchQuery, onSearchChange, busyId, onUpdateTier, onSetAdmin, onToggleSuspend, onDeleteUser }: {
  users: User[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  busyId: string | null;
  onUpdateTier: (userId: string, tier: Tier) => void;
  onSetAdmin: (userId: string, makeAdmin: boolean) => void;
  onToggleSuspend: (userId: string, suspend: boolean) => void;
  onDeleteUser: (userId: string, email: string) => void;
}) {
  return (
    <div>
      {/* Search */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pl-10 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="text-sm text-white/60">
          {users.length} user{users.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{user.full_name || "Unnamed User"}</p>
                      <p className="text-xs text-white/60">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.tier}
                      onChange={(e) => onUpdateTier(user.id, e.target.value as Tier)}
                      className="rounded-lg border bg-[#0f141c] border-white/10 px-2 py-1 text-sm text-white"
                      disabled={busyId === user.id}
                    >
                      <option value="beta">Beta ($98)</option>
                      <option value="pro">Pro ($297)</option>
                      <option value="premium">Premium ($496)</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/80">{user.role || "operator"}</span>
                  </td>
                  <td className="px-6 py-4">
                    {user.suspended ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        <Ban size={12} />
                        Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-white/70">
                    {user.requests_used || 0} / {user.requests_limit || 25}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={busyId === user.id}
                        onClick={() => onSetAdmin(user.id, user.role !== "admin")}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10 disabled:opacity-50"
                        title={user.role === "admin" ? "Revoke admin" : "Grant admin"}
                      >
                        <UserCog size={14} />
                      </button>
                      <button
                        disabled={busyId === user.id}
                        onClick={() => onToggleSuspend(user.id, !user.suspended)}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10 disabled:opacity-50"
                        title={user.suspended ? "Unsuspend" : "Suspend"}
                      >
                        <Ban size={14} />
                      </button>
                      <button
                        disabled={busyId === user.id}
                        onClick={() => onDeleteUser(user.id, user.email || '')}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                        title="Delete user"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-white/50">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RequestsTab() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <FileText size={48} className="mx-auto mb-4 text-white/20" />
      <h3 className="text-lg font-bold text-white">Requests Management</h3>
      <p className="mt-2 text-sm text-white/60">View and manage all property verification requests</p>
    </div>
  );
}

function PropertiesTab() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <Building2 size={48} className="mx-auto mb-4 text-white/20" />
      <h3 className="text-lg font-bold text-white">Properties Management</h3>
      <p className="mt-2 text-sm text-white/60">Manage verified properties and listings</p>
    </div>
  );
}

function ActivityItem({ log }: { log: ActivityLog }) {
  const activityTypes = {
    user_created: { icon: <UserCheck size={16} className="text-emerald-400" />, label: "New user registered" },
    user_login: { icon: <Activity size={16} className="text-blue-400" />, label: "User logged in" },
    request_submitted: { icon: <FileText size={16} className="text-violet-400" />, label: "Request submitted" },
    property_verified: { icon: <CheckCircle2 size={16} className="text-emerald-400" />, label: "Property verified" },
    tier_changed: { icon: <TrendingUp size={16} className="text-cyan-400" />, label: "Tier updated" }
  };

  const activity = activityTypes[log.type] || activityTypes.user_login;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="rounded-lg bg-white/5 p-2">{activity.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{activity.label}</p>
        <p className="text-xs text-white/60">{log.user_email || log.details?.email || "System"}</p>
      </div>
      <span className="text-xs text-white/50">{getTimeAgo(log.created_at)}</span>
    </div>
  );
}

function HealthMetric({ label, value, status }: {
  label: string;
  value: string;
  status: "good" | "warning" | "error";
}) {
  const statusColors = {
    good: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500"
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{value}</span>
        <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}