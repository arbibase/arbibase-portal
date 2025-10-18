// src/app/(app)/layout.tsx
import * as React from "react";
// in src/app/(app)/layout.tsx (or the page)
import Prism from "@/components/Prism";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Prism animationType="3drotate" timeScale={0.22} noise={0.06} />
      <div className="prism-wrap">
        {children}
      </div>
    </>
  );
}
