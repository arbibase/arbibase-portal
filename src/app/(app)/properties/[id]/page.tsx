type Props = { params:{ id:string } };

export default function PropertyDetail({ params }: Props){
  // TODO: fetch property by id
  return (
    <main className="container" style={{display:"grid",gap:16}}>
      <div className="surface" style={{padding:16}}>
        <h2 style={{margin:"0 0 8px"}}>Property #{params.id}</h2>
        <div className="grid" style={{gridTemplateColumns:"1.2fr 1fr",gap:16}}>
          <img className="surface" src="https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop" alt="" />
          <div className="surface" style={{padding:14}}>
            <div className="badge">STR Approved</div>
            <div className="hr" />
            <div className="fine">Owner contact, approval notes, HOA notes, utilities, parking, etc.</div>
            <div className="hr" />
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <a className="btn primary">Request outreach</a>
              <a className="btn">Save to favorites</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
