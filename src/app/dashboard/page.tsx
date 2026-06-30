"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@/types/api";
import type { CollectionListItem } from "@/types/collection";
import { FolderOpen, Plus, Users } from "lucide-react";

function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [collections, setCollections] = useState<CollectionListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, collectionsRes] = await Promise.all([
          fetch("/api/dashboard/summary"),
          fetch("/api/collections"),
        ]);

        if (!summaryRes.ok || !collectionsRes.ok) {
          throw new Error("Failed to load dashboard");
        }

        const summaryData = (await summaryRes.json()) as DashboardSummary;
        const collectionsData = (await collectionsRes.json()) as {
          collections: CollectionListItem[];
        };

        setSummary(summaryData);
        setCollections(collectionsData.collections);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    void load();
  }, []);

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!summary) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Gestiona tu base de prospectos latinos organizados por búsqueda.
          </p>
        </div>
        <Button asChild>
          <Link href="/">
            <Plus className="mr-2 h-4 w-4" />
            Nueva búsqueda
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total prospectos</CardDescription>
            <CardTitle className="text-3xl">{summary.totalLeads}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Colecciones</CardDescription>
            <CardTitle className="text-3xl">{summary.collectionsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nuevos prospectos</CardDescription>
            <CardTitle className="text-3xl">{summary.newLeads}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Último descubrimiento</CardDescription>
            <CardTitle className="text-lg">{formatDate(summary.lastDiscoveryAt)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Mis colecciones</h2>

        {collections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aún no tienes colecciones. Haz una búsqueda y guarda los resultados en tu cuenta.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {collections.map((collection) => (
              <Card key={collection.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      {collection.name}
                    </CardTitle>
                    <CardDescription>
                      {collection.searchTerm} · {collection.location}
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/collections/${collection.id}`}>Ver</Link>
                  </Button>
                </CardHeader>
                <CardContent className="flex gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {collection.businessCount} prospectos
                  </span>
                  <span>Última búsqueda: {formatDate(collection.lastSearchAt)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
