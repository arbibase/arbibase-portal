"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import { User, Bell, Mail, KeyRound } from "lucide-react";

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [digestCadence, setDigestCadence] = useState<'off' | 'daily' | 'weekly'>('off');
  const [toast, setToast] = useState<string | null>(null);

  // Profile state
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, [router]);

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
    
    // Fetch user settings and profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('digest_cadence, name, email')
      .eq('user_id', data.user.id)
      .single();

    if (profileData?.digest_cadence) {
      setDigestCadence(profileData.digest_cadence as 'off' | 'daily' | 'weekly');
    }
    if (profileData) {
      setProfile({ name: profileData.name || '', email: profileData.email || data.user.email || '' });
    }
    setLoading(false);
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !supabase) return;
    setProfileSaving(true);
    setToast(null);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');
      // Update user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .update({ name: profile.name, email: profile.email })
        .eq('user_id', user.user.id);
      if (error) throw error;
      setToast('Profile updated!');
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast('Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    if (passwords.new !== passwords.confirm) {
      setPasswordError('New passwords do not match');
      setPasswordSaving(false);
      return;
    }
    if (!supabase) {
      setPasswordError('Supabase not initialized');
      setPasswordSaving(false);
      return;
    }
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');
      // Supabase does not support password change via update in user_profiles, must use auth
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      setPasswordSuccess('Password updated!');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      setPasswordError('Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDigestChange(newCadence: 'off' | 'daily' | 'weekly') {
    setSaving(true);
    setToast(null);

    try {
      const response = await fetch('/api/settings/digest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cadence: newCadence })
      });

      if (!response.ok) throw new Error('Failed to update');

      setDigestCadence(newCadence);
      setToast('Deal Digest preferences updated!');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Settings error:', error);
      setToast('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-white/70">Loading...</p>
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
          <span className="text-white/90">Account Settings</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">
          Account Settings
        </h1>
        <p className="mt-1 text-white/60">Manage your preferences and notifications</p>
      </header>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Toast */}
        {toast && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300">
            {toast}
          </div>
        )}

        {/* Profile Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <User size={24} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Profile</h2>
              <p className="text-sm text-white/60">Your account information</p>
            </div>
          </div>
          {profile ? (
            <form className="space-y-4" onSubmit={handleProfileSave}>
              <div>
                <label className="block text-white/70 text-sm mb-1">Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-white/10 bg-white/10 p-2 text-white focus:border-emerald-400 outline-none"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  disabled={profileSaving}
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-white/10 bg-white/10 p-2 text-white focus:border-emerald-400 outline-none"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  disabled={profileSaving}
                  required
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60"
                disabled={profileSaving}
              >
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <p className="text-sm text-white/60">Loading profile...</p>
          )}
        </section>

        {/* Password Change Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-yellow-500/10 p-3">
              <KeyRound size={24} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Change Password</h2>
              <p className="text-sm text-white/60">Update your account password</p>
            </div>
          </div>
          <form className="space-y-4 max-w-md" onSubmit={handlePasswordChange}>
            <div>
              <label className="block text-white/70 text-sm mb-1">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-white/10 bg-white/10 p-2 text-white focus:border-yellow-400 outline-none"
                value={passwords.new}
                onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                disabled={passwordSaving}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-white/10 bg-white/10 p-2 text-white focus:border-yellow-400 outline-none"
                value={passwords.confirm}
                onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                disabled={passwordSaving}
                required
                minLength={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="accent-yellow-400"
              />
              <label htmlFor="showPassword" className="text-xs text-white/60 cursor-pointer">Show password</label>
            </div>
            {passwordError && <div className="text-red-400 text-sm">{passwordError}</div>}
            {passwordSuccess && <div className="text-emerald-400 text-sm">{passwordSuccess}</div>}
            <button
              type="submit"
              className="rounded-lg bg-yellow-500 px-4 py-2 text-white font-semibold hover:bg-yellow-600 disabled:opacity-60"
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </section>

  {/* Deal Digest Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-sky-500/10 p-3">
              <Mail size={24} className="text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Deal Digest</h2>
              <p className="text-sm text-white/60">Receive curated property opportunities</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { value: 'off', label: 'Off', desc: 'No digest emails' },
              { value: 'daily', label: 'Daily', desc: 'Receive digest every morning at 9 AM' },
              { value: 'weekly', label: 'Weekly', desc: 'Receive digest every Monday at 9 AM' }
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                  digestCadence === option.value
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/8'
                }`}
              >
                <input
                  type="radio"
                  name="digest"
                  value={option.value}
                  checked={digestCadence === option.value}
                  onChange={() => handleDigestChange(option.value as 'off' | 'daily' | 'weekly')}
                  disabled={saving}
                  className="mt-1"
                  data-event="digest-toggle"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">{option.label}</div>
                  <div className="text-sm text-white/60">{option.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {digestCadence !== 'off' && (
            <div className="mt-4 rounded-lg border border-sky-400/20 bg-sky-500/10 p-4">
              <div className="flex items-start gap-2">
                <Bell size={16} className="text-sky-400 mt-0.5" />
                <div>
                  <p className="text-sm text-white/90 mb-2">
                    Your next digest will include:
                  </p>
                  <ul className="text-xs text-white/70 space-y-1 ml-4">
                    <li>• Top 3 verified properties</li>
                    <li>• 2 hot markets with high ROI potential</li>
                    <li>• Latest market insights</li>
                  </ul>
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); alert('Preview coming soon!'); }}
                    className="text-xs text-sky-300 hover:text-sky-200 mt-2 inline-block"
                  >
                    Preview today's email →
                  </a>
                </div>
              </div>
            </div>
          )}
        </section>

  {/* Notifications Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-violet-500/10 p-3">
              <Bell size={24} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <p className="text-sm text-white/60">Manage your alerts</p>
            </div>
          </div>
          <p className="text-sm text-white/60">
            Additional notification settings coming soon.
          </p>
        </section>
      </div>
    </div>
  );
}
