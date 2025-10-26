"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

type AuroraProps = {
  className?: string;
};

export default function Aurora({ className }: AuroraProps) {
  // Each “orb” is subtle, blurred, and pinned behind content
  const orbs = [
    {
      key: "a",
      size: 520,
      bg: "bg-sky-500",
      style: "top:10%; left:8%",
      delay: 0.0,
    },
    {
      key: "b",
      size: 480,
      bg: "bg-indigo-600",
      style: "top:18%; right:10%",
      delay: 0.1,
    },
    {
      key: "c",
      size: 560,
      bg: "bg-blue-700",
      style: "bottom:8%; left:28%",
      delay: 0.2,
    },
  ];

  return (
    <div className={clsx("overflow-hidden", className)}>
      {orbs.map(({ key, size, bg, style, delay }) => (
        <motion.div
          key={key}
          initial={{ opacity: 0.18, scale: 0.95, y: 8 }}
          animate={{ opacity: 0.26, scale: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay }}
          style={{ position: "absolute", width: size, height: size, filter: "blur(80px)", ...(pos(style) as any) }}
          className={clsx("rounded-full", bg, "mix-blend-screen")}
          aria-hidden="true"
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_0%,rgba(12,19,29,0)_0%,rgba(7,16,25,1)_70%)]" />
    </div>
  );
}

// quick inline style parser for "top: .. ; left/right: .."
function pos(s: string) {
  return s.split(";").reduce((acc, pair) => {
    const [k, v] = pair.split(":").map((x) => x?.trim());
    if (!k || !v) return acc;
    acc[k as any] = v;
    return acc;
  }, {} as Record<string, string>);
}
