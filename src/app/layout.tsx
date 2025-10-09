import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

// We keep the same CSS variable names to avoid touching existing styles
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-Roboto_Mono-sans",
});

const mono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-Roboto_Mono-mono",
});

export const metadata: Metadata = {
  title: "ArbiBase",
  description: "The Base for Every Arbitrage Operator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
