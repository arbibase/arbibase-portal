"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [mode, setMode]   = useState<"login"|"signup">("login");
  const [msg, setMsg]     = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { full_name: "", role: "operator" } }
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        location.href = "/dashboard";
      }
    } catch (err:any) { setMsg(err.message ?? String(err)); }
  }

  return (
    <main className="container mx-auto p-6 max-w-md">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{mode === "login" ? "Login" : "Create account"}</h1>
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <input className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                 placeholder="you@arbibase.com" type="email" value={email}
                 onChange={e=>setEmail(e.target.value)} required />
          <input className="rounded-lg border bg-[#0f141c] border-[#2a3441] px-3 py-2"
                 placeholder="Password" type="password" value={pass}
                 onChange={e=>setPass(e.target.value)} required />
          <button className="btn btn-primary" type="submit">
            {mode === "login" ? "Login" : "Sign up"}
          </button>
        </form>
        <div className="mt-3 text-sm">
          {mode === "login" ? (
            <button onClick={()=>setMode("signup")} className="underline">Create an account</button>
          ) : (
            <button onClick={()=>setMode("login")} className="underline">I already have an account</button>
          )}
        </div>
        {msg && <p className="mt-3 text-amber-300 text-sm">{msg}</p>}
      </div>
    </main>
  );
}
