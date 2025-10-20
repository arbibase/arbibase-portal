"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Item = ({ href, label }:{href:string;label:string})=>{
  const path = usePathname();
  const active = path?.startsWith(href) ?? false;
  return (
    <Link href={href}
      className="btn"
      style={{
        justifyContent:"flex-start",
        background: active ? "linear-gradient(135deg,var(--brand),var(--brand-2))" : undefined,
        color: active ? "#041018" : undefined, borderColor: active ? "#0a6a85" : undefined
      }}>
      {label}
    </Link>
  );
};

export default function Sidebar(){
  return (
    <aside className="surface" style={{padding:12,display:"grid",gap:8,height:"fit-content"}}>
      <Item href="/dashboard" label="Overview" />
      <Item href="/properties" label="Browse Properties" />
      <Item href="/requests" label="Property Requests" />
      <Item href="/favorites" label="Favorites" />
      <div className="hr"></div>
      <Item href="/account" label="Account & Billing" />
    </aside>
  );
}
