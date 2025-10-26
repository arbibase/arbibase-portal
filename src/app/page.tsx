// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import PortalHero, { Inside } from "@/components/PortalHero";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <Header />
      <PortalHero />
      <Inside />

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#0a141d] py-10">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} ArbiBase. All rights reserved.
          </p>

          {/* Links + PVD */}
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <a className="hover:text-white" href="https://arbibase.com/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <span className="opacity-30">•</span>
            <a className="hover:text-white" href="https://arbibase.com/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <span className="opacity-30">•</span>
            {/* If “PVD” is a future page, feel free to swap the href later */}
            <a className="hover:text-white" href="https://arbibase.com/pvd" target="_blank" rel="noopener noreferrer">PVD</a>
          </div>

          {/* Social row (Phosphor-style inline SVGs; no extra deps) */}
          <div className="flex items-center gap-4">
            <IconLink label="X" href="https://x.com/arbibase">
              {/* X / Twitter */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2H21l-6.54 7.47L22 22h-6.875l-4.79-6.145L4.82 22H2l7.02-8.02L2 2h6.875l4.33 5.56L18.244 2Zm-2.403 18h1.88L8.266 4h-1.9l9.475 16Z"/>
              </svg>
            </IconLink>
            <IconLink label="LinkedIn" href="https://www.linkedin.com/company/arbibase/">
              {/* LinkedIn */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.34 18H5.67V9.75h2.67V18ZM7 8.47a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1ZM18.33 18h-2.66v-4.28c0-1.02-.02-2.33-1.42-2.33s-1.64 1.11-1.64 2.25V18H9.95V9.75h2.55v1.13h.04a2.8 2.8 0 0 1 2.52-1.38c2.7 0 3.2 1.78 3.2 4.09V18Z"/>
              </svg>
            </IconLink>
            <IconLink label="Instagram" href="https://www.instagram.com/arbibase">
              {/* Instagram */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm8-2.2A2.8 2.8 0 0 0 17.2 2H6.8A2.8 2.8 0 0 0 4 4.8v10.4A2.8 2.8 0 0 0 6.8 18h10.4a2.8 2.8 0 0 0 2.8-2.8V4.8ZM12 16.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm5.1-9.9a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
              </svg>
            </IconLink>
            <IconLink label="YouTube" href="https://www.youtube.com/@arbibase">
              {/* YouTube */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M23 7.1a3.1 3.1 0 0 0-2.18-2.2C18.87 4.5 12 4.5 12 4.5s-6.87 0-8.82.4A3.1 3.1 0 0 0 1 7.1 32.2 32.2 0 0 0 .6 12a32.2 32.2 0 0 0 .6 4.9 3.1 3.1 0 0 0 2.18 2.2c1.95.4 8.82.4 8.82.4s6.87 0 8.82-.4A3.1 3.1 0 0 0 23 16.9 32.2 32.2 0 0 0 23.4 12 32.2 32.2 0 0 0 23 7.1ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z"/>
              </svg>
            </IconLink>
            <IconLink label="TikTok" href="https://www.tiktok.com/@arbibase">
              {/* TikTok */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <path d="M14.5 2h2.1c.3 2.2 1.8 3.9 4 4.2v2.1a6.9 6.9 0 0 1-4-1.2v7.1c0 3.4-2.7 6.2-6.1 6.3a6.2 6.2 0 0 1-6.3-6.2 6.3 6.3 0 0 1 8.5-5.9v2.4a3.6 3.6 0 0 0-5 3.4 3.6 3.6 0 0 0 3.7 3.6 3.5 3.5 0 0 0 3.6-3.5V2Z"/>
              </svg>
            </IconLink>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Header with logo + external nav links */
const Header = () => {
  return (
    <header className="mx-auto max-w-[1100px] px-6 py-6">
      <div className="flex items-center justify-between">
        <a
          href="https://arbibase.com"
          aria-label="ArbiBase website"
          className="inline-flex items-center gap-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src="/arbibase-logo.svg"
            alt="ArbiBase"
            width={140}
            height={28}
            priority
          />
        </a>

        <nav className="flex gap-6 text-sm text-slate-300">
          <a
            href="https://www.arbibase.com/about-us"
            className="hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            About
          </a>
          <a
            href="https://www.arbibase.com/pricing/"
            className="hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pricing
          </a>
          <a
            href="https://www.arbibase.com/about-us#contact"
            className="hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact
          </a>
        </nav>
      </div>
    </header>
  );
};

/** Small helper to make social icons consistent & accessible */
function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
      {children}
    </a>
  );
}
