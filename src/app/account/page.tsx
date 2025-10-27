"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { User, Bell, Mail, Lock, Github, Linkedin, Twitter, Globe, Star } from "lucide-react";

interface UserProfile {
  full_name: string;
  phone: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  twitter_url: string;
  website_url: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [digestCadence, setDigestCadence] = useState<'off' | 'daily' | 'weekly'>('off');
  const [toast, setToast] = useState<string | null>(null);
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    phone: '',
    email: '',
    github_url: '',
    linkedin_url: '',
    twitter_url: '',
    website_url: ''
  });
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordError, setPasswordError] = useState('');

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
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    
    if (userProfile) {
      setDigestCadence(userProfile.digest_cadence as 'off' | 'daily' | 'weekly' || 'off');
      setProfile({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        email: data.user.email || '',
        github_url: userProfile.github_url || '',
        linkedin_url: userProfile.linkedin_url || '',
        twitter_url: userProfile.twitter_url || '',
        website_url: userProfile.website_url || ''
      });
    }
    
    setLoading(false);
  }

  async function handleProfileSave() {
    setSaving(true);
    setToast(null);

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error('Failed to update profile');

      setToast('Profile updated successfully!');
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Profile update error:', error);
      setToast('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordError('');
    
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordData.new.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: passwordData.current,
          newPassword: passwordData.new 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update password');
      }

      setPasswordData({ current: '', new: '', confirm: '' });
      setToast('Password updated successfully!');
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setSaving(false);
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
        <p className="mt-1 text-white/60">Manage your profile, preferences and security</p>
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
              <h2 className="text-xl font-bold text-white">Profile Information</h2>
              <p className="text-sm text-white/60">Update your personal details</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white/50 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-white/40">Contact support to change your email</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <button
              onClick={handleProfileSave}
              disabled={saving}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </section>

        {/* Social Links Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Globe size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Social Links</h2>
              <p className="text-sm text-white/60">Connect your social profiles</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Github size={16} />
                GitHub
              </label>
              <input
                type="url"
                value={profile.github_url}
                onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://github.com/username"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Linkedin size={16} />
                LinkedIn
              </label>
              <input
                type="url"
                value={profile.linkedin_url}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Twitter size={16} />
                Twitter
              </label>
              <input
                type="url"
                value={profile.twitter_url}
                onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://twitter.com/username"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                <Globe size={16} />
                Website
              </label>
              <input
                type="url"
                value={profile.website_url}
                onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <button
              onClick={handleProfileSave}
              disabled={saving}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Social Links'}
            </button>
          </div>
        </section>

        {/* Password Section */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-red-500/10 p-3">
              <Lock size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Change Password</h2>
              <p className="text-sm text-white/60">Update your password to keep your account secure</p>
            </div>
          </div>

          {passwordError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {passwordError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/40 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Confirm new password"
              />
            </div>

            <button
              onClick={handlePasswordChange}
              disabled={saving || !passwordData.current || !passwordData.new || !passwordData.confirm}
              className="w-full rounded-lg bg-red-500 px-4 py-2.5 font-medium text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
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

        {/* Add new section for bookmarks */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Star size={24} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Saved Properties</h2>
              <p className="text-sm text-white/60">Organize with custom tags and notes</p>
            </div>
          </div>
          
          {/* Tag management */}
          {/* Custom folders */}
          {/* Private notes per property */}
        </section>
      </div>
    </div>
  );
}