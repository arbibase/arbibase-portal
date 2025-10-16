// src/components/PropertyCard.tsx
import clsx from "clsx";

export type Property = {
  id: string;
  image_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  unit_type: string | null;
  rent: number | null;
  approval: string | null;
  verification_status: string | null;
};

export default function PropertyCard({ p }: { p: Property }) {
  const badgeClass =
    (p.verification_status || "lead").toLowerCase()==="verified" ? "badge green" :
    (p.approval || "").toLowerCase().includes("str") ? "badge blue" : "badge orange";

  return (
    <article className="card overflow-hidden">
      <div className="relative">
        <img
          src={p.image_url || "https://via.placeholder.com/640x360?text=No+Image"}
          alt={p.address ?? "Property"}
          style={{ width: "100%", height: 180, objectFit: "cover" }}
        />
        <span className={clsx(badgeClass)}>{p.verification_status || p.approval || "Lead"}</span>
      </div>
      <div className="card-body">
        <h3 className="font-bold">{p.address || "—"}</h3>
        <p className="fine">{p.city}, {p.state} • {p.unit_type || "Type"}</p>
        <p className="mt-1"><strong>{p.rent ? `$${p.rent}` : "—"}</strong> / mo • {p.approval || "Approval"}</p>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn">👁 View</button>
          <button className="btn">☆ Save</button>
        </div>
      </div>
    </article>
  );
}
