import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search, Star } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Local Lead Finder AI
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600">
          Search Google Maps and automatically discover qualified local businesses
          with smart filtering and Latino-owned business detection.
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/search">Start Finding Leads</Link>
        </Button>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <Search className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Search</CardTitle>
            <CardDescription>
              Enter your niche and location to scan Google Maps results.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Star className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Filter</CardTitle>
            <CardDescription>
              Rating &ge; 4, reviews &le; 100, and Latino-owned attributes.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <MapPin className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Export</CardTitle>
            <CardDescription>
              View leads in-app or download a JSON report when complete.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </section>
    </div>
  );
}
