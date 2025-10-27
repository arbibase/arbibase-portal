"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, TrendingUp, Calculator, Info, CheckCircle2, AlertCircle, Home, Percent } from "lucide-react";

type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  rent: number;
  beds: number;
  baths: number;
  photo_url?: string;
};

type ROICalculatorProps = {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (results: ROIResults) => void;
};

type ROIResults = {
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  breakEvenOccupancy: number;
  projectedAnnualProfit: number;
  paybackPeriod: number;
};

export default function ROICalculator({ property, isOpen, onClose, onSave }: ROICalculatorProps) {
  // Lease Details
  const [monthlyRent, setMonthlyRent] = useState(property.rent || 2000);
  const [securityDeposit, setSecurityDeposit] = useState(property.rent || 2000);
  const [utilities, setUtilities] = useState(150);
  const [internet, setInternet] = useState(80);

  // Revenue (STR/MTR)
  const [rentalStrategy, setRentalStrategy] = useState<"STR" | "MTR">("STR");
  const [avgNightlyRate, setAvgNightlyRate] = useState(150);
  const [occupancyRate, setOccupancyRate] = useState(70);
  const [cleaningFee, setCleaningFee] = useState(100);
  const [mtrMonthlyRate, setMtrMonthlyRate] = useState(3500);

  // Operating Expenses
  const [furnishingCost, setFurnishingCost] = useState(5000);
  const [cleaningCostPerStay, setCleaningCostPerStay] = useState(75);
  const [avgStayLength, setAvgStayLength] = useState(3);
  const [supplies, setSupplies] = useState(100);
  const [platformFees, setPlatformFees] = useState(3); // percentage
  const [propertyManagement, setPropertyManagement] = useState(0); // percentage or flat
  const [maintenance, setMaintenance] = useState(150);
  const [insurance, setInsurance] = useState(50);

  // Calculations
  const [results, setResults] = useState<ROIResults | null>(null);
  const [activeTab, setActiveTab] = useState<"inputs" | "results">("inputs");

  useEffect(() => {
    calculateROI();
  }, [
    monthlyRent, securityDeposit, utilities, internet,
    rentalStrategy, avgNightlyRate, occupancyRate, cleaningFee, mtrMonthlyRate,
    furnishingCost, cleaningCostPerStay, avgStayLength, supplies, platformFees, propertyManagement, maintenance, insurance
  ]);

  function calculateROI() {
    let monthlyRevenue = 0;
    let cleaningExpense = 0;
    let platformFeesAmount = 0;

    if (rentalStrategy === "STR") {
      // STR Revenue
      const nightsBooked = 30 * (occupancyRate / 100);
      const revenueFromNights = nightsBooked * avgNightlyRate;
      const numberOfStays = nightsBooked / avgStayLength;
      const cleaningFeeRevenue = numberOfStays * cleaningFee;
      monthlyRevenue = revenueFromNights + cleaningFeeRevenue;
      
      // STR Expenses
      cleaningExpense = numberOfStays * cleaningCostPerStay;
      platformFeesAmount = revenueFromNights * (platformFees / 100);
    } else {
      // MTR Revenue
      monthlyRevenue = mtrMonthlyRate;
      cleaningExpense = 50; // Light cleaning/turnover for MTR
      platformFeesAmount = mtrMonthlyRate * (platformFees / 100);
    }

    // Monthly Expenses
    const monthlyLeaseExpenses = monthlyRent + utilities + internet;
    const monthlyOperatingExpenses = 
      cleaningExpense +
      supplies +
      platformFeesAmount +
      (propertyManagement / 100 * monthlyRevenue) +
      maintenance +
      insurance;
    
    const monthlyExpenses = monthlyLeaseExpenses + monthlyOperatingExpenses;

    // Net Profit
    const monthlyNetProfit = monthlyRevenue - monthlyExpenses;
    const annualNetProfit = monthlyNetProfit * 12;

    // Initial Investment (Furnishing + Security Deposit + First Month)
    const initialInvestment = furnishingCost + securityDeposit + monthlyRent;

    // Metrics
    const profitMargin = monthlyRevenue > 0 ? (monthlyNetProfit / monthlyRevenue) * 100 : 0;
    const roi = initialInvestment > 0 ? (annualNetProfit / initialInvestment) * 100 : 0;
    
    // Break-even occupancy
    const breakEvenRevenue = monthlyExpenses - (supplies + cleaningExpense + platformFeesAmount);
    const breakEvenOccupancy = rentalStrategy === "STR" 
      ? (breakEvenRevenue / (avgNightlyRate * 30)) * 100
      : (breakEvenRevenue / mtrMonthlyRate) * 100;

    // Payback period (months to recover initial investment)
    const paybackPeriod = monthlyNetProfit > 0 ? initialInvestment / monthlyNetProfit : 0;

    setResults({
      monthlyRevenue,
      monthlyExpenses,
      netProfit: monthlyNetProfit,
      profitMargin,
      roi,
      breakEvenOccupancy: Math.max(0, breakEvenOccupancy),
      projectedAnnualProfit: annualNetProfit,
      paybackPeriod,
    });
  }

  function handleSave() {
    if (results && onSave) {
      onSave(results);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-2xl bg-[#0b141d] border-l border-white/10 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0b141d]/95 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="text-emerald-400" size={20} />
                <h2 className="text-xl font-bold text-white">Arbitrage ROI Calculator</h2>
              </div>
              <p className="text-sm text-white/60">{property.name}</p>
              <p className="text-xs text-white/50">{property.address}, {property.city}, {property.state}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("inputs")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "inputs"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              Inputs
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === "results"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              Results
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {activeTab === "inputs" ? (
            <>
              {/* Lease Details */}
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Home size={16} className="text-emerald-400" />
                  Master Lease Costs
                </h3>
                <div className="space-y-3">
                  <InputField
                    label="Monthly Rent"
                    value={monthlyRent}
                    onChange={setMonthlyRent}
                    prefix="$"
                    type="currency"
                  />
                  <InputField
                    label="Security Deposit"
                    value={securityDeposit}
                    onChange={setSecurityDeposit}
                    prefix="$"
                    type="currency"
                    hint="One-time upfront cost (refundable)"
                  />
                  <InputField
                    label="Utilities (monthly)"
                    value={utilities}
                    onChange={setUtilities}
                    prefix="$"
                    type="currency"
                    hint="Electric, gas, water"
                  />
                  <InputField
                    label="Internet (monthly)"
                    value={internet}
                    onChange={setInternet}
                    prefix="$"
                    type="currency"
                  />
                </div>
              </section>

              {/* Rental Strategy */}
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-400" />
                  Revenue Strategy
                </h3>
                
                {/* Strategy Toggle */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setRentalStrategy("STR")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      rentalStrategy === "STR"
                        ? "bg-emerald-500 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    Short-Term Rental
                  </button>
                  <button
                    onClick={() => setRentalStrategy("MTR")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      rentalStrategy === "MTR"
                        ? "bg-emerald-500 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    Mid-Term Rental
                  </button>
                </div>

                {rentalStrategy === "STR" ? (
                  <div className="space-y-3">
                    <InputField
                      label="Average Nightly Rate"
                      value={avgNightlyRate}
                      onChange={setAvgNightlyRate}
                      prefix="$"
                      type="currency"
                    />
                    <InputField
                      label="Occupancy Rate"
                      value={occupancyRate}
                      onChange={setOccupancyRate}
                      suffix="%"
                      hint={`${Math.round(30 * (occupancyRate / 100))} nights/month booked`}
                    />
                    <InputField
                      label="Cleaning Fee (per stay)"
                      value={cleaningFee}
                      onChange={setCleaningFee}
                      prefix="$"
                      type="currency"
                    />
                    <InputField
                      label="Average Stay Length"
                      value={avgStayLength}
                      onChange={setAvgStayLength}
                      suffix="nights"
                      hint={`~${Math.round(30 * (occupancyRate / 100) / avgStayLength)} turnovers/month`}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InputField
                      label="Monthly Rate"
                      value={mtrMonthlyRate}
                      onChange={setMtrMonthlyRate}
                      prefix="$"
                      type="currency"
                      hint="Typical 30-90 day bookings"
                    />
                  </div>
                )}
              </section>

              {/* Operating Expenses */}
              <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Calculator size={16} className="text-emerald-400" />
                  Operating Expenses
                </h3>
                <div className="space-y-3">
                  <InputField
                    label="Furnishing Cost"
                    value={furnishingCost}
                    onChange={setFurnishingCost}
                    prefix="$"
                    type="currency"
                    hint="One-time upfront investment"
                  />
                  {rentalStrategy === "STR" && (
                    <InputField
                      label="Cleaning Cost (per stay)"
                      value={cleaningCostPerStay}
                      onChange={setCleaningCostPerStay}
                      prefix="$"
                      type="currency"
                    />
                  )}
                  <InputField
                    label="Supplies & Amenities"
                    value={supplies}
                    onChange={setSupplies}
                    prefix="$"
                    type="currency"
                    hint="Toiletries, linens, coffee, etc."
                  />
                  <InputField
                    label="Platform Fees"
                    value={platformFees}
                    onChange={setPlatformFees}
                    suffix="%"
                    hint="Airbnb/Vrbo fees (typically 3%)"
                  />
                  <InputField
                    label="Property Management"
                    value={propertyManagement}
                    onChange={setPropertyManagement}
                    suffix="%"
                    hint="Optional: 15-25% of revenue"
                  />
                  <InputField
                    label="Maintenance Reserve"
                    value={maintenance}
                    onChange={setMaintenance}
                    prefix="$"
                    type="currency"
                    hint="Monthly reserve for repairs"
                  />
                  <InputField
                    label="STR Insurance"
                    value={insurance}
                    onChange={setInsurance}
                    prefix="$"
                    type="currency"
                    hint="Monthly liability coverage"
                  />
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Results Summary */}
              {results && (
                <>
                  {/* Key Metrics */}
                  <section className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Monthly Profit"
                      value={`$${Math.round(results.netProfit).toLocaleString()}`}
                      status={results.netProfit > 500 ? "good" : results.netProfit > 0 ? "ok" : "poor"}
                      hint="After all expenses"
                    />
                    <MetricCard
                      label="Profit Margin"
                      value={`${results.profitMargin.toFixed(1)}%`}
                      status={results.profitMargin > 25 ? "good" : results.profitMargin > 15 ? "ok" : "poor"}
                      hint="Net profit / revenue"
                    />
                    <MetricCard
                      label="Annual ROI"
                      value={`${results.roi.toFixed(1)}%`}
                      status={results.roi > 50 ? "good" : results.roi > 25 ? "ok" : "poor"}
                      hint="Return on initial investment"
                    />
                    <MetricCard
                      label="Payback Period"
                      value={`${results.paybackPeriod.toFixed(1)} mo`}
                      status={results.paybackPeriod < 12 ? "good" : results.paybackPeriod < 18 ? "ok" : "poor"}
                      hint="Months to recover investment"
                    />
                  </section>

                  {/* Monthly Breakdown */}
                  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Monthly Breakdown</h3>
                    <div className="space-y-3">
                      <ResultRow
                        label="Gross Revenue"
                        value={results.monthlyRevenue}
                        positive
                      />
                      <ResultRow
                        label="Master Lease Costs"
                        value={monthlyRent + utilities + internet}
                        negative
                      />
                      <ResultRow
                        label="Operating Expenses"
                        value={results.monthlyExpenses - (monthlyRent + utilities + internet)}
                        negative
                      />
                      <ResultRow
                        label="Net Monthly Profit"
                        value={results.netProfit}
                        highlight
                        large
                      />
                    </div>
                  </section>

                  {/* Investment Summary */}
                  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4">Investment Summary</h3>
                    <div className="space-y-3">
                      <ResultRow
                        label="Furnishing Cost"
                        value={furnishingCost}
                      />
                      <ResultRow
                        label="Security Deposit"
                        value={securityDeposit}
                      />
                      <ResultRow
                        label="First Month Rent"
                        value={monthlyRent}
                      />
                      <ResultRow
                        label="Total Initial Investment"
                        value={furnishingCost + securityDeposit + monthlyRent}
                        highlight
                      />
                      <div className="border-t border-white/10 pt-3 mt-3">
                        <ResultRow
                          label="Projected Year 1 Profit"
                          value={results.projectedAnnualProfit}
                          highlight
                          large
                        />
                      </div>
                    </div>
                  </section>

                  {/* Break-Even Analysis */}
                  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Percent size={16} className="text-emerald-400" />
                      Break-Even Analysis
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Current Occupancy</span>
                        <span className="text-sm font-semibold text-white">{occupancyRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Break-Even Occupancy</span>
                        <span className="text-sm font-semibold text-emerald-300">{results.breakEvenOccupancy.toFixed(1)}%</span>
                      </div>
                      <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500"
                          style={{ width: `${Math.min(100, results.breakEvenOccupancy)}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/50 mt-2">
                        You need {results.breakEvenOccupancy.toFixed(1)}% occupancy to cover all costs
                      </p>
                    </div>
                  </section>

                  {/* Recommendations */}
                  <section className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Info size={16} className="text-emerald-400" />
                      Analysis
                    </h3>
                    <div className="space-y-2 text-sm text-white/80">
                      {results.netProfit > 500 && (
                        <p className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span>Strong monthly profit of ${Math.round(results.netProfit)} - excellent arbitrage opportunity</span>
                        </p>
                      )}
                      {results.roi > 50 && (
                        <p className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span>ROI above 50% - recover your investment in under {Math.ceil(results.paybackPeriod)} months</span>
                        </p>
                      )}
                      {results.profitMargin > 25 && (
                        <p className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                          <span>Healthy {results.profitMargin.toFixed(0)}% profit margin provides cushion for market fluctuations</span>
                        </p>
                      )}
                      {results.netProfit < 0 && (
                        <p className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                          <span>Negative cash flow - consider increasing nightly rate or reducing occupancy expectations</span>
                        </p>
                      )}
                      {results.breakEvenOccupancy > occupancyRate && (
                        <p className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                          <span>Current occupancy below break-even - need to increase bookings or reduce costs</span>
                        </p>
                      )}
                      {rentalStrategy === "STR" && occupancyRate < 60 && (
                        <p className="flex items-start gap-2">
                          <Info size={16} className="text-sky-400 mt-0.5 shrink-0" />
                          <span>Consider MTR strategy for more stable income with {occupancyRate}% occupancy</span>
                        </p>
                      )}
                    </div>
                  </section>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSave}
                      className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-all"
                    >
                      Save Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab("inputs")}
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all"
                    >
                      Adjust Inputs
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ 
  label, 
  value, 
  onChange, 
  prefix, 
  suffix, 
  hint, 
  type = "number",
  step = 1 
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
  type?: "number" | "currency";
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/70 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          className={`w-full rounded-lg border border-white/15 bg-white/5 py-2 text-sm text-white ${
            prefix ? "pl-8" : "pl-3"
          } ${suffix ? "pr-12" : "pr-3"}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  status, 
  hint 
}: { 
  label: string; 
  value: string; 
  status: "good" | "ok" | "poor";
  hint: string;
}) {
  const colors = {
    good: "border-emerald-400/30 bg-emerald-500/10",
    ok: "border-amber-400/30 bg-amber-500/10",
    poor: "border-red-400/30 bg-red-500/10"
  };

  const textColors = {
    good: "text-emerald-300",
    ok: "text-amber-300",
    poor: "text-red-300"
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[status]}`}>
      <div className="text-xs text-white/60 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${textColors[status]}`}>{value}</div>
      <div className="text-[10px] text-white/40 mt-1">{hint}</div>
    </div>
  );
}

function ResultRow({ 
  label, 
  value, 
  positive, 
  negative, 
  highlight,
  large 
}: { 
  label: string; 
  value: number;
  positive?: boolean;
  negative?: boolean;
  highlight?: boolean;
  large?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? "border-t border-white/10 pt-3" : ""}`}>
      <span className={`${large ? "text-sm font-semibold" : "text-xs"} text-white/70`}>
        {label}
      </span>
      <span className={`${large ? "text-xl font-bold" : "text-sm font-semibold"} ${
        positive ? "text-emerald-300" : 
        negative ? "text-red-300" : 
        highlight ? "text-white" : "text-white/90"
      }`}>
        ${value.toLocaleString()}
      </span>
    </div>
  );
}
