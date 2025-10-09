"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import clsx from 'clsx';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
      else setUser(data.user);
    });
  }, [router]);

  if (!user) return null;

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-extrabold">Welcome v0.1.1</h1>
      <p className="mt-2" style={{ color: "#9aa5b1" }}>
        You’re logged in as {user.email}
      </p>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <div className="card p-4">
          <h3 className="font-bold">Find Properties</h3>
          <p className="text-sm" style={{ color: "#9aa5b1" }}>
            Browse verified & lead properties.
          </p>
          <Link className="btn btn-primary mt-3" href="/properties">Open Properties →</Link>
        </div>

        <div className="card p-4">
          <h3 className="font-bold">Request Verification</h3>
          <p className="text-sm" style={{ color: "#9aa5b1" }}>
            Submit addresses you want us to verify.
          </p>

          <Link className="btn mt-3" href="/request-verification">Request →</Link>
        </div>

        <div className="card p-4">
          <h3 className="font-bold">Favorites</h3>
          <p className="text-sm" style={{ color: "#9aa5b1" }}>
            Keep track of saved deals.
          </p>
          <Link className="btn mt-3" href="/favorites">View Favorites →</Link>
        </div>
      </div>
    </main>
  );
}


