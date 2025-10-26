"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  House, MapPinned, ClipboardList, Star, CreditCard,
  Bell, Menu, X, Search, ChevronDown, LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ShellProps = {
  children: React.ReactNode;
  active?: "overview" | "browse" | "requests" | "favorites" | "billing";
};

export default function AppShell({ children, active = "overview" }: ShellProps) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setAuthed(!!data?.user);
        const full = (data?.user?.user_metadata?.full_name as string) || "";
        setName(full?.split(" ")[0] || data?.user?.email?.split("@")[0] || "");
      } catch {/*ignore*/}
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-dvh bg-[#071019] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1140px] items-center gap-3 px-4">
          <button className="md:hidden -ml-1 p-2 rounded-lg border border-white/10" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>

          <Link href="/" className="flex items-center gap-2">
            {/* keep a little inset so logo never kisses the browser edge */}
            <Image src="/logo-mark.svg" alt="" width={22} height={22} />
            <span className="text-sm font-semibold tracking-wide">ArbiBase</span>
          </Link>

          {/* search */}
          <div className="ml-3 hidden md:flex flex-1 items-center">
            <div className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <Search size={16} className="text-white/60" />
              <input
                placeholder="Search properties or addresses"
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/40"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="relative rounded-lg border border-white/10 bg-white/5 p-2">
              <Bell size={16} />
              {/* example unread ping */}
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </button>

            <div className="group relative">
              <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <div className="h-5 w-5 rounded-full bg-linear-to-tr from-emerald-400/60 to-sky-400/60 ring-1 ring-white/15" />
                <span className="hidden sm:inline text-white/90">{name || "Operator"}</span>
                <ChevronDown size={16} className="opacity-60" />
              </button>
              <div className="invisible absolute right-0 mt-2 w-44 translate-y-1 rounded-xl border border-white/10 bg-[#0c131b] p-1 text-sm opacity-0 shadow-lg transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <Link href="/account" className="block rounded-lg px-3 py-2 hover:bg-white/5">Account</Link>
                <Link href="/billing" className="block rounded-lg px-3 py-2 hover:bg-white/5">Billing</Link>
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/5"
                  onClick={async () => { await supabase?.auth.signOut(); location.href="/login"; }}
                >
                  <LogOut size={14}/> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar (overlay on mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-[#0a121a] p-4 transition md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open && "true"}
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <span className="text-sm font-semibold">Navigation</span>
          <button className="rounded-lg border border-white/10 p-2" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="grid gap-1 text-sm">
          <NavItem href="/dashboard" icon={House} label="Overview" active={active==="overview"} />
          <NavItem href="/properties" icon={MapPinned} label="Browse Properties" active={active==="browse"} />
          <NavItem href="/requests" icon={ClipboardList} label="Property Requests" active={active==="requests"} />
          <NavItem href="/favorites" icon={Star} label="Favorites" active={active==="favorites"} />
          <NavItem href="/billing" icon={CreditCard} label="Account & Billing" active={active==="billing"} />
        </nav>
      </aside>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-[1140px] px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href, icon: Icon, label, active
}: { href: string; icon: any; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${active ? "bg-white/10 border border-white/15" : "hover:bg-white/5 border border-transparent"}`}
    >
      <Icon size={16} className="opacity-80" />
      <span>{label}</span>
    </Link>
  );
}
