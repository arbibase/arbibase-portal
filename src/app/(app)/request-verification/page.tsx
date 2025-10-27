"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  CheckCircle2,
  Info,
  Send,
  Plus,
  Trash2,
} from "lucide-react";

type PropertyInput = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyUrl: string;
  notes: string;
};

export default function RequestVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [properties, setProperties] = useState<PropertyInput[]>([
    {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      propertyUrl: "",
      notes: "",
    },
  ]);

  const [errors, setErrors] = useState<
    Record<number, Partial<Record<keyof PropertyInput, string>>>
  >({});

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
  }

  const addProperty = () => {
    setProperties([
      ...properties,
      {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        propertyUrl: "",
        notes: "",
      },
    ]);
  };

  const removeProperty = (index: number) => {
    if (properties.length > 1) {
      setProperties(properties.filter((_, i) => i !== index));
      // Clean up errors for removed property
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const updateProperty = (
    index: number,
    field: keyof PropertyInput,
    value: string
  ) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], [field]: value };
    setProperties(updated);

    // Clear error when user starts typing
    if (errors[index]?.[field]) {
      const newErrors = { ...errors };
      if (newErrors[index]) {
        delete newErrors[index][field];
        setErrors(newErrors);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<number, Partial<Record<keyof PropertyInput, string>>> = {};
    let isValid = true;

    properties.forEach((property, index) => {
      const propertyErrors: Partial<Record<keyof PropertyInput, string>> = {};

      if (!property.address.trim()) propertyErrors.address = "Address is required";
      if (!property.city.trim()) propertyErrors.city = "City is required";
      if (!property.state.trim()) propertyErrors.state = "State is required";
      if (!property.zipCode.trim()) {
        propertyErrors.zipCode = "ZIP code is required";
      } else if (!/^\d{5}$/.test(property.zipCode)) {
        propertyErrors.zipCode = "ZIP code must be 5 digits";
      }
      if (!property.propertyUrl.trim()) {
        propertyErrors.propertyUrl = "Property URL is required";
      }

      if (Object.keys(propertyErrors).length > 0) {
        newErrors[index] = propertyErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      if (!supabase) throw new Error("Supabase not initialized");

      // Insert each property request into database
      for (const property of properties) {
        const { error } = await supabase.from("property_requests").insert({
          address: property.address,
          city: property.city,
          state: property.state,
          zip_code: property.zipCode,
          property_url: property.propertyUrl || null,
          notes: property.notes || null,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      setSubmitSuccess(true);

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push("/requests");
      }, 3000);
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit requests. Please try again.");
    } finally {
      setSubmitting(false);
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
            <h2 className="text-2xl font-bold text-white mb-2">
              {properties.length === 1
                ? "Request Submitted!"
                : `${properties.length} Requests Submitted!`}
            </h2>
            <p className="text-white/60 mb-6">
              We've received your verification{" "}
              {properties.length === 1 ? "request" : "requests"}. Our team will
              review within 72 hours.
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
          Submit addresses for our team to verify landlord approval and STR/MTR
          eligibility
        </p>
      </header>

      {/* Form Container */}
      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Cards */}
          {properties.map((property, index) => (
            <div
              key={index}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <MapPin size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Property{" "}
                      {properties.length > 1 ? `#${index + 1}` : ""}
                    </h2>
                    <p className="text-sm text-white/60">
                      Enter the complete address
                    </p>
                  </div>
                </div>
                {properties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProperty(index)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300 hover:bg-red-500/20"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Street Address */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Street Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={property.address}
                    onChange={(e) =>
                      updateProperty(index, "address", e.target.value)
                    }
                    placeholder="123 Main Street, Apt 4B"
                    className={`input ${
                      errors[index]?.address ? "border-red-500" : ""
                    }`}
                  />
                  {errors[index]?.address && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors[index].address}
                    </p>
                  )}
                </div>

                {/* City, State, ZIP */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={property.city}
                      onChange={(e) =>
                        updateProperty(index, "city", e.target.value)
                      }
                      placeholder="Austin"
                      className={`input ${
                        errors[index]?.city ? "border-red-500" : ""
                      }`}
                    />
                    {errors[index]?.city && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors[index].city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      State <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={property.state}
                      onChange={(e) =>
                        updateProperty(index, "state", e.target.value)
                      }
                      className={`input ${
                        errors[index]?.state ? "border-red-500" : ""
                      }`}
                    >
                      <option value="">Select state</option>
                      <option value="TX">Texas</option>
                      <option value="CA">California</option>
                      <option value="FL">Florida</option>
                      <option value="NY">New York</option>
                      <option value="WA">Washington</option>
                      <option value="CO">Colorado</option>
                    </select>
                    {errors[index]?.state && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors[index].state}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">
                      ZIP Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={property.zipCode}
                      onChange={(e) =>
                        updateProperty(index, "zipCode", e.target.value)
                      }
                      placeholder="78701"
                      maxLength={5}
                      className={`input ${
                        errors[index]?.zipCode ? "border-red-500" : ""
                      }`}
                    />
                    {errors[index]?.zipCode && (
                      <p className="mt-1 text-sm text-red-400">
                        {errors[index].zipCode}
                      </p>
                    )}
                  </div>
                </div>

                {/* Property URL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Property URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={property.propertyUrl}
                    onChange={(e) =>
                      updateProperty(index, "propertyUrl", e.target.value)
                    }
                    placeholder="https://zillow.com/property/..."
                    className={`input ${
                      errors[index]?.propertyUrl ? "border-red-500" : ""
                    }`}
                  />
                  {errors[index]?.propertyUrl && (
                    <p className="mt-1 text-sm text-red-400">
                      {errors[index].propertyUrl}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-white/50">
                    Link to Zillow, Apartments.com, or property website
                  </p>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Additional Notes{" "}
                    <span className="text-white/50">(Optional)</span>
                  </label>
                  <textarea
                    value={property.notes}
                    onChange={(e) =>
                      updateProperty(index, "notes", e.target.value)
                    }
                    placeholder="Any additional information about the property or your interest..."
                    rows={3}
                    className="input resize-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Add Property Button */}
          <button
            type="button"
            onClick={addProperty}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-6 py-4 text-sm font-semibold text-white/90 hover:border-emerald-400/40 hover:bg-white/10"
          >
            <Plus size={18} /> Add Another Property
          </button>

          {/* Info Banner */}
          <div className="flex gap-3 rounded-lg border border-sky-400/20 bg-sky-500/10 p-4">
            <Info size={20} className="text-sky-400 shrink-0" />
            <p className="text-sm text-white/80">
              Our team will verify landlord/HOA approval and check local STR/MTR
              regulations for each property. You'll receive an email when the
              verifications are complete (typically within 72 hours).
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/requests"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting {properties.length}{" "}
                  {properties.length === 1 ? "Request" : "Requests"}...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit{" "}
                  {properties.length > 1
                    ? `${properties.length} Requests`
                    : "Request"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
