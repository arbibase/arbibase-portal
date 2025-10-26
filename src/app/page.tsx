import Link from "next/link";
import Image from "next/image";
import PortalHero from "@/components/PortalHero";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <Header />
      <PortalHero />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="mx-auto max-w-[1100px] px-6 py-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          aria-label="ArbiBase home"
          className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
        >
          {/* swap path if your logo file is different */}
          <Image
            src="/arbibase-logo.svg"
            alt="ArbiBase"
            width={140}
            height={28}
            priority
          />
        </Link>

        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <a href="https://www.arbibase.com/about-us" className="hover:text-white">
            About
          </a>
          <a href="https://www.arbibase.com/pricing/" className="hover:text-white">
            Pricing
          </a>
          <a href="https://www.arbibase.com/about-us#contact" className="hover:text-white">
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a141d] py-8">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-6 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} ArbiBase. All rights reserved.</p>

        <div className="flex items-center gap-5">
          <a href="https://arbibase.com/privacy" className="hover:text-white">Privacy</a>
          <span className="opacity-30">•</span>
          <a href="https://arbibase.com/terms" className="hover:text-white">Terms</a>
          <span className="opacity-30">•</span>
          <a href="https://arbibase.com/pvd" className="hover:text-white">PVD</a>
        </div>

        {/* Socials */}
        <div className="flex items-center gap-4">
          <a aria-label="X" href="https://x.com/arbibase" className="hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M18.244 2H21l-7.5 8.57L22 22h-6.293l-4.91-6.02L5.2 22H2.444l7.968-9.11L2 2h6.41l4.453 5.46L18.244 2z"/></svg>
          </a>
          <a aria-label="LinkedIn" href="https://www.linkedin.com/company/arbibase/" className="hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7.5 0h4.8v2.2h.07c.67-1.2 2.3-2.46 4.73-2.46 5.06 0 5.99 3.33 5.99 7.66V24h-5V16.5c0-1.79-.03-4.1-2.5-4.1-2.5 0-2.88 1.95-2.88 3.97V24h-5V8z"/></svg>
          </a>
          <a aria-label="Instagram" href="https://www.instagram.com/arbibase" className="hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.2 2.4.4.6.2 1 .4 1.5.9.5.5.7.9.9 1.5.2.5.3 1.2.4 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.9-.4 2.4-.2.6-.4 1-.9 1.5-.5.5-.9.7-1.5.9-.5.2-1.2.3-2.4.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.2-2.4-.4-.6-.2-1-.4-1.5-.9-.5-.5-.7-.9-.9-1.5-.2-.5-.3-1.2-.4-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.9.4-2.4.2-.6.4-1 .9-1.5.5-.5.9-.7 1.5-.9.5-.2 1.2-.3 2.4-.4C8.4 2.2 8.8 2.2 12 2.2m0 1.8c-3.1 0-3.5 0-4.7.1-1 .1-1.6.2-2 .4-.5.2-.8.4-1.1.7-.3.3-.5.6-.7 1.1-.2.4-.3 1-.4 2-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1 .2 1.6.4 2 .2.5.4.8.7 1.1.3.3.6.5 1.1.7.4.2 1 .3 2 .4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1-.1 1.6-.2 2-.4.5-.2.8-.4 1.1-.7.3-.3.5-.6.7-1.1.2-.4.3-1 .4-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1-.2-1.6-.4-2-.2-.5-.4-.8-.7-1.1-.3-.3-.6-.5-1.1-.7-.4-.2-1-.3-2-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a6.9 6.9 0 1 1 0 13.8 6.9 6.9 0 0 1 0-13.8zm0 11.4a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm5-11.9a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2z"/></svg>
          </a>
          <a aria-label="YouTube" href="https://www.youtube.com/@arbibase" className="hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.6 12 3.6 12 3.6s-7.4 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .5 9.4.5 9.4.5s7.4 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5V8.5L15.8 12l-6.2 3.5z"/></svg>
          </a>
          <a aria-label="TikTok" href="https://www.tiktok.com/@arbibase" className="hover:text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M16.7 2h3.1c.1 1.8 1.2 3.3 3.2 3.9v3.2c-1.2 0-2.5-.3-3.6-.9v6.7c0 4-3.2 7.1-7.2 7.1S5 18.9 5 14.9c0-3.7 2.7-6.7 6.2-7.1v3.3a3.8 3.8 0 1 0 2.8 3.7V2z"/></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
