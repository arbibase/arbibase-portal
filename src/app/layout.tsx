// src/app/(app)/layout.tsx
import "../globals.css";
import Link from "next/link";

export const metadata = { title: "ArbiBase App", description: "Operator portal" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav" aria-label="Main">
          <div className="container nav-inner">
            <Link className="logo" href="/dashboard">
              <img src="https://i.postimg.cc/ZRpmdcY5/Group-1.png" alt="ArbiBase" height={34} />
            </Link>
            <div style={{ display: "flex", gap: 10 }}>
              <Link className="btn ghost" href="/properties">Properties</Link>
              <Link className="btn ghost" href="/request-verification">Request Verification</Link>
              <Link className="btn primary" href="/dashboard">Dashboard</Link>
            </div>
          </div>
        </nav>

        <main className="container" style={{ paddingTop: 28, paddingBottom: 28 }}>
          {children}
        </main>

        <footer>
          <div className="container footgrid">
            <div className="foot-left">
              <figure style={{ margin: "0 0 10px" }}>
                <img src="https://i.postimg.cc/sxGVwr44/Group-1-7.png" alt="ArbiBase" loading="lazy" style={{ height: 28, width: "auto" }} />
              </figure>
              <p className="fine" style={{ margin: ".4rem 0" }}>
                The leading platform for real estate arbitrage operators. Find pre-approved properties and scale faster.
              </p>
            </div>
            <div className="foot-right">
              <div className="col">
                <h3>Product</h3>
                <div className="footer-links">
                  <a href="/pricing">Pricing</a>
                  <a href="/api">API</a>
                  <a href="/integrations">Integrations</a>
                </div>
              </div>
              <div className="col">
                <h3>Support</h3>
                <div className="footer-links">
                  <a href="/faq">FAQ</a>
                  <a href="/contact">Contact</a>
                  <a href="/blog">Blog</a>
                </div>
              </div>
            </div>
            <div className="copy">
              <div>© {new Date().getFullYear()} ArbiBase. All rights reserved.</div>
              <div className="footer-links" style={{ display: "flex", gap: 16 }}>
                <a href="/terms-of-service">Terms of Service</a>
                <a href="/privacy-policy">Privacy Policy</a>
                <a href="/pvd">PVD</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
