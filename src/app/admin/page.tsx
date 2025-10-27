"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Users, Activity, Building2, FileText, Shield, TrendingUp,
  Search, Filter, MoreVertical, CheckCircle2, XCircle, Clock,
  AlertCircle, Mail, Calendar, Eye, Edit, Trash2, Download,
  BarChart3, DollarSign, UserCheck, UserX, Sparkles
} from "lucide-react";

type User = {
  id: string;
  email?: string | undefined;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: {
    full_name?: string;
    subscription_tier?: string;
  };
  status?: "active" | "inactive" | "suspended";
};

type AdminStats = {
  totalUsers: number;
  activeUsers: number;
  totalRequests: number;
  verifiedProperties: number;
  pendingVerifications: number;
  revenueThisMonth: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    subscription_tier: "beta",
    temporary_password: "",
    send_invite_email: true
  });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, [router]);

  async function checkAdminAuth() {
    if (!supabase) {
      router.replace("/login");
      return;
    }

    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.replace("/login");
      return;
    }

    // Check if user is admin
    const isAdmin = data.user.user_metadata?.role === "admin" || 
                    data.user.email?.endsWith("@arbibase.com");

    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }

    setUser(data.user);
    setLoading(false);
    fetchAdminData();
  }

  async function fetchAdminData() {
    if (!supabase) return;

    try {
      // Fetch real stats from Supabase
      const [usersResult, requestsResult, propertiesResult] = await Promise.all([
        supabase.from("user_profiles").select("id, email, full_name, subscription_tier, status, created_at", { count: "exact" }),
        supabase.from("property_requests").select("id, status", { count: "exact" }),
        supabase.from("properties").select("id, verified", { count: "exact" })
      ]);

      // Calculate stats
      const totalUsers = usersResult.count || 0;
      const activeUsers = usersResult.data?.filter(u => u.status === "active").length || 0;
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
        revenueThisMonth: calculateRevenue(usersResult.data || [])
      });

      // Fetch and set users
      if (usersResult.data) {
        const mappedUsers: User[] = usersResult.data.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          user_metadata: {
            full_name: u.full_name,
            subscription_tier: u.subscription_tier
          },
          status: u.status as "active" | "inactive" | "suspended"
        }));
        setUsers(mappedUsers);
        setFilteredUsers(mappedUsers);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
      // Fall back to mock data
      setStats({
        totalUsers: 156,
        activeUsers: 98,
        totalRequests: 342,
        verifiedProperties: 128,
        pendingVerifications: 23,
        revenueThisMonth: 24580
      });
    }
  }

  function calculateRevenue(users: any[]): number {
    const tierPrices: Record<string, number> = {
      beta: 98,
      standard: 198,
      pro: 297,
      premium: 496
    };

    return users.reduce((total, user) => {
      const tier = user.subscription_tier || "beta";
      return total + (tierPrices[tier] || 0);
    }, 0);
  }

  // Search filter
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.user_metadata?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);

    try {
      if (!supabase) throw new Error("Supabase not initialized");
      if (!user) throw new Error("User not authenticated");

      // Validate inputs
      if (!newUser.email.trim()) throw new Error("Email is required");
      if (!newUser.full_name.trim()) throw new Error("Full name is required");
      if (!newUser.temporary_password || newUser.temporary_password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.temporary_password,
        email_confirm: true,
        user_metadata: {
          full_name: newUser.full_name,
          subscription_tier: newUser.subscription_tier,
          created_by: user.id,
          created_at: new Date().toISOString()
        }
      });

      if (authError) throw authError;

      // Insert user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          subscription_tier: newUser.subscription_tier,
          status: "active",
          requests_limit: getRequestsLimit(newUser.subscription_tier),
          created_by: user.id
        });

      if (profileError) console.error("Profile creation error:", profileError);

      // Send invite email if enabled
      if (newUser.send_invite_email) {
        await sendInviteEmail(newUser.email, newUser.full_name, newUser.temporary_password);
      }

      // Success
      setShowCreateUserModal(false);
      setNewUser({
        email: "",
        full_name: "",
        subscription_tier: "beta",
        temporary_password: "",
        send_invite_email: true
      });
      fetchAdminData(); // Refresh the user list

      alert(`User ${newUser.email} created successfully!`);
    } catch (error: any) {
      console.error("Error creating user:", error);
      setCreateError(error.message || "Failed to create user");
    } finally {
      setCreateLoading(false);
    }
  }

  function getRequestsLimit(tier: string): number {
    const limits: Record<string, number> = {
      beta: 25,
      standard: 50,
      pro: 75,
      premium: 100
    };
    return limits[tier] || 25;
  }

  async function sendInviteEmail(email: string, name: string, password: string) {
    // Implement your email sending logic here
    // Could use Resend, SendGrid, or Supabase Edge Functions
    try {
      const response = await fetch("/api/admin/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password })
      });
      
      if (!response.ok) throw new Error("Failed to send invite email");
    } catch (error) {
      console.error("Email send error:", error);
      // Don't fail the user creation if email fails
    }
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, temporary_password: password }));
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
          <button className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10">
            <Download size={16} /> Export Data
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
          sublabel={`${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% active`}
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
      {activeTab === "overview" && <OverviewTab stats={stats} />}
      {activeTab === "users" && (
        <UsersTab
          users={filteredUsers}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateUser={() => setShowCreateUserModal(true)}
        />
      )}
      {activeTab === "requests" && <RequestsTab />}
      {activeTab === "properties" && <PropertiesTab />}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          newUser={newUser}
          onUpdate={setNewUser}
          onSubmit={handleCreateUser}
          onClose={() => {
            setShowCreateUserModal(false);
            setCreateError("");
          }}
          error={createError}
          loading={createLoading}
          onGeneratePassword={generatePassword}
        />
      )}
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

