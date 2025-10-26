"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Aurora from "@/components/Aurora";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export default function Home() {
  return (
    <main className="relative min-h-svh bg-[#0b121a] text-white overflow-hidden">
      {/* Soft animated background */}
      <Aurora />

      {/* Top bar with logo + website links */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <Link
          href="https://arbibase.com"
          target="_blank"
          className="flex items-center gap-3"
          aria-label="ArbiBase website"
        >
          {/* If you have an SVG in /public, this will render. Otherwise it silently keeps the text mark. */}
          <div className="h-7 w-7 relative">
            <Image
              src="/arbibase-logo.svg"
              alt="ArbiBase"
              fill
              className="object-contain"
              sizes="28px"
              priority
            />
          </div>
          <span className="text-lg font-semibold tracking-tight">ArbiBase</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-300">
          <Link href="https://arbibase.com" target="_blank" className="hover:text-white">
            Website
          </Link>
          <Link href="https://arbibase.com/pricing" target="_blank" className="hover:text-white">
            Pricing
          </Link>
          <Link href="https://arbibase.com/contact" target="_blank" className="hover:text-white">
            Contact
          </Link>
        </nav>
      </header>

      {/* Centered hero */}
      <section className="relative z-10 max-w-3xl mx-auto pt-10 sm:pt-16 pb-20 px-6 text-center">
        <motion.h1
          {...fadeUp}
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight"
        >
          ArbiBase Portal
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.07 }}
          className="mt-3 text-base sm:text-lg text-gray-300"
        >
          Secure access to your operator dashboard and tools.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.14 }}
          className="mt-8 flex items-center justify-center gap-3"
        >
          <Link
            href="/login"
            className="inline-flex items-center rounded-full bg-[#1a73e8] px-5 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg hover:bg-[#1b66c9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a73e8] transition"
          >
            Login
          </Link>
        </motion.div>

        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.22 }}
          className="mt-4 text-xs text-gray-400"
        >
          Don’t have an account?&nbsp;
          <span className="text-gray-300">Please contact your workspace administrator.</span>
        </motion.p>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-5 text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} ArbiBase. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="https://arbibase.com/terms" target="_blank" className="hover:text-white">
              Terms
            </Link>
            <Link href="https://arbibase.com/privacy" target="_blank" className="hover:text-white">
              Privacy
            </Link>
            <Link href="https://status.arbibase.com" target="_blank" className="hover:text-white">
              Status
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
