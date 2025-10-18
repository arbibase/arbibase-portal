"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Search, Loader2, Ban, UserX, UserCog } from "lucide-react";
import Link from "next/link";

type Tier = "beta" | "pro" | "premium";
type Row = {
  id: string;
  email: string;
  full_name: string;
  tier: Tier;
  role?: string;
  created_at?: string;
  suspended?: boolean;
};

// Attach Supabase access token to API calls from this page.
async function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");

  // If the client exists, forward the current access token.
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers, credentials: "include", cache: "no-store" });
}

export default function AdminTiersPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Single source of truth for auth: ask server who I am.
  useEffect(() => {
    (async () => {
      // 🔑 IMPORTANT: use authFetch so bearer token is included
      const meRes = await authFetch("/api/debug/me");
      const me = await meRes.json();

      if (!me?.id) return void (location.href = "/login");
      if (me.role !== "admin") return void (location.href = "/dashboard");

      setIsAdmin(true);
      await load();
      setLoading(false);
    })();
  }, []);

  async function load() {
    const url = new URL("/api/admin/tiers", location.origin);
    if (query.trim()) url.searchParams.set("query", query.trim());
    const res = await authFetch(url.toString());
    const j = await res.json();
    setRows(j.users || []);
  }

  async function updateTier(userId: string, tier: Tier) {
    setBusyId(userId);
    try {
      const r = await authFetch("/api/admin/tiers", {
        method: "POST",
        body: JSON.stringify({ userId, tier }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed updating tier");
      setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, tier } : u)));
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
      setRows((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: makeAdmin ? "admin" : "operator" } : u))
      );
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
      setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, suspended: suspend } : u)));
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
      setRows((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(
    () =>
      rows.filter((u) =>
        query.trim()
          ? `${u.full_name} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase())
          : true
      ),
    [rows, query]
  );

  if (loading) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading admin data…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 18 }}>
        <div className="card-body" style={{ padding: 0 }}>
          <header className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <h1 style={{ margin: 0 }}>Admin • User Management</h1>
            </div>
            <Link className="btn" href="/dashboard">Back to dashboard</Link>
          </header>

          <div className="search" style={{ margin: 0 }}>
            <div className="search-grid" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 opacity-70" />
                <input
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                />
              </div>
              <div className="actions">
                <button className="btn primary" onClick={load}>Search</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, color: "var(--muted)" }}>
                  <th style={{ padding: "10px 12px" }}>Name</th>
                  <th style={{ padding: "10px 12px" }}>Email</th>
                  <th style={{ padding: "10px 12px" }}>Tier</th>
                  <th style={{ padding: "10px 12px" }}>Role</th>
                  <th style={{ padding: "10px 12px" }}>Status</th>
                  <th style={{ padding: "10px 12px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 12px" }}>{u.full_name || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{u.email}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <select
                        value={u.tier}
                        onChange={(e) => updateTier(u.id, e.target.value as Tier)}
                        className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-2 py-1"
                        disabled={!isAdmin || busyId === u.id}
                        title={!isAdmin ? "Admins only" : undefined}
                      >
                        <option value="beta">Beta ($98)</option>
                        <option value="pro">Pro ($297)</option>
                        <option value="premium">Premium ($496)</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{u.role || "operator"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {u.suspended ? (
                        <span style={{ color: "#f59e0b" }}>Suspended</span>
                      ) : (
                        <span style={{ color: "#34d399" }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn"
                          disabled={!isAdmin || busyId === u.id}
                          onClick={() => setAdmin(u.id, u.role !== "admin")}
                          title={u.role === "admin" ? "Revoke admin" : "Grant admin"}
                        >
                          <UserCog className="h-4 w-4" />
                          {u.role === "admin" ? "Revoke Admin" : "Grant Admin"}
                        </button>
                        <button
                          className="btn"
                          disabled={!isAdmin || busyId === u.id}
                          onClick={() => toggleSuspend(u.id, !u.suspended)}
                          title={u.suspended ? "Unsuspend account" : "Suspend account"}
                        >
                          <Ban className="h-4 w-4" />
                          {u.suspended ? "Unsuspend" : "Suspend"}
                        </button>
                        <button
                          className="btn"
                          style={{ borderColor: "#ef4444", color: "#ef4444" }}
                          disabled={!isAdmin || busyId === u.id}
                          onClick={() => deleteUser(u.id, u.email)}
                          title="Delete account"
                        >
                          <UserX className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 16, color: "var(--muted)" }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="fine" style={{ marginTop: 10, color: "var(--muted)" }}>
            Only admins can use this page. Admin actions are audited via Supabase logs.
          </p>
        </div>
      </div>
    </main>
  );
}
