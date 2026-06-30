"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BusinessTable } from "@/components/BusinessTable";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Business } from "@/types/business";
import type { CollectionDetail } from "@/types/collection";
import { ArrowLeft, Play } from "lucide-react";

function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

export default function CollectionPage() {
  const params = useParams<{ id: string }>();
  const collectionId = params.id;

  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [collectionRes, businessesRes] = await Promise.all([
          fetch(`/api/collections/${collectionId}`),
          fetch(`/api/collections/${collectionId}/businesses`),
        ]);

        if (!collectionRes.ok || !businessesRes.ok) {
          throw new Error("Failed to load collection");
        }

        const collectionData = (await collectionRes.json()) as CollectionDetail;
        const businessesData = (await businessesRes.json()) as { businesses: Business[] };

        setCollection(collectionData);
        setBusinesses(
          businessesData.businesses.map((b) => ({
            ...b,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
            lastSeenAt: new Date(b.lastSeenAt),
          }))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    void load();
  }, [collectionId]);

  async function runAgain() {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections/${collectionId}/run`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start search");
      }

      window.location.href = `/results/${data.jobId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setRunning(false);
    }
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (!collection) {
    return <p className="text-muted-foreground">Cargando colección...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Link>
        </Button>
        <Button onClick={runAgain} disabled={running}>
          <Play className="mr-2 h-4 w-4" />
          {running ? "Iniciando..." : "Buscar de nuevo"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{collection.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {collection.searchTerm} · {collection.location} · {collection.businessCount} leads
          </p>
        </CardHeader>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial de búsquedas</h2>
        <div className="rounded-lg border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3">Fecha</th>
                <th className="p-3">Encontrados</th>
                <th className="p-3">Nuevos</th>
                <th className="p-3">Actualizados</th>
                <th className="p-3">Duración</th>
                <th className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {collection.searchRuns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Sin búsquedas aún.
                  </td>
                </tr>
              ) : (
                collection.searchRuns.map((run) => (
                  <tr key={run.id} className="border-b">
                    <td className="p-3">{formatDate(run.completedAt ?? run.createdAt)}</td>
                    <td className="p-3">{run.businessesFound}</td>
                    <td className="p-3">{run.newBusinessesAdded}</td>
                    <td className="p-3">{run.businessesUpdated}</td>
                    <td className="p-3">{formatDuration(run.executionTimeMs)}</td>
                    <td className="p-3">{run.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Prospectos descubiertos</h2>
        <BusinessTable
          businesses={businesses}
          onStatusChange={(businessId, status) => {
            setBusinesses((prev) =>
              prev.map((b) => (b.id === businessId ? { ...b, status } : b))
            );
          }}
        />
      </section>
    </div>
  );
}
