// src/app/(app)/layout.tsx
import * as React from "react";
import Prism from "@/components/Prism";

// minimalist layout wrapper you’re using
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="prism-wrap">
      <Prism animationType="rotate" timeScale={0.4} suspendWhenOffscreen />
      {children}
    </div>
  );
}
