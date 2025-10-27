"use client";

import { useState, useEffect, useRef } from "react";
import { X, TrendingUp, DollarSign, Calendar, Sparkles } from "lucide-react";

type RoiDrawerProps = {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  name: string;
  city?: string;
  state?: string;
  beds?: number;
  baths?: number;
  adrInitial?: number | null;
  occInitial?: number | null;
  expenseInitial?: number | null;
}

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
  expenseInitial
}: RoiDrawerProps) {
  const [adr, setAdr] = useState(adrInitial || 150);
  const [occ, setOcc] = useState((occInitial || 0.75) * 100); // Convert to percentage
  const [expense, setExpense] = useState((expenseInitial || 0.25) * 100);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Calculate live metrics
  const monthlyRevenue = Math.round(adr * ((occ / 100) * 30));
  const annualRevenue = monthlyRevenue * 12;
  const revPAN = Math.round(adr * (occ / 100));

  // Mock seasonality data (12 months scaled to monthly revenue)
  const seasonality = [0.8, 0.85, 0.95, 1.0, 1.1, 1.15, 1.2, 1.15, 1.0, 0.9, 0.85, 0.9].map(
    factor => monthlyRevenue * factor
  );

  // Focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);

    try {
      const response = await fetch(`/api/roi/${propertyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adr,
          occ: occ / 100, // Convert back to 0-1
          expenseRate: expense / 100
        })
      });

      if (!response.ok) throw new Error('Failed to save');

      setToast({ type: 'success', message: 'ROI estimates saved successfully!' });
      
      // Auto-close toast after 3s
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to save ROI estimates. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleShareWithCoach = () => {
    // TODO: Implement signed link generation
    const link = `${window.location.origin}/properties/${propertyId}?view=roi`;
    navigator.clipboard.writeText(link);
    setToast({ type: 'success', message: 'Link copied to clipboard!' });
    setTimeout(() => setToast(null), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-end" role="dialog" aria-modal="true" aria-labelledby="roi-drawer-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Drawer */}
      <div 
        ref={drawerRef}
        className="relative h-full w-full max-w-[520px] overflow-y-auto rounded-l-2xl border-l border-white/10 bg-[#0b141d]/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0b141d]/90 backdrop-blur-xl px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="roi-drawer-title" className="text-xl font-bold text-white">Analyze ROI</h2>
              <p className="text-sm text-white/60">{name}</p>
              {city && state && (
                <p className="text-xs text-white/50">{city}, {state}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close ROI drawer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Property Info */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-4 text-sm text-white/70">
              <div>
                <span className="text-white font-semibold">{beds || 0}</span> bed
              </div>
              <div className="h-4 w-px bg-white/20" />
              <div>
                <span className="text-white font-semibold">{baths || 0}</span> bath
              </div>
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div className={`rounded-xl border p-4 ${
              toast.type === 'success' 
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' 
                : 'border-red-500/20 bg-red-500/10 text-red-300'
            }`}>
              {toast.message}
            </div>
          )}

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label htmlFor="adr-input" className="mb-2 block text-sm font-medium text-white">
                ADR ($/night)
              </label>
              <input
                id="adr-input"
                type="number"
                value={adr}
                onChange={(e) => setAdr(Number(e.target.value))}
                min="0"
                max="1000"
                className="input"
                aria-label="Average Daily Rate"
                data-event="roi-adr-edit"
              />
            </div>

            <div>
              <label htmlFor="occ-slider" className="mb-2 block text-sm font-medium text-white">
                Occupancy: {occ.toFixed(0)}%
              </label>
              <input
                id="occ-slider"
                type="range"
                value={occ}
                onChange={(e) => setOcc(Number(e.target.value))}
                min="0"
                max="100"
                step="1"
                className="w-full"
                aria-label="Occupancy percentage"
                data-event="roi-occ-edit"
              />
              <div className="mt-1 flex justify-between text-xs text-white/50">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label htmlFor="expense-slider" className="mb-2 block text-sm font-medium text-white">
                Expense Rate: {expense.toFixed(0)}%
              </label>
              <input
                id="expense-slider"
                type="range"
                value={expense}
                onChange={(e) => setExpense(Number(e.target.value))}
                min="0"
                max="100"
                step="1"
                className="w-full"
                aria-label="Expense rate percentage"
                data-event="roi-expense-edit"
              />
              <div className="mt-1 flex justify-between text-xs text-white/50">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Live Outputs */}
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm text-emerald-300 mb-1">
                <DollarSign size={14} />
                <span className="font-medium">Monthly Revenue</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(monthlyRevenue)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                  <Calendar size={12} />
                  <span>Annual Revenue</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(annualRevenue)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-white/60 mb-1">
                  <TrendingUp size={12} />
                  <span>RevPAN</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${revPAN}
                </p>
              </div>
            </div>
          </div>

          {/* Seasonality Sparkline */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
              <Sparkles size={14} />
              <span className="font-medium">Monthly Trend</span>
            </div>
            <svg width="100%" height="60" viewBox="0 0 400 60" className="text-emerald-400">
              <path
                d={`M ${seasonality.map((val, i) => {
                  const x = (i / 11) * 380 + 10;
                  const max = Math.max(...seasonality);
                  const y = 50 - ((val / max) * 40);
                  return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                }).join(' ')}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <p className="text-xs text-white/50 mt-2">Estimated seasonal variation</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-[#041018] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #00e1ff, #3b82f6)' }}
              data-event="roi-save"
            >
              {saving ? 'Saving...' : 'Save ROI'}
            </button>

            <button
              onClick={handleShareWithCoach}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/90 hover:bg-white/10"
              data-event="roi-share"
            >
              Share with Coach
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}