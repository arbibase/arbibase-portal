"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Tier = "beta" | "pro" | "premium";

export function useTier() {
  const [tier, setTier] = useState<Tier>("beta");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const res = await supabase.auth.getUser();
      const user = res?.data?.user ?? null;
      if (!user) {
        setLoading(false);
        return;
      }

      // Option A: read directly from user_metadata
      const metaTier = (user.user_metadata?.tier as Tier) || "beta";
      setTier(metaTier);

      // Option B: fetch from profiles table if you use that
      // const { data } = await supabase.from("profiles").select("tier").eq("id", user.id).single();
      // if (data?.tier) setTier(data.tier as Tier);

      setLoading(false);
    })();
  }, []);

  return { tier, loading };
}
