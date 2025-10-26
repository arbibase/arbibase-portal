import PortalHero, { Inside } from "@/components/PortalHero";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <Header />
      <PortalHero />
      <Inside />
      <footer className="border-t border-white/10 bg-[#0a141d] py-8">
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-6 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} ArbiBase. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="hover:text-white" href="https://arbibase.com/privacy">Privacy</a>
            <a className="hover:text-white" href="https://arbibase.com/terms">Terms</a>
            <a className="hover:text-white" href="https://www.linkedin.com/company/arbibase/">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

const Header = () => {
  return (
    <header className="mx-auto max-w-[980px] px-6 py-6">
      <div className="flex items-center justify-between">
        <a href="/" className="font-semibold text-lg">ArbiBase</a>
        <nav className="flex gap-4 text-sm text-slate-300">
          <a href="/about" className="hover:text-white">About</a>
          <a href="/pricing" className="hover:text-white">Pricing</a>
          <a href="/contact" className="hover:text-white">Contact</a>
        </nav>
      </div>
    </header>
  );
};

