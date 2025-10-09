export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b"
           style={{background:"rgba(12,15,20,.7)", backdropFilter:"saturate(120%) blur(10px)", borderColor:"var(--border)"}}>
        <div className="container mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold">ArbiBase</div>
          <div className="flex items-center gap-2">
            <a className="btn" href="/dashboard">Dashboard</a>
            <a className="btn" href="/properties">Properties</a>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
