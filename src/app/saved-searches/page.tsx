"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Bell, Search, Trash2, Edit, Plus, MapPin, DollarSign, Home, Calendar, Mail, Smartphone } from "lucide-react";

interface SavedSearch {
  id: string;
  name: string;
  criteria: {
    location?: string;
    min_price?: number;
    max_price?: number;
    property_type?: string;
    min_roi?: number;
    bedrooms?: number;
  };
  alert_frequency: "instant" | "daily" | "weekly" | "off";
  alert_methods: {
    email: boolean;
    sms: boolean;
  };
  created_at: string;
  match_count?: number;
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);

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
    await loadSearches();
    setLoading(false);
  }

  async function loadSearches() {
    if (!supabase) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return;

    const { data, error } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setSearches(data);
    }
  }

  async function deleteSearch(id: string) {
    if (!confirm("Delete this saved search?")) return;
    if (!supabase) return;

    const { error } = await supabase
      .from("saved_searches")
      .delete()
      .eq("id", id);

    if (!error) {
      setSearches(searches.filter(s => s.id !== id));
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading saved searches...</p>
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
            <span className="text-white/90">Saved Searches</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl">
            Saved Searches & Alerts
          </h1>
          <p className="mt-1 text-white/60">Get notified when properties match your criteria</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          <Plus size={18} />
          Create Search
        </button>
      </header>

      {/* Searches Grid */}
      {searches.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <Search size={48} className="mx-auto mb-4 text-white/20" />
          <h3 className="text-lg font-bold text-white mb-2">No saved searches yet</h3>
          <p className="text-sm text-white/60 mb-6">
            Create a search to get notified when properties match your criteria
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            <Plus size={18} />
            Create Your First Search
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {searches.map((search) => (
            <SavedSearchCard
              key={search.id}
              search={search}
              onEdit={() => {
                setEditingSearch(search);
                setShowCreateModal(true);
              }}
              onDelete={() => deleteSearch(search.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <SavedSearchModal
          search={editingSearch}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSearch(null);
          }}
          onSave={async () => {
            await loadSearches();
            setShowCreateModal(false);
            setEditingSearch(null);
          }}
        />
      )}
    </div>
  );
}

function SavedSearchCard({ search, onEdit, onDelete }: {
  search: SavedSearch;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const frequencyLabels = {
    instant: "Instant alerts",
    daily: "Daily digest",
    weekly: "Weekly digest",
    off: "Alerts off"
  };

  const frequencyColors = {
    instant: "text-emerald-300",
    daily: "text-blue-300",
    weekly: "text-violet-300",
    off: "text-white/40"
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/8 transition-all">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{search.name}</h3>
          <p className={`text-xs font-medium ${frequencyColors[search.alert_frequency]}`}>
            <Bell size={12} className="inline mr-1" />
            {frequencyLabels[search.alert_frequency]}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Criteria */}
      <div className="space-y-2 mb-4">
        {search.criteria.location && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <MapPin size={14} />
            <span>{search.criteria.location}</span>
          </div>
        )}
        {(search.criteria.min_price || search.criteria.max_price) && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <DollarSign size={14} />
            <span>
              ${(search.criteria.min_price || 0).toLocaleString()} - ${(search.criteria.max_price || 999999).toLocaleString()}
            </span>
          </div>
        )}
        {search.criteria.property_type && (
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Home size={14} />
            <span>{search.criteria.property_type}</span>
          </div>
        )}
      </div>

      {/* Alert Methods */}
      <div className="flex items-center gap-2 pt-4 border-t border-white/10">
        {search.alert_methods.email && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-300">
            <Mail size={10} /> Email
          </span>
        )}
        {search.alert_methods.sms && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
            <Smartphone size={10} /> SMS
          </span>
        )}
        {search.match_count !== undefined && (
          <span className="ml-auto text-xs text-white/50">
            {search.match_count} matches
          </span>
        )}
      </div>
    </div>
  );
}

function SavedSearchModal({ search, onClose, onSave }: {
  search: SavedSearch | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: search?.name || "",
    location: search?.criteria.location || "",
    min_price: search?.criteria.min_price || "",
    max_price: search?.criteria.max_price || "",
    property_type: search?.criteria.property_type || "",
    min_roi: search?.criteria.min_roi || "",
    alert_frequency: search?.alert_frequency || "daily",
    alert_email: search?.alert_methods.email ?? true,
    alert_sms: search?.alert_methods.sms ?? false
  });

  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: user } = await supabase!.auth.getUser();
    if (!user?.user) return;

    const payload = {
      user_id: user.user.id,
      name: formData.name,
      criteria: {
        location: formData.location || undefined,
        min_price: formData.min_price ? Number(formData.min_price) : undefined,
        max_price: formData.max_price ? Number(formData.max_price) : undefined,
        property_type: formData.property_type || undefined,
        min_roi: formData.min_roi ? Number(formData.min_roi) : undefined
      },
      alert_frequency: formData.alert_frequency,
      alert_methods: {
        email: formData.alert_email,
        sms: formData.alert_sms
      }
    };

    if (search) {
      await supabase!.from("saved_searches").update(payload).eq("id", search.id);
    } else {
      await supabase!.from("saved_searches").insert(payload);
    }

    setSaving(false);
    onSave();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b141d] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            {search ? "Edit Search" : "Create Saved Search"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Search Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="e.g., Austin Under $500K"
                required
              />
            </div>

            {/* Search Criteria */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Search Criteria</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                    placeholder="City or ZIP"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                  >
                    <option value="">Any</option>
                    <option value="single-family">Single Family</option>
                    <option value="multi-family">Multi-Family</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Min Price</label>
                  <input
                    type="number"
                    value={formData.min_price}
                    onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Max Price</label>
                  <input
                    type="number"
                    value={formData.max_price}
                    onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Min ROI (%)</label>
                  <input
                    type="number"
                    value={formData.min_roi}
                    onChange={(e) => setFormData({ ...formData, min_roi: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            {/* Alert Settings */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white mb-4">Alert Settings</h3>
              
              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-2">Frequency</label>
                <select
                  value={formData.alert_frequency}
                  onChange={(e) => setFormData({ ...formData, alert_frequency: e.target.value as any })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white text-sm"
                >
                  <option value="instant">Instant (as they're listed)</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                  <option value="off">No alerts</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.alert_email}
                    onChange={(e) => setFormData({ ...formData, alert_email: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500"
                  />
                  <span className="text-sm text-white/90">Email notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.alert_sms}
                    onChange={(e) => setFormData({ ...formData, alert_sms: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500"
                  />
                  <span className="text-sm text-white/90">SMS notifications (premium)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : search ? "Update Search" : "Create Search"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
