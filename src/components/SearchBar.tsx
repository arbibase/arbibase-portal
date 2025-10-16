"use client";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

type SearchValues = {
  q: string;
  city: string;
  state: string;
  zip: string;
  minPrice: string;
  maxPrice: string;
  type: string;
  beds?: string;
  baths?: string;
  furnishing?: string;
  utilities?: string;
  approval?: string;
  amenities?: string[];
};

type Props = {
  tier: "basic" | "advanced"; // user tier
  initial?: Partial<SearchValues>;
  onSearch: (values: SearchValues) => void;
};

export default function SearchBar({ tier, initial = {}, onSearch }: Props) {
  const [tab, setTab] = useState<"quick" | "advanced">("quick");
  const [values, setValues] = useState<SearchValues>({
    q: "",
    city: "",
    state: "",
    zip: "",
    minPrice: "",
    maxPrice: "",
    type: "",
    beds: "",
    baths: "",
    furnishing: "",
    utilities: "",
    approval: "",
    amenities: [],
    ...initial,
  });

  const set = (k: keyof SearchValues, val: any) => setValues(prev => ({ ...prev, [k]: val }));

  const toggleAmenity = (a: string) => {
    setValues(prev => ({
      ...prev,
      amenities: prev.amenities?.includes(a)
        ? prev.amenities.filter(i => i !== a)
        : [...(prev.amenities || []), a],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(values);
  };

  const isAdvanced = tier === "advanced" || tab === "advanced";

  return (
    <section aria-label="Search" className="search-section">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h2 className="text-center text-2xl font-bold tracking-tight text-white">
          Find Your Next Opportunity
        </h2>
        <p className="mt-1 text-center text-sm text-neutral-400 max-w-2xl mx-auto">
          Search for pre-approved properties in your target market with quick or advanced filters.
        </p>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/60 backdrop-blur-md shadow-lg">
          {/* Tabs */}
          <div className="flex justify-center gap-3 border-b border-neutral-800 px-4 pt-4">
            <button
              type="button"
              onClick={() => setTab("quick")}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                tab === "quick" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Search className="inline-block h-4 w-4 mr-1" />
              Quick Search
            </button>
            {tier === "advanced" && (
              <button
                type="button"
                onClick={() => setTab("advanced")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${
                  tab === "advanced" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                <SlidersHorizontal className="inline-block h-4 w-4 mr-1" />
                Advanced Filters
              </button>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 grid gap-3">
            {tab === "quick" && (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Address, city, state, or ZIP…"
                    className="input"
                    value={values.q}
                    onChange={e => set("q", e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min Rent"
                      className="input"
                      value={values.minPrice}
                      onChange={e => set("minPrice", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max Rent"
                      className="input"
                      value={values.maxPrice}
                      onChange={e => set("maxPrice", e.target.value)}
                    />
                  </div>
                  <select
                    value={values.type}
                    onChange={e => set("type", e.target.value)}
                    className="input"
                  >
                    <option value="">Property Type</option>
                    <option>Apartment</option>
                    <option>House</option>
                    <option>Townhome</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-4 mt-2 text-sm text-neutral-400">
                  {["Available Now", "High ROI", "Pet Friendly"].map(c => (
                    <label key={c} className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" className="accent-emerald-500" /> {c}
                    </label>
                  ))}
                </div>
              </>
            )}

            {isAdvanced && tab === "advanced" && (
              <div className="grid md:grid-cols-3 gap-3">
                <select className="input" value={values.beds} onChange={e => set("beds", e.target.value)}>
                  <option>Beds</option>
                  <option>Studio</option>
                  <option>1+</option>
                  <option>2+</option>
                  <option>3+</option>
                </select>
                <select className="input" value={values.baths} onChange={e => set("baths", e.target.value)}>
                  <option>Baths</option>
                  <option>1+</option>
                  <option>2+</option>
                  <option>3+</option>
                </select>
                <select
                  className="input"
                  value={values.furnishing}
                  onChange={e => set("furnishing", e.target.value)}
                >
                  <option>Furnishing</option>
                  <option>Furnished</option>
                  <option>Unfurnished</option>
                </select>
                <select
                  className="input"
                  value={values.utilities}
                  onChange={e => set("utilities", e.target.value)}
                >
                  <option>Utilities</option>
                  <option>Included</option>
                  <option>Not Included</option>
                </select>
                <select
                  className="input"
                  value={values.approval}
                  onChange={e => set("approval", e.target.value)}
                >
                  <option>Approval</option>
                  <option>Short-Term</option>
                  <option>Mid-Term</option>
                  <option>Co-Host</option>
                </select>
                <select
                  className="input"
                  value={values.type}
                  onChange={e => set("type", e.target.value)}
                >
                  <option>Property Type</option>
                  <option>Apartment</option>
                  <option>House</option>
                  <option>Townhome</option>
                </select>

                <div className="md:col-span-3 flex flex-wrap gap-4 mt-2 text-sm text-neutral-400">
                  {["Pool", "Patio", "Storage", "Gym", "Jacuzzi"].map(a => (
                    <label key={a} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-emerald-500"
                        checked={values.amenities?.includes(a)}
                        onChange={() => toggleAmenity(a)}
                      />{" "}
                      {a}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-center">
              <button type="submit" className="btn primary px-6 py-2.5 rounded-lg">
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .input {
          border-radius: 8px;
          border: 1px solid #2a3441;
          background: #0f141c;
          padding: 8px 10px;
          font-size: 14px;
          color: #fff;
          width: 100%;
        }
        .input:focus {
          outline: none;
          border-color: #10b981;
        }
      `}</style>
    </section>
  );
}
