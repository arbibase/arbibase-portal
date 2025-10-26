import "@/app/globals.css";
import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#071019] text-white">
      <Header />
      {/* Sticky header sits above; content has its own context */}
      <main className="relative z-10 pt-6">
        {children}
      </main>
    </div>
  );
}
