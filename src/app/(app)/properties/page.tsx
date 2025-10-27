"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

export default function PropertiesRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the canonical properties page
    router.replace("/properties");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f141c] text-white">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent" />
        <p className="mt-4 text-sm text-white/70">Redirecting to Properties...</p>
      </div>
    </div>
  );
}