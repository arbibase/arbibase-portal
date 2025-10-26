"use client";

import { useState } from "react";
import { EnvelopeSimple, Phone, MapPin, Clock } from "@phosphor-icons/react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    subject: "",
    message: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.category) {
      newErrors.category = "Please select a category";
    }
    if (formData.subject.length < 5) {
      newErrors.subject = "Subject must be at least 5 characters long";
    }
    if (formData.message.length < 20) {
      newErrors.message = "Message must be at least 20 characters long";
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        // Replace with your actual API endpoint
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setSubmitSuccess(true);
        setFormData({
          name: "",
          email: "",
          phone: "",
          category: "",
          subject: "",
          message: ""
        });
        setTimeout(() => setSubmitSuccess(false), 5000);
      } catch (error) {
        console.error("Error submitting form:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="mx-auto max-w-[1140px] px-4 py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-extrabold text-white">Get in Touch</h1>
        <p className="text-lg text-white/70">
          Have questions about ArbiBase? We're here to help.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name & Email */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input ${errors.name ? "border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="John Doe"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input ${errors.email ? "border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>
              </div>

              {/* Phone & Category */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-medium text-white">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`input ${errors.phone ? "border-red-500 focus:ring-red-500/30" : ""}`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="category" className="mb-2 block text-sm font-medium text-white">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`input ${errors.category ? "border-red-500 focus:ring-red-500/30" : ""}`}
                  >
                    <option value="">Select a category</option>
                    <option value="general">General Inquiry</option>
                    <option value="properties">Property Verification</option>
                    <option value="technical">Technical Support</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-red-400">{errors.category}</p>}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-medium text-white">
                  Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={`input ${errors.subject ? "border-red-500 focus:ring-red-500/30" : ""}`}
                  placeholder="How can we help you?"
                />
                {errors.subject && <p className="mt-1 text-sm text-red-400">{errors.subject}</p>}
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-white">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className={`input resize-none ${errors.message ? "border-red-500 focus:ring-red-500/30" : ""}`}
                  placeholder="Tell us more about your inquiry..."
                ></textarea>
                {errors.message && <p className="mt-1 text-sm text-red-400">{errors.message}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-[0_0_22px_rgba(16,185,129,.28)] transition-all hover:bg-emerald-600 hover:shadow-[0_0_32px_rgba(16,185,129,.38)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>

              {/* Success Message */}
              {submitSuccess && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center text-emerald-300">
                  Thank you for your message! We'll get back to you within 24 hours.
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact Details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-6 text-xl font-bold text-white">Contact Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <MapPin size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Address</p>
                  <p className="text-sm text-white/70">123 Innovation Street</p>
                  <p className="text-sm text-white/70">San Francisco, CA 94105</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <Phone size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Phone</p>
                  <p className="text-sm text-white/70">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <EnvelopeSimple size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Email</p>
                  <p className="text-sm text-white/70">support@arbibase.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-bold text-white">Business Hours</h2>
            
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                <Clock size={20} className="text-emerald-400" />
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-white/70">Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                <p className="text-white/70">Saturday: 10:00 AM - 4:00 PM PST</p>
                <p className="text-white/70">Sunday: Closed</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-sky-500/10 p-6">
            <h3 className="mb-3 font-semibold text-white">Need immediate assistance?</h3>
            <p className="mb-4 text-sm text-white/70">
              Check out our resources or schedule a call with our team.
            </p>
            <div className="space-y-2">
              <a
                href="https://www.arbibase.com/faq"
                className="block rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white transition-all hover:bg-white/10"
              >
                View FAQ
              </a>
              <a
                href="https://www.arbibase.com/pricing"
                className="block rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white transition-all hover:bg-white/10"
              >
                See Pricing
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
