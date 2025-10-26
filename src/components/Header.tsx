"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CaretDown, House, Compass, ClipboardText, Star, Layout, SignOut, CreditCard, Phone, Info
} from "@phosphor-icons/react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setAuthed(!!data?.user);
    })();
  }, []);

  async function signOut() {
    try { await supabase?.auth.signOut(); } finally { location.href = "/"; }
  }

return (
  <header className="sticky top-0 z-30 bg-black/50 backdrop-blur-md border-b border-white/10">
    <div className="mx-auto max-w-[1140px] px-6">
      <div className="h-14 flex items-center justify-between">
          {/* Logo (kept away from the chrome edge via container padding) */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-mark.svg" // use your logo file here
              alt="ArbiBase"
              width={22}
              height={22}
              priority
            />
            <span className="text-white/95 font-semibold tracking-[0.2px]">ArbiBase</span>
          </Link>

          {/* Right: menu button */}
          <div className="relative">
            <button
              onClick={() => setOpen((s) => !s)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              Menu <CaretDown size={16} weight="bold" />
            </button>

            {/* Dropdown */}
            {open && (
              <div
                onMouseLeave={() => setOpen(false)}
                className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0b141d]/95 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,.6)]"
              >
                <nav className="py-1">
                  <MenuItem href="/" icon={<House size={16} />}>Home</MenuItem>
                  <MenuItem href="/properties" icon={<Compass size={16} />}>Browse</MenuItem>
                  <MenuItem href="/requests" icon={<ClipboardText size={16} />}>Requests</MenuItem>
                  <MenuItem href="/favorites" icon={<Star size={16} />}>Favorites</MenuItem>
                  <MenuItem href="/dashboard" icon={<Layout size={16} />}>Dashboard</MenuItem>

                  <div className="my-1 h-px bg-white/10" />

                  <MenuItem href="https://www.arbibase.com/pricing/" icon={<CreditCard size={16} />}>Pricing</MenuItem>
                  <MenuItem href="https://www.arbibase.com/about-us" icon={<Info size={16} />}>About</MenuItem>
                  <MenuItem href="https://www.arbibase.com/about-us#contact" icon={<Phone size={16} />}>Contact</MenuItem>

                  {authed && (
                    <>
                      <div className="my-1 h-px bg-white/10" />
                      <button
                        onClick={signOut}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                      >
                        <SignOut size={16} /> Sign out
                      </button>
                    </>
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/5"
      >
        {icon} {children}
      </a>
    );
  }
  return (
    <Link href={href} className="flex items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/5">
      {icon} {children}
    </Link>
  );
}

