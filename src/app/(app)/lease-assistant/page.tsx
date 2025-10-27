"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  FileText, MessageSquare, CheckCircle2, Copy, Download,
  AlertTriangle, Sparkles, BookOpen, ChevronRight
} from "lucide-react";

type Template = {
  id: string;
  title: string;
  description: string;
  category: "addendum" | "clause" | "letter";
  content: string;
  usageCount: number;
  successRate: number;
};

type Clause = {
  id: string;
  name: string;
  type: "required" | "recommended" | "optional";
  description: string;
  template: string;
  riskLevel: "low" | "medium" | "high";
};

export default function LeaseAssistantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [activeTab, setActiveTab] = useState<"templates" | "clauses" | "ai">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
    setLoading(false);
    loadData();
  }

  function loadData() {
    // Mock templates
    const mockTemplates: Template[] = [
      {
        id: "1",
        title: "STR-Friendly Lease Addendum",
        description: "Comprehensive addendum allowing furnished subleasing for short-term rentals",
        category: "addendum",
        content: `SUBLEASE ADDENDUM\n\nThis addendum is attached to and forms part of the Lease Agreement dated [DATE] between [LANDLORD] and [TENANT] for the property located at [ADDRESS].\n\n1. SUBLEASE PERMISSION\nTenant is granted permission to sublease the Property on a short-term basis (30 days or less) through platforms including but not limited to Airbnb, VRBO, and Furnished Finder.\n\n2. TENANT RESPONSIBILITIES\n- Tenant shall maintain comprehensive liability insurance\n- Tenant shall ensure all guests comply with property rules\n- Tenant shall handle all cleaning and maintenance\n\n3. RENTAL AGREEMENT\nTenant agrees to pay Landlord [X]% of gross sublease revenue OR a flat monthly rate of $[AMOUNT].\n\n4. PROPERTY CONDITION\nTenant agrees to maintain the property in excellent condition and will be responsible for any damage beyond normal wear and tear.`,
        usageCount: 342,
        successRate: 73
      },
      {
        id: "2",
        title: "Landlord Introduction Letter",
        description: "Professional letter to introduce arbitrage opportunity to potential landlords",
        category: "letter",
        content: `Dear [LANDLORD NAME],\n\nI hope this letter finds you well. My name is [YOUR NAME], and I'm a professional property operator specializing in furnished rentals.\n\nI'm interested in leasing your property at [ADDRESS] and transforming it into a high-quality furnished rental. Here's why this benefits you:\n\n✓ Guaranteed monthly rent (no vacancy risk)\n✓ Professional property management\n✓ Regular maintenance and upkeep\n✓ Above-market rental rate\n\nI would love to discuss this opportunity further. Are you available for a brief call this week?\n\nBest regards,\n[YOUR NAME]\n[PHONE]\n[EMAIL]`,
        usageCount: 521,
        successRate: 68
      },
      {
        id: "3",
        title: "Property Damage Protection Clause",
        description: "Clause outlining tenant's damage protection and insurance requirements",
        category: "clause",
        content: `DAMAGE PROTECTION\n\nTenant agrees to maintain commercial general liability insurance with minimum coverage of $1,000,000 per occurrence and $2,000,000 aggregate, naming Landlord as additional insured.\n\nTenant shall be responsible for:\n- All damages caused by guests or subtenants\n- Professional cleaning after each guest departure\n- Monthly deep cleaning and maintenance\n- Replacement of damaged furnishings or appliances\n\nTenant agrees to provide Landlord with proof of insurance within 10 days of lease signing and maintain coverage throughout the lease term.`,
        usageCount: 289,
        successRate: 81
      }
    ];

    const mockClauses: Clause[] = [
      {
        id: "c1",
        name: "Sublease Permission",
        type: "required",
        description: "Explicit permission to sublease the property for short-term rentals",
        template: "Tenant is granted permission to sublease the Property on a short-term basis through established rental platforms.",
        riskLevel: "high"
      },
      {
        id: "c2",
        name: "Insurance Requirements",
        type: "required",
        description: "Liability insurance coverage to protect both parties",
        template: "Tenant shall maintain commercial liability insurance of at least $1M naming Landlord as additional insured.",
        riskLevel: "high"
      },
      {
        id: "c3",
        name: "Guest Screening",
        type: "recommended",
        description: "Tenant's responsibility to screen and vet all guests",
        template: "Tenant agrees to screen all subtenants through platform verification systems and maintain records.",
        riskLevel: "medium"
      },
      {
        id: "c4",
        name: "Revenue Sharing",
        type: "optional",
        description: "Optional clause for percentage-based rent structure",
        template: "Tenant agrees to pay [X]% of gross sublease revenue, with minimum monthly payment of $[AMOUNT].",
        riskLevel: "low"
      }
    ];

    setTemplates(mockTemplates);
    setClauses(mockClauses);
  }

  async function generateWithAI() {
    setAiLoading(true);
    setAiResponse("");

    // TODO: Replace with actual OpenAI API call
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockResponse = `Based on your request: "${aiPrompt}"\n\nHere's a suggested clause:\n\nGUEST CONDUCT AND PROPERTY RULES\n\nTenant agrees to provide all subtenants/guests with a comprehensive set of property rules including:\n\n1. Quiet hours from 10 PM to 8 AM\n2. No smoking anywhere on the property\n3. Maximum occupancy as stated in listing\n4. No parties or events without prior written approval\n5. Proper trash disposal and recycling\n\nTenant shall be responsible for enforcing these rules and addressing any violations. Failure to maintain proper guest conduct may result in lease termination with 30 days notice.\n\nTenant agrees to maintain a guest incident log and provide quarterly reports to Landlord upon request.`;

    setAiResponse(mockResponse);
    setAiLoading(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
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
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
          <Link href="/dashboard" className="hover:text-white/80">Dashboard</Link>
          <span>/</span>
          <span className="text-white/90">Lease Assistant</span>
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white md:text-4xl flex items-center gap-3">
            <FileText className="text-emerald-400" size={32} />
            Lease Negotiation Assistant
          </h1>
          <p className="mt-1 text-white/60">
            Templates, clauses, and AI-powered lease generation for arbitrage deals
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("templates")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "templates"
              ? "bg-emerald-500 text-white"
              : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
          }`}
        >
          <BookOpen size={16} className="inline mr-2" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab("clauses")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "clauses"
              ? "bg-emerald-500 text-white"
              : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
          }`}
        >
          <CheckCircle2 size={16} className="inline mr-2" />
          Clause Library
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "ai"
              ? "bg-emerald-500 text-white"
              : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
          }`}
        >
          <Sparkles size={16} className="inline mr-2" />
          AI Generator
        </button>
      </div>

      {/* Content */}
      {activeTab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Template List */}
          <div className="space-y-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full rounded-xl border p-4 text-left transition-all hover:bg-white/8 ${
                  selectedTemplate?.id === template.id
                    ? "border-emerald-400/50 bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <h3 className="font-bold text-white mb-1">{template.title}</h3>
                <p className="text-xs text-white/60 mb-3">{template.description}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/50">
                    {template.usageCount} uses
                  </span>
                  <span className="text-emerald-400">
                    {template.successRate}% success rate
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Template Preview */}
          {selectedTemplate ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedTemplate.title}</h2>
                  <p className="text-sm text-white/60">{selectedTemplate.description}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(selectedTemplate.content)}
                    className="rounded-lg bg-white/5 border border-white/10 p-2 hover:bg-white/10"
                  >
                    <Copy size={16} className="text-white/70" />
                  </button>
                  <button className="rounded-lg bg-white/5 border border-white/10 p-2 hover:bg-white/10">
                    <Download size={16} className="text-white/70" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-[#0b141d] border border-white/10 p-4">
                <pre className="text-sm text-white/90 whitespace-pre-wrap font-mono">
                  {selectedTemplate.content}
                </pre>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-emerald-400" />
                  Usage Tips
                </h3>
                <ul className="text-sm text-white/80 space-y-1 list-disc list-inside">
                  <li>Replace all [BRACKETED] fields with actual information</li>
                  <li>Have an attorney review before signing</li>
                  <li>Adjust terms based on local regulations</li>
                  <li>Keep a signed copy for your records</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-12">
              <div className="text-center text-white/40">
                <FileText size={48} className="mx-auto mb-4" />
                <p>Select a template to preview</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "clauses" && (
        <div className="grid gap-4 md:grid-cols-2">
          {clauses.map((clause) => (
            <ClauseCard key={clause.id} clause={clause} onCopy={copyToClipboard} />
          ))}
        </div>
      )}

      {activeTab === "ai" && (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="text-emerald-400" />
              AI Clause Generator
            </h2>
            <p className="text-sm text-white/60 mb-6">
              Describe what you need and our AI will generate a custom clause for your lease
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  What do you need?
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Example: Create a clause about guest noise complaints and how to handle them..."
                  className="w-full h-32 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white resize-none"
                />
              </div>

              <button
                onClick={generateWithAI}
                disabled={!aiPrompt.trim() || aiLoading}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {aiLoading ? "Generating..." : "Generate Clause"}
              </button>

              {aiResponse && (
                <div className="rounded-xl bg-[#0b141d] border border-white/10 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-bold text-white">Generated Clause</h3>
                    <button
                      onClick={() => copyToClipboard(aiResponse)}
                      className="rounded-lg bg-white/5 border border-white/10 p-2 hover:bg-white/10"
                    >
                      <Copy size={14} className="text-white/70" />
                    </button>
                  </div>
                  <pre className="text-sm text-white/90 whitespace-pre-wrap">
                    {aiResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClauseCard({ clause, onCopy }: { clause: Clause; onCopy: (text: string) => void }) {
  const typeColors = {
    required: "bg-red-500/10 border-red-400/30 text-red-300",
    recommended: "bg-amber-500/10 border-amber-400/30 text-amber-300",
    optional: "bg-blue-500/10 border-blue-400/30 text-blue-300"
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">{clause.name}</h3>
          <p className="text-xs text-white/60">{clause.description}</p>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${typeColors[clause.type]}`}>
          {clause.type}
        </span>
      </div>

      <div className="rounded-lg bg-[#0b141d] border border-white/10 p-3 mb-3">
        <p className="text-xs text-white/80 font-mono">{clause.template}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs ${
          clause.riskLevel === "high" ? "text-red-400" :
          clause.riskLevel === "medium" ? "text-amber-400" :
          "text-emerald-400"
        }`}>
          Risk: {clause.riskLevel}
        </span>
        <button
          onClick={() => onCopy(clause.template)}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          <Copy size={12} /> Copy
        </button>
      </div>
    </div>
  );
}
