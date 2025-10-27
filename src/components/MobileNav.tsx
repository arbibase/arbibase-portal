"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Building2, Bell, MapPin, User } from "lucide-react";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const quickLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/properties", label: "Properties", icon: Building2 },
    { href: "/saved-searches", label: "Alerts", icon: Bell },
    { href: "/properties/map", label: "Map", icon: MapPin },
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0b141d] md:hidden">
        <div className="flex items-center justify-around px-4 py-2">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 ${
                  isActive ? "text-emerald-400" : "text-white/70"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-500 p-2 text-white md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-[#0b141d] md:hidden">
          <div className="flex h-full flex-col p-6 pt-20">
            <nav className="space-y-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-3 text-white"
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
