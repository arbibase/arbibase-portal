"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  Clock,
  Send,
} from "lucide-react";

type RequestForm = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  estimatedRent: string;
  bedrooms: string;
  bathrooms: string;
  notes: string;
  priority: "standard" | "priority";
};

export default function RequestVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState<RequestForm>({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "",
    estimatedRent: "",
    bedrooms: "",
    bathrooms: "",
    notes: "",
    priority: "standard",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm, string>>>({});

  useEffect(() => {
    checkAuth();
  }, [router]); // Add router dependency

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
  }

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof RequestForm, string>> = {};

    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = "ZIP code is required";
    } else if (!/^\d{5}$/.test(formData.zipCode)) {
      newErrors.zipCode = "ZIP code must be 5 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<Record<keyof RequestForm, string>> = {};

    if (!formData.propertyType) newErrors.propertyType = "Property type is required";
    if (!formData.bedrooms) newErrors.bedrooms = "Bedrooms is required";
    if (!formData.bathrooms) newErrors.bathrooms = "Bathrooms is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== 3) return;

    setSubmitting(true);

    try {
      // Simulate API call - replace with actual Supabase insert
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSubmitSuccess(true);

      // Reset form and redirect after 3 seconds
      setTimeout(() => {
        router.push("/requests");
      }, 3000);
    } catch (error) {
      console.error("Error submitting request:", error);
      setErrors({ address: "Failed to submit. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof RequestForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

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

  if (submitSuccess) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
            <p className="text-white/60 mb-6">
              We've received your verification request. Our team will review it within 72 hours.
            </p>
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              View My Requests
            </Link>
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
          <Link href="/dashboard" className="hover:text-white/80">
            Dashboard
          </Link>
          <span>/</span>
          <Link href="/requests" className="hover:text-white/80">
            Requests
          </Link>
          <span>/</span>
          <span className="text-white/90">New Request</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white md:text-4xl">
          Request Property Verification
        </h1>
        <p className="mt-2 text-white/60">
          Submit an address for our team to verify landlord approval and STR/MTR eligibility
        </p>
      </header>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <StepIndicator step={1} currentStep={currentStep} label="Location" />
        <div
          className={`h-0.5 w-16 transition-colors ${
            currentStep > 1 ? "bg-emerald-500" : "bg-white/10"
          }`}
        />
        <StepIndicator step={2} currentStep={currentStep} label="Details" />
        <div
          className={`h-0.5 w-16 transition-colors ${
            currentStep > 2 ? "bg-emerald-500" : "bg-white/10"
          }`}
        />
        <StepIndicator step={3} currentStep={currentStep} label="Review" />
      </div>

      {/* Form Container */}
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Location */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <MapPin size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Property Location</h2>
                    <p className="text-sm text-white/60">Enter the complete address</p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="123 Main Street, Apt 4B"
                    className={`input ${errors.address ? "border-red-500" : ""}`}
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-400">{errors.address}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Austin"
                      className={`input ${errors.city ? "border-red-500" : ""}`}
                    />
                    {errors.city && <p className="mt-1 text-sm text-red-400">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      State <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className={`input ${errors.state ? "border-red-500" : ""}`}
                    >
                      <option value="">Select state</option>
                      <option value="TX">Texas</option>
                      <option value="CA">California</option>
                      <option value="FL">Florida</option>
                      <option value="NY">New York</option>
                      <option value="WA">Washington</option>
                      <option value="CO">Colorado</option>
                      {/* Add more states as needed */}
                    </select>
                    {errors.state && <p className="mt-1 text-sm text-red-400">{errors.state}</p>}
                  </div>
                </div>

                <div className="sm:w-1/2">
                  <label className="mb-2 block text-sm font-medium text-white">
                    ZIP Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => updateField("zipCode", e.target.value)}
                    placeholder="78701"
                    maxLength={5}
                    className={`input ${errors.zipCode ? "border-red-500" : ""}`}
                  />
                  {errors.zipCode && <p className="mt-1 text-sm text-red-400">{errors.zipCode}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Property Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <Building2 size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Property Details</h2>
                    <p className="text-sm text-white/60">Help us understand the property</p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Property Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => updateField("propertyType", e.target.value)}
                    className={`input ${errors.propertyType ? "border-red-500" : ""}`}
                  >
                    <option value="">Select type</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">Single Family House</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.propertyType && <p className="mt-1 text-sm text-red-400">{errors.propertyType}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Bedrooms <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.bedrooms}
                      onChange={(e) => updateField("bedrooms", e.target.value)}
                      className={`input ${errors.bedrooms ? "border-red-500" : ""}`}
                    >
                      <option value="">Select</option>
                      {[0, 1, 2, 3, 4, 5, "6+"].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                    {errors.bedrooms && <p className="mt-1 text-sm text-red-400">{errors.bedrooms}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Bathrooms <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.bathrooms}
                      onChange={(e) => updateField("bathrooms", e.target.value)}
                      className={`input ${errors.bathrooms ? "border-red-500" : ""}`}
                    >
                      <option value="">Select</option>
                      {["1", "1.5", "2", "2.5", "3", "3.5", "4+"].map((num) => (
                        <option key={num} value={num}>
                          {num}
                        </option>
                      ))}
                    </select>
                    {errors.bathrooms && <p className="mt-1 text-sm text-red-400">{errors.bathrooms}</p>}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      Est. Rent/Month
                    </label>
                    <input
                      type="text"
                      value={formData.estimatedRent}
                      onChange={(e) => updateField("estimatedRent", e.target.value)}
                      placeholder="$2,500"
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Any additional information about the property or your interest..."
                    rows={4}
                    className="input resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <CheckCircle2 size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Review & Submit</h2>
                    <p className="text-sm text-white/60">Confirm your request details</p>
                  </div>
                </div>

                {/* Summary Card */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-base font-semibold text-white">Property Summary</h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Address:</span>
                      <span className="text-right font-medium text-white">
                        {formData.address}, {formData.city}, {formData.state} {formData.zipCode}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Property Type:</span>
                      <span className="font-medium text-white capitalize">{formData.propertyType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Bed/Bath:</span>
                      <span className="font-medium text-white">
                        {formData.bedrooms} bed / {formData.bathrooms} bath
                      </span>
                    </div>
                    {formData.estimatedRent && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Est. Rent:</span>
                        <span className="font-medium text-white">{formData.estimatedRent}</span>
                      </div>
                    )}
                    {formData.notes && (
                      <div>
                        <span className="text-white/60">Notes:</span>
                        <p className="mt-1 text-white/90">{formData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Speed */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-base font-semibold text-white">Verification Speed</h3>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value="standard"
                        checked={formData.priority === "standard"}
                        onChange={(e) => updateField("priority", e.target.value as "standard" | "priority")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-white/70" />
                          <span className="font-medium text-white">Standard (72 hours)</span>
                          <span className="text-xs text-emerald-400">Included</span>
                        </div>
                        <p className="mt-1 text-xs text-white/60">Regular verification timeline</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value="priority"
                        checked={formData.priority === "priority"}
                        onChange={(e) => updateField("priority", e.target.value as "standard" | "priority")}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Send size={16} className="text-emerald-400" />
                          <span className="font-medium text-white">Priority (24 hours)</span>
                          <span className="text-xs text-white/60">Pro+ Only</span>
                        </div>
                        <p className="mt-1 text-xs text-white/60">Fast-track verification for urgent deals</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="flex gap-3 rounded-lg border border-sky-400/20 bg-sky-500/10 p-4">
                  <Info size={20} className="text-sky-400 shrink-0" />
                  <p className="text-sm text-white/80">
                    Our team will verify landlord/HOA approval and check local STR/MTR regulations.
                    You'll receive an email when the verification is complete.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between gap-4">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <Link
                  href="/requests"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  Cancel
                </Link>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Submit Request
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) {
  const isActive = step === currentStep;
  const isComplete = step < currentStep;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
          isComplete
            ? "border-emerald-500 bg-emerald-500 text-white"
            : isActive
            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
            : "border-white/20 bg-white/5 text-white/40"
        }`}
      >
        {isComplete ? <CheckCircle2 size={18} /> : step}
      </div>
      <span
        className={`text-xs font-medium ${
          isActive ? "text-white" : "text-white/50"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
