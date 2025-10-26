"use client";

import Link from "next/link";
import Image from "next/image";
import { List, X } from "@phosphor-icons/react";
import { useState, useEffect } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  // Close drawer on route changes / esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#0A121A]/85 backdrop-blur supports-backdrop-filter:bg-[#0A121A]/70">
      <div className="mx-auto flex h-14 w-full max-w-[980px] items-center justify-between px-4 sm:px-6">
<Link href="/" className="flex items-center gap-2">
  <img
    src="/arbibase-logo.svg"
    alt="ArbiBase Logo"
    className="h-6 w-auto object-contain"
  />
</Link>


        {/* Desktop nav */}
        <nav className="hidden gap-6 text-sm text-slate-200 md:flex">
          <a className="hover:text-white" href="https://www.arbibase.com/about-us">About</a>
          <a className="hover:text-white" href="https://www.arbibase.com/pricing/">Pricing</a>
          <a className="hover:text-white" href="https://www.arbibase.com/about-us#contact">Contact</a>
        </nav>

        {/* Mobile trigger */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-200 hover:bg-white/5 md:hidden"
        >
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden transition-[max-height,opacity] duration-300 ease-out overflow-hidden ${
          open ? "max-h-44 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="mx-auto grid w-full max-w-[980px] gap-1 px-4 pb-4 sm:px-6">
          <a onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5" href="https://www.arbibase.com/about-us">About</a>
          <a onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5" href="https://www.arbibase.com/pricing/">Pricing</a>
          <a onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/5" href="https://www.arbibase.com/about-us#contact">Contact</a>
        </nav>
      </div>
    </header>
  );
}
