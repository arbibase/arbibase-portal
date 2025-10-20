"use client";
export type SearchState = {
  q?: string; city?: string; min?: number; max?: number; type?: string; approval?: string;
};
export default function SearchBar({onChange, value}:{onChange:(s:SearchState)=>void; value:SearchState}){
  return (
    <div className="surface" style={{padding:12}}>
      <div style={{display:"grid",gap:10, gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr"}}>
        <input className="input" placeholder="City or address…" value={value.q||""}
               onChange={e=>onChange({...value,q:e.target.value})}/>
        <select className="input" value={value.type||""} onChange={e=>onChange({...value,type:e.target.value})}>
          <option value="">Type</option><option>Apartment</option><option>House</option><option>Townhome</option><option>Condo</option>
        </select>
        <select className="input" value={value.approval||""} onChange={e=>onChange({...value,approval:e.target.value})}>
          <option value="">Approval</option><option>STR</option><option>MTR</option><option>Either</option>
        </select>
        <input className="input" placeholder="Min $" type="number" value={value.min??""}
               onChange={e=>onChange({...value,min: Number(e.target.value||0)})}/>
        <input className="input" placeholder="Max $" type="number" value={value.max??""}
               onChange={e=>onChange({...value,max: Number(e.target.value||0)})}/>
      </div>
    </div>
  );
}
