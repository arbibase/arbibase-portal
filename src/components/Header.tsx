"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SignOut, User } from "@phosphor-icons/react";

export default function Header() {
  const [authed, setAuthed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setAuthed(!!data?.user);
    })();
  }, []);

  async function signOut() {
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="mx-auto max-w-[1140px] px-6">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Logo - FIXED */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-linear-to-br from-emerald-400 to-sky-400 text-xs font-bold text-black">
              A
            </div>
            <span className="text-white/95 font-semibold tracking-[0.2px]">ArbiBase</span>
          </Link>

          {/* Main Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/properties">Browse</NavLink>
            <NavLink href="/requests">Requests</NavLink>
            <NavLink href="/favorites">Favorites</NavLink>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/contact">Contact</NavLink>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <div className="md:hidden">
              <MobileMenu authed={authed} onSignOut={signOut} />
            </div>

            {/* Desktop user menu */}
            {authed && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <User size={16} weight="bold" />
                  <span className="text-white/90">Account</span>
                </button>

                {userMenuOpen && (
                  <div
                    onMouseLeave={() => setUserMenuOpen(false)}
                    className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0b141d]/95 backdrop-blur-xl shadow-lg"
                  >
                    <div className="py-1">
                      <Link href="/account" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                        Profile
                      </Link>
                      <Link href="/billing" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                        Billing
                      </Link>
                      <div className="my-1 h-px bg-white/10" />
                      <button
                        onClick={signOut}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white/90 hover:bg-white/5"
                      >
                        <SignOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!authed && (
              <Link
                href="/login"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}

function MobileMenu({ authed, onSignOut }: { authed: boolean; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
      >
        Menu
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed right-4 top-20 z-50 w-56 rounded-xl border border-white/10 bg-[#0b141d] shadow-2xl">
            <nav className="py-2">
              <Link href="/properties" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                Browse
              </Link>
              <Link href="/requests" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                Requests
              </Link>
              <Link href="/favorites" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                Favorites
              </Link>
              <Link href="/dashboard" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                Dashboard
              </Link>
              <Link href="/contact" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                Contact
              </Link>

              {authed && (
                <>
                  <div className="my-1 h-px bg-white/10" />
                  <Link href="/account" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                    Profile
                  </Link>
                  <Link href="/billing" className="block px-4 py-2 text-sm text-white/90 hover:bg-white/5">
                    Billing
                  </Link>
                  <button
                    onClick={onSignOut}
                    className="block w-full px-4 py-2 text-left text-sm text-white/90 hover:bg-white/5"
                  >
                    Sign out
                  </button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
