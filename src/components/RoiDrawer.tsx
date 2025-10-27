"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, TrendingUp, DollarSign, Calendar, Sparkles } from "lucide-react";

export type RoiDrawerProps = {
  open: boolean;
  onClose: () => void;
  propertyId?: string | null;
  name?: string;
  city?: string;
  state?: string;
  beds?: number;
  baths?: number;
  adrInitial?: number;
  occInitial?: number; // 0-1
  expenseInitial?: number; // 0-1
};

export default function RoiDrawer({
  open,
  onClose,
  propertyId,
  name,
  city,
  state,
  beds,
  baths,
  adrInitial,
  occInitial,
  expenseInitial,
}: RoiDrawerProps) {
  const [adr, setAdr] = useState<number>(adrInitial ?? 150);
  const [occPct, setOccPct] = useState<number>(Math.round((occInitial ?? 0.75) * 100)); // percent 0-100
  const [expensePct, setExpensePct] = useState<number>(Math.round((expenseInitial ?? 0.25) * 100)); // percent 0-100
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      // reset toast when opening
      setToast(null);
      // focus trap: simple focus to drawer
      setTimeout(() => drawerRef.current?.focus(), 50);
    }
  }, [open]);

  // Calculations
  const occ = Math.max(0, Math.min(100, occPct));
  const expense = Math.max(0, Math.min(100, expensePct));
  const monthlyRevenue = Math.round(adr * ((occ / 100) * 30));
  const annualRevenue = monthlyRevenue * 12;
  const revPAN = Math.round(adr * (occ / 100)); // revenue per available night (simple)
  const netMonthly = Math.round(monthlyRevenue * (1 - expense / 100));

  async function handleSave() {
    if (!propertyId) {
      setToast({ type: "error", message: "Missing property id" });
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const body = {
        adr: Number(adr),
        occ: Number(occ) / 100, // API expects 0-1
        expenseRate: Number(expense) / 100,
      };
      const res = await fetch(`/api/roi/${propertyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.error || j?.message || "Failed to save ROI");
      }
      setToast({ type: "success", message: "ROI estimates saved" });
      // small delay to allow user to see toast, then close
      setTimeout(() => {
        setToast(null);
        onClose();
      }, 900);
    } catch (err: any) {
      setToast({ type: "error", message: err?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      ref={drawerRef}
      tabIndex={-1}
      className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-[#071019] border-l border-white/10 p-4 shadow-2xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{name ?? "Property ROI"}</h3>
          <p className="text-xs text-white/60">
            {city && state ? `${city}, ${state}` : "Estimate revenue & returns"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setToast(null);
              onClose();
            }}
            className="text-white/60 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/60">Average Daily Rate (ADR)</label>
          <input
            type="number"
            value={String(adr)}
            onChange={(e) => setAdr(Number(e.target.value || 0))}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white"
            min={0}
          />
        </div>

        <div>
          <label className="text-xs text-white/60">Occupancy (%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={occPct}
            onChange={(e) => setOccPct(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-white/60 mt-1">{occPct}%</div>
        </div>

        <div>
          <label className="text-xs text-white/60">Expense Rate (%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={expensePct}
            onChange={(e) => setExpensePct(Number(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-white/60 mt-1">{expensePct}% of revenue</div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between text-sm text-white/60">
            <span>Monthly Revenue (est)</span>
            <span className="font-semibold text-white">${monthlyRevenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/60 mt-1">
            <span>Annual Revenue (est)</span>
            <span className="font-semibold text-white">${annualRevenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/60 mt-1">
            <span>Net Monthly (after expenses)</span>
            <span className="font-semibold text-emerald-400">${netMonthly.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/60 mt-1">
            <span>RevPAN (simple)</span>
            <span className="font-semibold text-white">${revPAN}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Estimates"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(
                `${name ?? "Property"} — ADR $${adr} · Occ ${occPct}% · Expense ${expensePct}%`
              );
              setToast({ type: "success", message: "Copied to clipboard" });
              setTimeout(() => setToast(null), 2000);
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Share
          </button>
        </div>

        {toast && (
          <div
            role="status"
            className={`rounded-md p-2 text-sm ${toast.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
              }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}