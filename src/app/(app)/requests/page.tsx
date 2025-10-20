export default function Requests(){
  return (
    <main className="container" style={{display:"grid",gap:16}}>
      <h2 style={{margin:0}}>Property Requests</h2>
      <div className="surface" style={{padding:16}}>
        <form className="grid" style={{gap:10, gridTemplateColumns:"2fr 1fr 1fr"}}>
          <input className="input" placeholder="Address / URL" />
          <input className="input" placeholder="City" />
          <button className="btn primary" type="submit">Submit request</button>
        </form>
      </div>
      <div className="surface" style={{padding:16}}>
        <div className="fine">Your recent requests will appear here.</div>
      </div>
    </main>
  );
}
