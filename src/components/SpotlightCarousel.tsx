"use client";

import { useRef, useState } from "react";
import { Star, TrendingUp } from "lucide-react";
import RoiDrawer from "./RoiDrawer";

export type SpotlightCard = {
  name: string;
  location: string;
  status: string;
  summary: string;
  photo?: string;
};

export default function SpotlightCarousel({ items }: { items: SpotlightCard[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [roiDrawer, setRoiDrawer] = useState<{ open: boolean; property: any }>({ 
    open: false, 
    property: null 
  });

  const handleOpenRoi = (property: any) => {
    setRoiDrawer({ open: true, property });
  };

  return (
    <>
      <div className="relative">
        <div ref={scroller} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((p) => (
            <article
              key={p.name + p.location}
              className="min-w-[320px] max-w-[320px] overflow-hidden rounded-2xl border border-white/10 bg-white/5"
            >
              {p.photo ? (
                <img src={p.photo} alt={p.name} className="h-40 w-full object-cover" />
              ) : (
                <div className="h-40 w-full bg-linear-to-br from-sky-800/40 to-emerald-800/40" />
              )}
              <div className="p-4">
                <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {p.status}
                </div>
                <h3 className="mt-1 text-base font-semibold">{p.name}</h3>
                <p className="text-xs text-white/60">{p.location}</p>
                
                {/* ROI Line - NEW */}
                {(p as any).revenue_monthly_est ? (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-emerald-400">
                    <TrendingUp size={14} />
                    <span className="font-semibold">
                      Projected: {new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: 'USD', 
                        minimumFractionDigits: 0 
                      }).format((p as any).revenue_monthly_est)}/mo
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenRoi(p)}
                    className="mt-2 text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    data-event="spotlight-roi-open"
                  >
                    <TrendingUp size={14} />
                    Run ROI →
                  </button>
                )}

                <p className="mt-2 line-clamp-2 text-sm text-white/70">{p.summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
                    View
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
                    <Star size={12} /> Save
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

      {/* arrows (optional) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-[#071019] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-lrom-[#071019] to-transparent" />
    </div>

      {/* ROI Drawer */}
      {roiDrawer.open && roiDrawer.property && (
        <RoiDrawer
          open={roiDrawer.open}
          onClose={() => setRoiDrawer({ open: false, property: null })}
          propertyId={(roiDrawer.property as any).id || 'demo'}
          name={roiDrawer.property.name}
          city={(roiDrawer.property as any).city}
          state={(roiDrawer.property as any).state}
          beds={(roiDrawer.property as any).beds}
          baths={(roiDrawer.property as any).baths}
          adrInitial={(roiDrawer.property as any).adr_estimate}
          occInitial={(roiDrawer.property as any).occ_estimate}
          expenseInitial={(roiDrawer.property as any).expense_rate}
        />
      )}
    </>
  );
}
