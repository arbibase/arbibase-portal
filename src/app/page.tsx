export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "ArbiBase Portal — Sign in",
  description:
    "Secure access to the ArbiBase operator portal. Accounts are provisioned by administrators.",
};

// Load client hero with SSR explicitly disabled
const PortalHero = dynamicImport(() => import("@/components/PortalHero"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#071019]" aria-busy="true" />,
});

export default function Home() {
  return <PortalHero />;
}

<header className="mx-auto w-full max-w-[1100px] px-6 py-6">
  <div className="flex items-center justify-between">
    <Link
      href="https://arbibase.com"
      className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
      aria-label="ArbiBase website"
    >
      <Image
        src="/arbibase-logo.svg"
        alt="ArbiBase"
        width={140}
        height={28}
        priority
      />
    </Link>

    <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
      <Link href="https://arbibase.com" className="hover:text-white">Website</Link>
      <Link href="https://arbibase.com/pricing" className="hover:text-white">Pricing</Link>
      <Link href="https://arbibase.com/about-us" className="hover:text-white">Contact</Link>
    </nav>
  </div>
  <div className="mt-4 h-px w-full bg-white/5" />
</header>