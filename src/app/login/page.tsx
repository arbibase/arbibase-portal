"use client";
import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    if (!supabase) {
      setErr("Supabase client not initialized");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    else location.href="/dashboard";
    setBusy(false);
  }

  return (
    <main className="container" style={{minHeight:"100dvh",display:"grid",placeItems:"center"}}>
      <div className="surface" style={{padding:22,maxWidth:420,width:"100%"}}>
        <div style={{display:"grid",gap:8,marginBottom:6}}>
          <span className="pill">Operator Access</span>
          <h1 style={{margin:0}}>Sign in</h1>
          <p className="fine">Use your ArbiBase credentials</p>
        </div>

        <form onSubmit={signIn} className="grid" style={{gap:12}}>
          <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          {err && <div style={{color:"#fca5a5"}}>{err}</div>}
          <button className="btn primary" disabled={busy} type="submit">{busy?"Signing in…":"Sign in"}</button>
        </form>
        <div className="hr" />
        <div className="fine">No account? <Link href="/pricing">See plans</Link></div>
      </div>
    </main>
  );
}
