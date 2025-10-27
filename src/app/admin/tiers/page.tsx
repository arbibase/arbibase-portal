"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminTiersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified admin dashboard
    router.replace("/admin");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
        <p className="mt-4 text-sm text-white/70">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}
