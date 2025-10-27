"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Gift, Share2, Users, Award, Copy, Check, Mail, MessageSquare, Facebook, Twitter, Linkedin, Clock } from "lucide-react";

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_rewards: number;
  pending_rewards: number;
}

interface Referral {
  id: string;
  email: string;
  status: "pending" | "active" | "converted";
  created_at: string;
  reward_amount: number;
}

export default function ReferralsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    active_referrals: 0,
    total_rewards: 0,
    pending_rewards: 0
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    if (!supabase) {
      router.replace("/login");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      router.replace("/login");
      return;
    }
    await loadReferralData(data.user.id);
    setLoading(false);
  }

  async function loadReferralData(userId: string) {
    if (!supabase) return;

    // Get user's referral code
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("referral_code")
      .eq("user_id", userId)
      .single();

    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    }

    // Get referral stats and list
    const { data: referralData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    if (referralData) {
      setReferrals(referralData);
      setStats({
        total_referrals: referralData.length,
        active_referrals: referralData.filter(r => r.status === "active").length,
        total_rewards: referralData.reduce((sum, r) => sum + (r.reward_amount || 0), 0),
        pending_rewards: referralData.filter(r => r.status === "pending").reduce((sum, r) => sum + (r.reward_amount || 0), 0)
      });
    }
  }

  const referralUrl = `https://arbibase.com/signup?ref=${referralCode}`;

  function copyToClipboard() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareVia(platform: string) {
    const text = "Join me on Arbibase - the premium real estate investment platform!";
    const urls: Record<string, string> = {
      email: `mailto:?subject=Join Arbibase&body=${text} ${referralUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`
    };
    window.open(urls[platform], "_blank");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading referrals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Referral Program</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">
          Referral Program
        </h1>
        <p className="mt-1 text-white/60">Earn rewards by inviting friends to Arbibase</p>
      </header>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users size={20} className="text-blue-400" />}
          label="Total Referrals"
          value={stats.total_referrals}
          color="blue"
        />
        <StatCard
          icon={<Award size={20} className="text-emerald-400" />}
          label="Active Referrals"
          value={stats.active_referrals}
          color="emerald"
        />
        <StatCard
          icon={<Gift size={20} className="text-violet-400" />}
          label="Total Rewards"
          value={`$${stats.total_rewards}`}
          color="violet"
        />
        <StatCard
          icon={<Clock size={20} className="text-amber-400" />}
          label="Pending Rewards"
          value={`$${stats.pending_rewards}`}
          color="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Referral Link */}
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <Share2 size={24} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Your Referral Link</h2>
                <p className="text-sm text-white/60">Share this link to earn rewards</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white"
              />
              <button
                onClick={copyToClipboard}
                className="rounded-lg bg-emerald-500 px-6 py-2.5 text-white hover:bg-emerald-600 flex items-center gap-2"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => shareVia("email")}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                <span className="text-sm">Email</span>
              </button>
              <button
                onClick={() => shareVia("twitter")}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Twitter size={16} />
                <span className="text-sm">Twitter</span>
              </button>
              <button
                onClick={() => shareVia("facebook")}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Facebook size={16} />
                <span className="text-sm">Facebook</span>
              </button>
              <button
                onClick={() => shareVia("linkedin")}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <Linkedin size={16} />
                <span className="text-sm">LinkedIn</span>
              </button>
            </div>
          </section>

          {/* Referral List */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Your Referrals</h3>
            {referrals.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto mb-4 text-white/20" />
                <p className="text-sm text-white/60">No referrals yet. Start sharing your link!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{referral.email}</p>
                      <p className="text-xs text-white/60">
                        {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        referral.status === "active"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : referral.status === "converted"
                          ? "bg-blue-500/10 text-blue-300"
                          : "bg-amber-500/10 text-amber-300"
                      }`}>
                        {referral.status}
                      </span>
                      {referral.reward_amount > 0 && (
                        <span className="text-sm font-bold text-emerald-400">
                          +${referral.reward_amount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Rewards Info */}
        <div>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-violet-500/10 p-3">
                <Gift size={24} className="text-violet-400" />
              </div>
              <h3 className="text-lg font-bold text-white">How It Works</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="rounded-full bg-emerald-500/10 w-8 h-8 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-emerald-400">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Share Your Link</h4>
                  <p className="text-xs text-white/60">Send your unique referral link to friends</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded-full bg-emerald-500/10 w-8 h-8 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-emerald-400">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">They Sign Up</h4>
                  <p className="text-xs text-white/60">Friend creates an account using your link</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded-full bg-emerald-500/10 w-8 h-8 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-emerald-400">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">Earn Rewards</h4>
                  <p className="text-xs text-white/60">Get $50 credit when they subscribe</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <h4 className="font-bold text-emerald-300 mb-2">Reward Tiers</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">1-5 referrals</span>
                <span className="font-semibold text-white">$50 each</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">6-10 referrals</span>
                <span className="font-semibold text-white">$75 each</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">11+ referrals</span>
                <span className="font-semibold text-white">$100 each</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    violet: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20"
  };

  return (
    <div className={`rounded-2xl border bg-linear-to-br ${colorMap[color]} p-4`}>
      <div className="mb-2 rounded-lg bg-white/10 p-2 w-fit">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs font-medium text-white/70">{label}</p>
    </div>
  );
}
