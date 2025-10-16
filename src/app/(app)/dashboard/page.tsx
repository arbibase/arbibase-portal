"use client";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabase";

const quickLinks = [
  {
    title: "Explore verified doors",
    description: "Review high-confidence homes and suites that are ready to onboard.",
    href: "/properties",
    cta: "Browse properties",
  },
  {
    title: "Request a property check",
    description: "Submit an address and we’ll confirm licensing, HOAs, and local rules for you.",
    href: "/request-verification",
    cta: "Start a request",
  },
  {
    title: "Keep tabs on favourites",
    description: "See every opportunity you’ve starred and how each one is progressing.",
    href: "/favorites",
    cta: "Open favourites",
  },
];

const spotlights = [
  {
    name: "The Willow Lofts",
    location: "Capitol Hill • Seattle",
    status: "Newly verified",
    summary: "7 furnished units with flexible 6–12 month terms and concierge support.",
  },
  {
    name: "Riverfront Rowhomes",
    location: "Downtown • Austin",
    status: "Lead refreshed",
    summary: "Boutique rowhomes ideal for owner-operators expanding into STR + mid-term.",
  },
];

const updates = [
  {
    title: "Local compliance team added 4 new city partnerships",
    date: "Today",
    body: "Priority reviews in Denver, San Diego, Miami, and Nashville now complete.",
  },
  {
    title: "Coach marketplace applications reopen next week",
    date: "Yesterday",
    body: "We’ll send you an email when the cohort is live so you can reserve a slot early.",
  },
  {
    title: "Product tip: Collaborate from the pipeline view",
    date: "This week",
    body: "Share shortlists with partners and track comments alongside your saved homes.",
  },
];

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("Welcome back");
  const router = useRouter();
 
 useEffect(() => {
   let active = true;

   const client = supabase;
   if (!client) {
     // If supabase client is unavailable, redirect to login and stop loading.
     router.replace("/login");
     setIsLoading(false);
     return;
   }

   client.auth
     .getUser()
     .then(({ data }) => {
       if (!active) return;
       if (!data.user) {
         router.replace("/login");
         return;
       }
       setUser(data.user);
     })
     .finally(() => {
       if (active) setIsLoading(false);
     });

   const hour = new Date().getHours();
   if (hour < 12) setGreeting("Good morning");
   else if (hour < 18) setGreeting("Good afternoon");
   else setGreeting("Good evening");

   return () => {
     active = false;
   };
 }, [router]);
 
  const firstName = useMemo(() => {
    const fullName = (user?.user_metadata?.full_name as string | undefined) || "";
    if (!fullName.trim()) return user?.email?.split("@")[0] || "there";
    return fullName.split(" ")[0];
  }, [user]);
 
  const stats = useMemo(
    () => [
      { label: "Active leads", value: "18", detail: "+3 this week" },
      { label: "Verified doors", value: "42", detail: "12 pending onboarding" },
      { label: "Tasks due", value: "2", detail: "Schedule walkthroughs" },
    ],
    []
  );

  if (isLoading) {
    return (
      <main className="dashboard-shell">
        <div className="container">
          <section className="card dashboard-card dashboard-card--hero dashboard-card--loading">
            <div className="skeleton skeleton--eyebrow" />
            <div className="skeleton skeleton--title" />
            <div className="skeleton skeleton--text" />
            <div className="dashboard-loading-grid">
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-shell">
      <div className="container dashboard-layout">
        <section className="card dashboard-card dashboard-card--hero">
          <div className="dashboard-hero__badge">{greeting}, {firstName} 👋</div>
          <h1 className="dashboard-hero__title">Let’s build your next great stay.</h1>
          <p className="dashboard-hero__subtitle">
            Curate rentals, track verifications, and collaborate with your team from one welcoming
            place. We’ll surface what needs your attention, so you can focus on guest-ready
            experiences.
          </p>

          <div className="dashboard-stat-grid">
            {stats.map((stat) => (
              <div key={stat.label} className="dashboard-stat">
                <span className="dashboard-stat__value">{stat.value}</span>
                <span className="dashboard-stat__label">{stat.label}</span>
                <span className="dashboard-stat__detail">{stat.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-card card">
          <header className="dashboard-card__header">
            <div>
              <p className="dashboard-eyebrow">Your next steps</p>
              <h2 className="dashboard-card__title">Quick actions</h2>
            </div>
            <Link className="btn btn-primary" href="/properties">
              Jump back in
            </Link>
          </header>
          <div className="dashboard-list">
            {quickLinks.map((link) => (
              <article key={link.title} className="dashboard-list__item">
                <div>
                  <h3>{link.title}</h3>
                  <p>{link.description}</p>
                </div>
                <Link className="btn" href={link.href}>
                  {link.cta} →
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-card card">
          <header className="dashboard-card__header">
            <div>
              <p className="dashboard-eyebrow">Fresh opportunities</p>
              <h2 className="dashboard-card__title">Spotlight listings</h2>
            </div>
          </header>
          <div className="dashboard-spotlights">
            {spotlights.map((property) => (
              <article key={property.name} className="dashboard-spotlights__item">
                <div className="dashboard-spotlights__status">{property.status}</div>
                <h3>{property.name}</h3>
                <p className="dashboard-spotlights__location">{property.location}</p>
                <p>{property.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-card card dashboard-card--stretch">
          <header className="dashboard-card__header">
            <div>
              <p className="dashboard-eyebrow">Team updates</p>
              <h2 className="dashboard-card__title">What’s new at ArbiBase</h2>
            </div>
          </header>
          <ul className="dashboard-updates">
            {updates.map((update) => (
              <li key={update.title}>
                <p className="dashboard-updates__date">{update.date}</p>
                <h3>{update.title}</h3>
                <p>{update.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="dashboard-card card dashboard-support">
          <p className="dashboard-eyebrow">Need a hand?</p>
          <h2 className="dashboard-card__title">Your concierge team is on standby</h2>
          <p>
            Message us for tailored onboarding help, market insights, or to schedule a strategy
            session. We reply within a business day—usually sooner.
          </p>
          <div className="dashboard-support__actions">
            <Link className="btn btn-primary" href="mailto:support@arbibase.com">
              Email support
            </Link>
            <Link className="btn" href="/request-verification">
              Book a call →
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
