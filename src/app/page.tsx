"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, Star, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HomePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchTerm, location, maxResults }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start search");
      }

      router.push(`/results/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <MapPin className="h-3.5 w-3.5" />
          Powered by Google Maps
        </div>
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-slate-900">
          Find Local Business{" "}
          <span className="text-primary">Leads</span> in Seconds
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-lg text-slate-500">
          Enter a business type and city. We scan Google Maps, filter the best prospects,
          and hand you a ready-to-contact list — phone numbers included.
        </p>

        {/* Search form */}
        <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 text-left">
                <Label htmlFor="searchTerm" className="font-semibold text-slate-700">
                  Business type
                </Label>
                <Input
                  id="searchTerm"
                  placeholder="e.g. HVAC contractor, dentist, gym…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="location" className="font-semibold text-slate-700">
                  City
                </Label>
                <Input
                  id="location"
                  placeholder="e.g. Miami, FL"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="maxResults" className="font-semibold text-slate-700">
                Number of businesses to search
              </Label>
              <div className="flex items-center gap-4">
                <input
                  id="maxResults"
                  type="range"
                  min={10}
                  max={200}
                  step={10}
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  disabled={loading}
                  className="h-2 flex-1 cursor-pointer accent-primary"
                />
                <span className="w-16 rounded-lg border bg-slate-50 py-1 text-center text-sm font-semibold text-slate-700">
                  {maxResults}
                </span>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 text-base"
              disabled={loading}
            >
              <Search className="h-4 w-4" />
              {loading ? "Starting search…" : "Find Leads Now"}
            </Button>
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-800">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-slate-800">1. Search</h3>
            <p className="text-sm text-slate-500">
              Enter the type of business and city you want to target.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Star className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="mb-2 font-semibold text-slate-800">2. Filter</h3>
            <p className="text-sm text-slate-500">
              We automatically filter and score each business based on ratings and reviews.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-2 font-semibold text-slate-800">3. Contact</h3>
            <p className="text-sm text-slate-500">
              Get the full list with phone numbers and start reaching out right away.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
