import "@/app/globals.css";
import Header from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#071019] text-white">
      <Header />
      {/* offset for sticky header */}
      <main className="pt-16">{children}</main>
    </div>
  );
}
