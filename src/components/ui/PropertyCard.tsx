import Link from "next/link";

export type Property = {
  id:string; city:string; state:string; rent:number; beds:number; baths:number;
  approval:"STR"|"MTR"|"Either";
  photo?:string;
};

export default function PropertyCard({p}:{p:Property}){
  return (
    <article className="card">
      <figure><img src={p.photo || "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop"} alt=""/></figure>
      <div className="card-body">
        <span className="badge">{p.approval} Approved</span>
        <h3 style={{margin:"4px 0"}}>{p.city}, {p.state}</h3>
        <div className="fine">${p.rent.toLocaleString()} • {p.beds} bd • {p.baths} ba</div>
        <div style={{marginTop:"auto"}}><Link className="btn" href={`/properties/${p.id}`}>View details →</Link></div>
      </div>
    </article>
  );
}
