"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp, TrendingDown, DollarSign, Home, AlertCircle,
  Calendar, BarChart3, PieChart, Download
} from "lucide-react";

type PortfolioMetrics = {
  totalDoors: number;
  totalRevenue: number;
  totalProfit: number;
  avgCoc: number;
  avgOccupancy: number;
  revenueChange: number;
  profitChange: number;
};

type PropertyPerformance = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  occupancy: number;
  trend: "up" | "down" | "stable";
  alert?: string;
};

export default function PortfolioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"30" | "60" | "90">("30");
  const [metrics, setMetrics] = useState<PortfolioMetrics>({
    totalDoors: 0,
    totalRevenue: 0,
    totalProfit: 0,
    avgCoc: 0,
    avgOccupancy: 0,
    revenueChange: 0,
    profitChange: 0,
  });
  const [properties, setProperties] = useState<PropertyPerformance[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      loadPortfolioData();
    }
  }, [timeframe, loading]);

  async function checkAuth() {
    // ...existing code...
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
  }

  function loadPortfolioData() {
    // Mock data - replace with real API calls
    const mockMetrics: PortfolioMetrics = {
      totalDoors: 15,
      totalRevenue: 52840,
      totalProfit: 23120,
      avgCoc: 36,
      avgOccupancy: 76,
      revenueChange: 12.5,
      profitChange: 8.3,
    };

    const mockProperties: PropertyPerformance[] = [
      {
        id: "1",
        name: "Downtown Loft",
        address: "301 West Avenue",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        latitude: 30.2672,
        longitude: -97.7431,
        monthlyRevenue: 4250,
        monthlyProfit: 1850,
        occupancy: 82,
        trend: "up",
      },
      {
        id: "2",
        name: "Sunset Villa",
        address: "1845 Bayshore Boulevard",
        city: "Tampa",
        state: "FL",
        zipCode: "33606",
        latitude: 27.9506,
        longitude: -82.4572,
        monthlyRevenue: 3890,
        monthlyProfit: 1620,
        occupancy: 76,
        trend: "up",
      },
      {
        id: "3",
        name: "Music City Condo",
        address: "215 Broadway",
        city: "Nashville",
        state: "TN",
        zipCode: "37201",
        latitude: 36.1627,
        longitude: -86.7816,
        monthlyRevenue: 3650,
        monthlyProfit: 1580,
        occupancy: 71,
        trend: "stable",
      },
      {
        id: "4",
        name: "Beach House",
        address: "6789 Gulf Boulevard",
        city: "Tampa",
        state: "FL",
        zipCode: "33706",
        latitude: 27.7676,
        longitude: -82.7857,
        monthlyRevenue: 3420,
        monthlyProfit: 1320,
        occupancy: 68,
        trend: "down",
        alert: "Occupancy below forecast",
      },
      {
        id: "5",
        name: "Riverside Retreat",
        address: "412 Colorado Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        latitude: 30.2656,
        longitude: -97.7467,
        monthlyRevenue: 4650,
        monthlyProfit: 2100,
        occupancy: 88,
        trend: "up",
      },
      {
        id: "6",
        name: "Desert Oasis",
        address: "2334 East Camelback Road",
        city: "Phoenix",
        state: "AZ",
        zipCode: "85016",
        latitude: 33.5092,
        longitude: -112.0396,
        monthlyRevenue: 3200,
        monthlyProfit: 1450,
        occupancy: 79,
        trend: "stable",
      },
      {
        id: "7",
        name: "Mountain View Lodge",
        address: "1875 Larimer Street",
        city: "Denver",
        state: "CO",
        zipCode: "80202",
        latitude: 39.7539,
        longitude: -104.9971,
        monthlyRevenue: 4100,
        monthlyProfit: 1780,
        occupancy: 73,
        trend: "up",
      },
      {
        id: "8",
        name: "Historic Bungalow",
        address: "1456 12th Avenue South",
        city: "Nashville",
        state: "TN",
        zipCode: "37203",
        latitude: 36.1445,
        longitude: -86.7892,
        monthlyRevenue: 2890,
        monthlyProfit: 1240,
        occupancy: 65,
        trend: "down",
        alert: "Below average performance",
      },
      {
        id: "9",
        name: "Lakefront Estate",
        address: "7823 Turkey Lake Road",
        city: "Orlando",
        state: "FL",
        zipCode: "32819",
        latitude: 28.4589,
        longitude: -81.4756,
        monthlyRevenue: 5200,
        monthlyProfit: 2350,
        occupancy: 91,
        trend: "up",
      },
      {
        id: "10",
        name: "Urban Studio",
        address: "98 Rainey Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        latitude: 30.2589,
        longitude: -97.7389,
        monthlyRevenue: 2100,
        monthlyProfit: 920,
        occupancy: 84,
        trend: "stable",
      },
      {
        id: "11",
        name: "Scottsdale Villa",
        address: "7114 East Stetson Drive",
        city: "Phoenix",
        state: "AZ",
        zipCode: "85251",
        latitude: 33.4942,
        longitude: -111.9261,
        monthlyRevenue: 3800,
        monthlyProfit: 1650,
        occupancy: 77,
        trend: "up",
      },
      {
        id: "12",
        name: "Gulf Coast Paradise",
        address: "3456 Beach Drive NE",
        city: "Tampa",
        state: "FL",
        zipCode: "33701",
        latitude: 27.7676,
        longitude: -82.6403,
        monthlyRevenue: 4500,
        monthlyProfit: 1950,
        occupancy: 81,
        trend: "up",
      },
      {
        id: "13",
        name: "Capitol View Apartment",
        address: "625 Lincoln Street",
        city: "Denver",
        state: "CO",
        zipCode: "80203",
        latitude: 39.7267,
        longitude: -104.9811,
        monthlyRevenue: 3100,
        monthlyProfit: 1380,
        occupancy: 70,
        trend: "stable",
      },
      {
        id: "14",
        name: "Southern Charm Cottage",
        address: "2308 Franklin Pike",
        city: "Nashville",
        state: "TN",
        zipCode: "37204",
        latitude: 36.1156,
        longitude: -86.7967,
        monthlyRevenue: 2650,
        monthlyProfit: 1150,
        occupancy: 62,
        trend: "down",
        alert: "Maintenance issues reported",
      },
      {
        id: "15",
        name: "Tech District Loft",
        address: "500 East 4th Street",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        latitude: 30.2645,
        longitude: -97.7389,
        monthlyRevenue: 3890,
        monthlyProfit: 1680,
        occupancy: 86,
        trend: "up",
      },
    ];

    setMetrics(mockMetrics);
    setProperties(mockProperties);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading portfolio...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Portfolio</span>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white md:text-4xl flex items-center gap-3">
              <PieChart className="text-emerald-400" size={32} />
              Portfolio Analytics
            </h1>
            <p className="mt-1 text-white/60">
              Track performance across {metrics.totalDoors} active properties
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white"
            >
              <option value="30" className="bg-[#0b141d]">Last 30 Days</option>
              <option value="60" className="bg-[#0b141d]">Last 60 Days</option>
              <option value="90" className="bg-[#0b141d]">Last 90 Days</option>
            </select>
            <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              <Download size={16} className="inline mr-2" />
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Home size={20} />}
          label="Total Doors"
          value={metrics.totalDoors.toString()}
          change={null}
          color="text-emerald-400"
        />
        <MetricCard
          icon={<DollarSign size={20} />}
          label="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          change={metrics.revenueChange}
          color="text-emerald-400"
        />
        <MetricCard
          icon={<TrendingUp size={20} />}
          label="Total Profit"
          value={`$${metrics.totalProfit.toLocaleString()}`}
          change={metrics.profitChange}
          color="text-emerald-400"
        />
        <MetricCard
          icon={<BarChart3 size={20} />}
          label="Avg Occupancy"
          value={`${metrics.avgOccupancy}%`}
          change={null}
          color="text-emerald-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 mb-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Revenue Trend</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {[3200, 3450, 3680, 3890, 4120, 4250, 4180, 4350].map((val, i) => (
              <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-lg relative" style={{ height: `${(val / 4500) * 100}%` }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/60">
                  ${Math.round(val/100)/10}k
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-white/50">
            <span>Week 1</span>
            <span>Week 8</span>
          </div>
        </div>

        {/* Performance by Market */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Performance by Market</h2>
          <div className="space-y-4">
            {[
              { city: "Austin, TX", revenue: 8900, doors: 3 },
              { city: "Tampa, FL", revenue: 7310, doors: 2 },
              { city: "Nashville, TN", revenue: 6540, doors: 2 },
              { city: "Phoenix, AZ", revenue: 5700, doors: 1 },
            ].map((market) => (
              <div key={market.city} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{market.city}</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      ${market.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(market.revenue / 8900) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-white/50">{market.doors} doors</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Performance Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-white mb-4">Property Performance</h2>
        {/* Search & Filters */}
        <section className="mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search markets..."
                className="w-full rounded-xl border border-white/10 bg-white/5 pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          </div>
        </section>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 text-left text-xs font-medium text-white/60">Property</th>
                <th className="pb-3 text-left text-xs font-medium text-white/60">Location</th>
                <th className="pb-3 text-right text-xs font-medium text-white/60">Revenue</th>
                <th className="pb-3 text-right text-xs font-medium text-white/60">Profit</th>
                <th className="pb-3 text-right text-xs font-medium text-white/60">Occupancy</th>
                <th className="pb-3 text-center text-xs font-medium text-white/60">Trend</th>
                <th className="pb-3 text-center text-xs font-medium text-white/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {properties
                .filter(property => property.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((property) => (
                <tr key={property.id} className="border-b border-white/10 last:border-0">
                  <td className="py-4 text-sm font-semibold text-white">{property.name}</td>
                  <td className="py-4 text-sm text-white/70">
                    {property.address}<br />
                    <span className="text-xs text-white/50">{property.city}, {property.state} {property.zipCode}</span>
                  </td>
                  <td className="py-4 text-right text-sm text-white">${property.monthlyRevenue.toLocaleString()}</td>
                  <td className="py-4 text-right text-sm text-emerald-400">${property.monthlyProfit.toLocaleString()}</td>
                  <td className="py-4 text-right text-sm text-white">{property.occupancy}%</td>
                  <td className="py-4 text-center">
                    {property.trend === "up" && <TrendingUp size={16} className="inline text-emerald-400" />}
                    {property.trend === "down" && <TrendingDown size={16} className="inline text-red-400" />}
                    {property.trend === "stable" && <span className="text-white/40">—</span>}
                  </td>
                  <td className="py-4 text-center">
                    {property.alert ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <AlertCircle size={14} />
                        {property.alert}
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-400">On Track</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, change, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: number | null;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <span className="text-xs font-medium text-white/60">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {change !== null && (
        <div className={`text-xs flex items-center gap-1 ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change)}% vs last period
        </div>
      )}
    </div>
  );
}