export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";

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