function OverviewTab({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recent Activity */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Recent Activity</h3>
        <div className="space-y-3">
          <ActivityItem
            icon={<UserCheck size={16} className="text-emerald-400" />}
            title="New user registered"
            subtitle="jane.smith@example.com"
            time="5m ago"
          />
          <ActivityItem
            icon={<FileText size={16} className="text-blue-400" />}
            title="Verification request submitted"
            subtitle="123 Main St, Austin, TX"
            time="12m ago"
          />
          <ActivityItem
            icon={<CheckCircle2 size={16} className="text-emerald-400" />}
            title="Property verified"
            subtitle="456 Elm Ave, Seattle, WA"
            time="1h ago"
          />
          <ActivityItem
            icon={<Mail size={16} className="text-violet-400" />}
            title="Support ticket created"
            subtitle="User #1234"
            time="2h ago"
          />
        </div>
      </section>

      {/* System Health */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">System Health</h3>
        <div className="space-y-4">
          <HealthMetric label="API Response Time" value="145ms" status="good" />
          <HealthMetric label="Database Connections" value="23/100" status="good" />
          <HealthMetric label="Storage Used" value="45.2 GB" status="warning" />
          <HealthMetric label="Active Sessions" value="98" status="good" />
        </div>
      </section>
    </div>
  );
}

function UsersTab({ users, searchQuery, onSearchChange, onCreateUser }: {
  users: User[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCreateUser: () => void;
}) {
  return (
    <div>
      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            <Filter size={16} /> Filter
          </button>
          <button
            onClick={onCreateUser}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <Users size={16} /> Create User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tier</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Last Active</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-white">{user.user_metadata?.full_name || "Unnamed User"}</p>
                    <p className="text-xs text-white/60">{user.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                    {user.user_metadata?.subscription_tier || "beta"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    user.status === "active"
                      ? "bg-emerald-500/10 text-emerald-300"
                      : "bg-white/10 text-white/60"
                  }`}>
                    {user.status === "active" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-white/70">
                  {user.last_sign_in_at ? getTimeAgo(user.last_sign_in_at) : "Never"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                      <Eye size={14} />
                    </button>
                    <button className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                      <Edit size={14} />
                    </button>
                    <button className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

function ActivityItem({ icon, title, subtitle, time }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="rounded-lg bg-white/5 p-2">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/60">{subtitle}</p>
      </div>
      <span className="text-xs text-white/50">{time}</span>
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

function CreateUserModal({ newUser, onUpdate, onSubmit, onClose, error, loading, onGeneratePassword }: {
  newUser: any;
  onUpdate: (user: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  error: string;
  loading: boolean;
  onGeneratePassword: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b141d] p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create New User</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 hover:bg-white/5 hover:text-white"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => onUpdate({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
                className="input"
                required
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={newUser.full_name}
                onChange={(e) => onUpdate({ ...newUser, full_name: e.target.value })}
                placeholder="John Doe"
                className="input"
                required
              />
            </div>

            {/* Subscription Tier */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Subscription Tier <span className="text-red-400">*</span>
              </label>
              <select
                value={newUser.subscription_tier}
                onChange={(e) => onUpdate({ ...newUser, subscription_tier: e.target.value })}
                className="input"
              >
                <option value="beta">Beta ($98/mo - 25 requests)</option>
                <option value="standard">Standard ($198/mo - 50 requests)</option>
                <option value="pro">Pro ($297/mo - 75 requests)</option>
                <option value="premium">Premium ($496/mo - 100 requests)</option>
              </select>
            </div>

            {/* Temporary Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                Temporary Password <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUser.temporary_password}
                  onChange={(e) => onUpdate({ ...newUser, temporary_password: e.target.value })}
                  placeholder="Min 8 characters"
                  className="input flex-1"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={onGeneratePassword}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
                >
                  Generate
                </button>
              </div>
              <p className="mt-1 text-xs text-white/50">User should change this on first login</p>
            </div>

            {/* Send Invite Email */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="send-invite"
                checked={newUser.send_invite_email}
                onChange={(e) => onUpdate({ ...newUser, send_invite_email: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-2 focus:ring-emerald-400/30"
              />
              <label htmlFor="send-invite" className="text-sm text-white/90">
                Send invitation email with login credentials
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
