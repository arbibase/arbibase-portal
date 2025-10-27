"use client";
import Link from "next/link";

export default function Topbar(){
  return (
    <nav style={{
      position:"sticky",top:0,zIndex:40,background:"rgba(12,16,24,.62)",
      backdropFilter:"blur(10px) saturate(130%)", borderBottom:"1px solid var(--line)"
    }}>
      <div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0"}}>
        <Link href="/dashboard" className="brand" style={{display:"flex",alignItems:"center",gap:10}}>
          <img src="https://i.postimg.cc/ZRpmdcY5/Group-1.png" alt="ArbiBase" height={26}/>
        </Link>
        <div style={{display:"flex",gap:10}}>
          <Link className="btn" href="/properties">Browse</Link>
          <Link className="btn" href="/requests">Requests</Link>
          <Link className="btn" href="/favorites">Favorites</Link>
          <Link className="btn primary" href="/dashboard">Dashboard</Link>
        </div>
      </div>
    </nav>
  );
}
