"use client";

import { motion } from "framer-motion";
import { Home, Search, Star, User } from "lucide-react";
import Prism from "@/components/Prism";
import Aurora from "@/components/Aurora";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as any },
};

export default function HomePage() {
  return (
    <motion.div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-linear-to-tr from-[#04101c] via-[#0b1624] to-[#101c2c] text-white"
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* ✦ Background Layers (Aurora under Prism) */}
      <div className="absolute inset-0 -z-10">
        <Aurora opacity={0.5} speed={0.5} blur={180} />
        <div className="absolute inset-0 opacity-70 mix-blend-screen pointer-events-none">
          <Prism animationType="rotate" glow={1.25} timeScale={0.42} />
        </div>
      </div>

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 flex justify-between items-center px-10 py-5 backdrop-blur-xl bg-[#060d17]/60 border-b border-[#1e2733]"
        {...fadeUp}
      >
        <h1 className="text-2xl font-extrabold tracking-wide bg-linear-to-r from-sky-300 via-cyan-400 to-blue-600 bg-clip-text text-transparent">
          ArbiBase<span className="text-[#9ab1c7] ml-1 font-medium">Portal</span>
        </h1>

        <nav className="flex space-x-3 text-sm">
          <a
            href="/properties"
            className="flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <Search className="h-5 w-5 mr-2 text-cyan-400" /> Browse
          </a>
          <a
            href="/favorites"
            className="flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <Star className="h-5 w-5 mr-2 text-yellow-300" /> Favorites
          </a>
          <a
            href="/login"
            className="flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <User className="h-5 w-5 mr-2 text-sky-300" /> Login
          </a>
        </nav>
      </motion.header>

      {/* Hero */}
      <motion.section className="relative text-center px-6 mt-24 max-w-3xl z-10" {...fadeUp}>
        <Home className="h-20 w-20 mx-auto mb-6 text-cyan-400 opacity-80 drop-shadow-[0_0_14px_rgba(0,180,255,0.5)]" />
        <h2 className="text-5xl md:text-6xl font-bold mb-4 leading-tight bg-linear-to-r from-cyan-400 via-sky-500 to-blue-600 bg-clip-text text-transparent">
          The Verified Property Layer for Arbitrage
        </h2>
        <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          Access a nationwide database of pre-approved, arbitrage-friendly properties verified for STR and MTR operations.
        </p>
        <div className="flex justify-center mt-8 gap-4">
          <a
            href="/properties"
            className="px-8 py-3 rounded-full text-base font-semibold bg-linear-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 shadow-[0_0_25px_rgba(0,200,255,0.25)] transition-all"
          >
            Browse Properties →
          </a>
          <a
            href="/about"
            className="px-8 py-3 rounded-full text-base font-semibold border border-white/20 hover:bg-white/10 transition-all"
          >
            Learn More
          </a>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer
        className="absolute bottom-0 left-0 right-0 py-4 text-center text-sm text-gray-400 bg-[#050b14]/70 backdrop-blur-xl border-t border-[#1e2733]"
        {...fadeUp}
      >
        © {new Date().getFullYear()} ArbiBase. All Rights Reserved.
      </motion.footer>
    </motion.div>
  );
}
