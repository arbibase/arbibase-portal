import Header from "@/components/Header";
import PortalHero from "@/components/PortalHero";
// Footer component is defined locally as a fallback to avoid missing module errors
const Footer = () => (
  <footer className="py-6 text-center text-sm text-gray-400">
    © {new Date().getFullYear()} ArbiBase. All rights reserved.
  </footer>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <Header />
      <PortalHero />
      <Footer />
    </div>
  );
}
