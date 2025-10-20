import "./globals.css";

export const metadata = {
  title: "ArbiBase",
  description: "Operator portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
