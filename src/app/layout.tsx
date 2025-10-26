import "@/app/globals.css";
import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#071019] text-white">
      <Header />
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
