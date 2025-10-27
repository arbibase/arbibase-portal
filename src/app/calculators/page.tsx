"use client";

import { Calculator, TrendingUp, PieChart, DollarSign } from "lucide-react";

export default function CalculatorsPage() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">
          Investment Calculators
        </h1>
        <p className="mt-1 text-white/60">Advanced tools for property analysis</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* ROI Calculator */}
        <CalculatorCard
          icon={<TrendingUp size={24} />}
          title="ROI Calculator"
          description="Calculate return on investment with detailed breakdown"
        />
        
        {/* Mortgage Calculator */}
        <CalculatorCard
          icon={<DollarSign size={24} />}
          title="Mortgage Calculator"
          description="Estimate monthly payments and total interest"
        />
        
        {/* Cash Flow Calculator */}
        <CalculatorCard
          icon={<PieChart size={24} />}
          title="Cash Flow Analysis"
          description="Project rental income and expenses"
        />
        
        {/* Flip Analysis */}
        <CalculatorCard
          icon={<Calculator size={24} />}
          title="Fix & Flip"
          description="Estimate renovation costs and profit margins"
        />
        
        {/* BRRRR Calculator */}
        <CalculatorCard
          icon={<TrendingUp size={24} />}
          title="BRRRR Method"
          description="Buy, Rehab, Rent, Refinance, Repeat analysis"
        />
        
        {/* 1031 Exchange */}
        <CalculatorCard
          icon={<DollarSign size={24} />}
          title="1031 Exchange"
          description="Calculate tax-deferred exchange benefits"
        />
      </div>
    </div>
  );
}

function CalculatorCard({ icon, title, description }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/8 transition-all cursor-pointer">
      <div className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-emerald-400 w-fit">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}
