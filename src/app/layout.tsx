import "@/app/globals.css";
import Header from "@/components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#071019] text-white antialiased">
        <Header />
        <main className="relative">{children}</main>
      </body>
    </html>
  );
}
