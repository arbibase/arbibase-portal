"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Plus, Search, Filter, Clock, CheckCircle2, XCircle, 
  AlertCircle, MapPin, Calendar, FileText, Eye,
  Sparkles, Building2, TrendingUp
} from "lucide-react";

type RequestStatus = "pending" | "in_review" | "verified" | "rejected";

type PropertyRequest = {
  id: string;
  address: string;
  city: string;
  state: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  notes?: string;
  property_type?: string;
  bedrooms?: string;
  bathrooms?: string;
};

export default function RequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PropertyRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<PropertyRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");

  // Stats
  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    inReview: requests.filter(r => r.status === "in_review").length,
    verified: requests.filter(r => r.status === "verified").length,
  };

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.replace("/login");
      return;
    }
    setLoading(false);
    fetchRequests();
  }

  async function fetchRequests() {
    if (!supabase) return;

    try {
      // Fetch user's property requests from Supabase
      const { data: requestsData, error } = await supabase
        .from("property_requests")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
        // Fall back to mock data
        setRequests(getMockRequests());
        setFilteredRequests(getMockRequests());
        return;
      }

      if (requestsData && requestsData.length > 0) {
        const mapped = requestsData.map(r => ({
          id: r.id,
          address: r.address || "",
          city: r.city || "",
          state: r.state || "",
          status: r.status as RequestStatus,
          created_at: r.created_at,
          updated_at: r.updated_at,
          notes: r.notes,
          property_type: r.property_type,
          bedrooms: r.bedrooms?.toString(),
          bathrooms: r.bathrooms?.toString()
        }));
        setRequests(mapped);
        setFilteredRequests(mapped);
      } else {
        // No data, use empty array
        setRequests([]);
        setFilteredRequests([]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setRequests(getMockRequests());
      setFilteredRequests(getMockRequests());
    }
  }

  function getMockRequests(): PropertyRequest[] {
    return [
      {
        id: "1",
        address: "123 Oak Street",
        city: "Austin",
        state: "TX",
        status: "in_review",
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        notes: "Landlord interested in 12-month lease",
        property_type: "apartment",
        bedrooms: "2",
        bathrooms: "2"
      }
    ];
  }

  // Filter logic
  useEffect(() => {
    let filtered = requests;

    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(r =>
        r.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [searchQuery, statusFilter, requests]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
            <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
            <span>/</span>
            <span className="text-white/90">Requests</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">
            Property Requests
          </h1>
          <p className="mt-1 text-white/60">Track your verification submissions and pipeline</p>
        </div>
        <Link
          href="/request-verification"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,.3)] hover:bg-emerald-600"
        >
          <Plus size={16} /> New Request
        </Link>
      </header>

      {/* Stats */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Requests" value={stats.total} icon={<FileText size={20} />} color="blue" />
        <StatCard label="Pending" value={stats.pending} icon={<Clock size={20} />} color="amber" />
        <StatCard label="In Review" value={stats.inReview} icon={<AlertCircle size={20} />} color="violet" />
        <StatCard label="Verified" value={stats.verified} icon={<CheckCircle2 size={20} />} color="emerald" />
      </section>

      {/* Filters */}
      <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by address, city, or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter size={18} className="text-white/60" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
            className="input min-w-40"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </section>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <EmptyState searchQuery={searchQuery} statusFilter={statusFilter} />
      ) : (
        <section className="space-y-4">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
  };

  return (
    <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-lg bg-white/10 p-2 text-white/90">{icon}</div>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="text-sm font-medium text-white/70">{label}</p>
    </div>
  );
}

function RequestCard({ request }: { request: PropertyRequest }) {
  const statusConfig = {
    pending: { color: "amber", icon: <Clock size={16} />, label: "Pending Review" },
    in_review: { color: "violet", icon: <TrendingUp size={16} />, label: "In Review" },
    verified: { color: "emerald", icon: <CheckCircle2 size={16} />, label: "Verified" },
    rejected: { color: "red", icon: <XCircle size={16} />, label: "Rejected" }
  };

  const status = statusConfig[request.status];
  const timeAgo = getTimeAgo(request.updated_at);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Property Info */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Building2 size={18} className="text-white/60" />
            <h3 className="text-lg font-semibold text-white">{request.address}</h3>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{request.city}, {request.state}</span>
            </div>
            {request.property_type && (
              <span className="capitalize">• {request.property_type}</span>
            )}
            {request.bedrooms && request.bathrooms && (
              <span>• {request.bedrooms} bed / {request.bathrooms} bath</span>
            )}
          </div>

          {request.notes && (
            <p className="mt-2 text-sm text-white/70 line-clamp-1">{request.notes}</p>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
            <Calendar size={12} />
            <span>Updated {timeAgo}</span>
          </div>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold
            ${status.color === 'emerald' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'}
            ${status.color === 'amber' && 'bg-amber-500/10 border-amber-500/20 text-amber-300'}
            ${status.color === 'violet' && 'bg-violet-500/10 border-violet-500/20 text-violet-300'}
            ${status.color === 'red' && 'bg-red-500/10 border-red-500/20 text-red-300'}
          `}>
            {status.icon}
            {status.label}
          </span>

          <Link
            href={`/requests/${request.id}`}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <Eye size={16} className="inline mr-1" /> View
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ searchQuery, statusFilter }: { searchQuery: string; statusFilter: string }) {
  const hasFilters = searchQuery || statusFilter !== "all";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
      <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
        {hasFilters ? <Search size={32} className="text-white/40" /> : <FileText size={32} className="text-white/40" />}
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">
        {hasFilters ? "No requests found" : "No requests yet"}
      </h3>
      <p className="mb-6 text-white/60">
        {hasFilters 
          ? "Try adjusting your filters or search query"
          : "Start by submitting your first property verification request"}
      </p>
      {!hasFilters && (
        <Link
          href="/request-verification"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <Plus size={16} /> New Request
        </Link>
      )}
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
