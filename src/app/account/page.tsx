"use client";

import { useState } from "react";
import {
  User as UserIcon,
  Lock,
  Shield,
  Bell,
  Palette,
  Link as LinkIcon,
  FloppyDisk,
  Trash,
  Download,
  Question,
  Key,
  Eye,
  EyeSlash,
  SignOut
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("profile");
  
  const [userProfile, setUserProfile] = useState({
    fullName: "John Doe",
    email: "john.doe@example.com",
    profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop",
    phone: "+1 (555) 123-4567",
    company: "ArbiBase Operator"
  });

  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    showPassword: false,
    twoFactorEnabled: false
  });

  const [permissions, setPermissions] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    weeklyReports: true
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Add your update logic here
    alert("Profile updated successfully!");
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    // Add your password update logic here
    alert("Password updated successfully!");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile({ ...userProfile, profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleSignOut() {
    try {
      await supabase?.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-4">
              <img
                src={userProfile.profilePicture}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop";
                }}
              />
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="profile-upload"
                />
                <label
                  htmlFor="profile-upload"
                  className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Upload Photo
                </label>
                <p className="mt-1 text-xs text-white/50">JPG, PNG or GIF (max 2MB)</p>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Full Name</label>
                  <input
                    type="text"
                    value={userProfile.fullName}
                    onChange={(e) => setUserProfile({ ...userProfile, fullName: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Email</label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Phone</label>
                  <input
                    type="tel"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Company</label>
                  <input
                    type="text"
                    value={userProfile.company}
                    onChange={(e) => setUserProfile({ ...userProfile, company: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">
                <FloppyDisk size={16} /> Save Changes
              </button>
            </form>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            {/* Password Change */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">Change Password</h3>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Current Password</label>
                  <div className="relative">
                    <input
                      type={securitySettings.showPassword ? "text" : "password"}
                      value={securitySettings.currentPassword}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                      className="input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setSecuritySettings({ ...securitySettings, showPassword: !securitySettings.showPassword })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {securitySettings.showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">New Password</label>
                  <input
                    type="password"
                    value={securitySettings.newPassword}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Confirm New Password</label>
                  <input
                    type="password"
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })}
                    className="input"
                  />
                </div>
                <button type="submit" className="btn-primary w-full">
                  <Key size={16} /> Update Password
                </button>
              </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Two-Factor Authentication</h3>
                  <p className="text-sm text-white/60">Add an extra layer of security</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={securitySettings.twoFactorEnabled}
                    onChange={() => setSecuritySettings({ ...securitySettings, twoFactorEnabled: !securitySettings.twoFactorEnabled })}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/10 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400/50"></div>
                </label>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            {[
              { key: "emailNotifications", label: "Email Notifications", desc: "Receive email about account activity" },
              { key: "smsNotifications", label: "SMS Notifications", desc: "Get text messages for important updates" },
              { key: "pushNotifications", label: "Push Notifications", desc: "Browser push notifications" },
              { key: "marketingEmails", label: "Marketing Emails", desc: "Receive promotional content" },
              { key: "weeklyReports", label: "Weekly Reports", desc: "Get weekly performance summaries" }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <h3 className="font-semibold text-white">{item.label}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={permissions[item.key as keyof typeof permissions]}
                    onChange={() => setPermissions({ ...permissions, [item.key]: !permissions[item.key as keyof typeof permissions] })}
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/10 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-400/50"></div>
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/60">Section under development</p>
          </div>
        );
    }
  };

  const sidebarItems = [
    { id: "profile", icon: UserIcon, label: "Profile" },
    { id: "security", icon: Lock, label: "Security" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "appearance", icon: Palette, label: "Appearance" },
    { id: "connected", icon: LinkIcon, label: "Connected Apps" }
  ];

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white">Account Settings</h1>
        <p className="text-white/60">Manage your account preferences and security</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden w-64 lg:block">
          <div className="sticky top-20 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,.3)]"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white">
                <Download size={18} />
                <span>Export Data</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white">
                <Question size={18} />
                <span>Help & Support</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/5 hover:text-white"
              >
                <SignOut size={18} />
                <span>Sign Out</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10">
                <Trash size={18} />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="mb-6 text-2xl font-bold text-white">
            {sidebarItems.find((item) => item.id === activeTab)?.label}
          </h2>
          {renderContent()}
        </main>

        {/* Mobile Tab Selector */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#071019] p-4 lg:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="input w-full"
          >
            {sidebarItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
