"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Search, Loader2 } from "lucide-react";
import Link from "next/link";

type Tier = "beta" | "pro" | "premium";
type Row = { id: string; email: string; full_name: string; tier: Tier; role?: string; created_at?: string };

export default function AdminTiersPage() {
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [query, setQuery]   = useState("");
  const [rows, setRows]     = useState<Row[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) {
          location.href = "/login";
          return;
        }
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) {
          location.href = "/login";
          return;
        }
        const role = (user.user_metadata?.role as string) || "";
        setMe({ id: user.id, role });

        if (role !== "admin") {
          location.href = "/dashboard";
          return;
        }

        await load();
      } catch (e: any) {
        setError(e.message || "Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function load() {
    setError(null);
    try {
      const url = new URL("/api/admin/tiers", window.location.origin);
      if (query.trim()) url.searchParams.set("query", query.trim());
      const res = await fetch(url.toString(), { cache: "no-store" });

      if (!res.ok) {
        // read text so we can surface useful info (e.g. 500 HTML page)
        const text = await res.text();
        throw new Error(`API ${res.status}. ${text.slice(0, 160)}`);
      }

      const j = await res.json();
      setRows(j.users || []);
    } catch (e: any) {
      setRows([]);
      setError(e.message || "Failed to load users.");
    }
  }

  async function updateTier(userId: string, tier: Tier) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `API ${res.status}`);
      setRows(prev => prev.map(r => (r.id === userId ? { ...r, tier } : r)));
    } catch (e: any) {
      alert(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => rows, [rows]);

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
              <h1 style={{ margin: 0 }}>Admin • User Tiers</h1>
            </div>
            <Link className="btn" href="/dashboard">Back to dashboard</Link>
          </header>

          {error && (
            <div className="card" style={{ padding: 12, marginBottom: 12, borderColor: "#7f1d1d", background: "rgba(127,29,29,.18)" }}>
              <strong style={{ color: "#fecaca" }}>Error:</strong>{" "}
              <span style={{ color: "#fecaca" }}>{error}</span>
              <div className="fine" style={{ color: "#fca5a5" }}>
                Open <code>/api/admin/tiers</code> in a new tab to see the raw error.
              </div>
            </div>
          )}

          {/* Search */}
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

          {/* Table */}
          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 12, color: "var(--muted)" }}>
                  <th style={{ padding: "10px 12px" }}>Name</th>
                  <th style={{ padding: "10px 12px" }}>Email</th>
                  <th style={{ padding: "10px 12px" }}>Tier</th>
                  <th style={{ padding: "10px 12px" }}>Role</th>
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
                        disabled={busyId === u.id}
                        className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-2 py-1"
                      >
                        <option value="beta">Beta ($98)</option>
                        <option value="pro">Pro ($297)</option>
                        <option value="premium">Premium ($496)</option>
                      </select>
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{u.role || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {busyId === u.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: "var(--muted)" }}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="fine" style={{ marginTop: 10, color: "var(--muted)" }}>
            Tip: set user <code>role</code> to <b>admin</b> in their <code>user_metadata</code> to grant access.
          </p>
        </div>
      </div>
    </main>
  );
}
