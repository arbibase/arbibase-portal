"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Search, Bell, MapPin, Calculator, 
  BarChart3, Gift, FileText, Users, Settings, Building2
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/saved-searches", label: "Saved Searches", icon: Bell },
  { href: "/properties/map", label: "Map View", icon: MapPin },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calculators", label: "Calculators", icon: Calculator },
  { href: "/market-reports", label: "Reports", icon: FileText },
  { href: "/referrals", label: "Referrals", icon: Gift },
  { href: "/team", label: "Team", icon: Users },
  { href: "/account", label: "Settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-[#0b141d] p-4 overflow-y-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500 p-2">
            <Building2 size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">Arbibase</span>
        </Link>
      </div>

      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
