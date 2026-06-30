"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Star, Phone, MapPin, LayoutDashboard, ArrowLeft,
  ExternalLink, UserCheck, MessageSquare, ArrowUpDown, Save,
} from "lucide-react";
import { JobStatusPanel } from "@/components/JobStatus";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { JobResponse } from "@/types/api";
import type { Business } from "@/types/business";
import { JobStatus } from "@/types/job";

type SortKey = "name-asc" | "name-desc" | "rating-desc" | "rating-asc" | "reviews-desc" | "reviews-asc";

function sortBusinesses(list: Business[], key: SortKey): Business[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case "name-asc":    return a.name.localeCompare(b.name);
      case "name-desc":   return b.name.localeCompare(a.name);
      case "rating-desc": return b.rating - a.rating;
      case "rating-asc":  return a.rating - b.rating;
      case "reviews-desc":return b.reviews - a.reviews;
      case "reviews-asc": return a.reviews - b.reviews;
      default:            return 0;
    }
  });
}

function BusinessCard({ business, index }: { business: Business; index: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        {/* Left: number + name + location */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex-shrink-0 text-xs font-bold text-slate-400 w-5">
              {index + 1}.
            </span>
            <h3 className="truncate font-semibold text-slate-900">{business.name}</h3>
            {business.googleMapsUrl && (
              <a
                href={business.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver en Maps"
                className="flex-shrink-0 text-slate-400 hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          {business.city && (
            <p className="mt-0.5 ml-7 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {business.city}
            </p>
          )}
        </div>

        {/* Right: rating + reviews */}
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-600">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {business.rating.toFixed(1)}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MessageSquare className="h-3 w-3" />
            {business.reviews > 0
              ? `${business.reviews.toLocaleString()} reseñas`
              : "Sin reseñas"}
          </div>
        </div>
      </div>

      {business.phone && (
        <div className="mt-3 ml-7 flex items-center gap-2 text-sm text-slate-600">
          <Phone className="h-4 w-4 text-slate-400" />
          <a href={`tel:${business.phone}`} className="hover:text-primary hover:underline">
            {business.phone}
          </a>
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rating-desc",  label: "Mejor nota" },
  { value: "rating-asc",   label: "Menor nota" },
  { value: "reviews-desc", label: "Más reseñas" },
  { value: "reviews-asc",  label: "Menos reseñas" },
  { value: "name-asc",     label: "Nombre A→Z" },
  { value: "name-desc",    label: "Nombre Z→A" },
];

export default function ResultsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const [data, setData] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rating-desc");
  const [claiming, setClaiming] = useState(false);
  const [claimedCollectionId, setClaimedCollectionId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchJob() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Error al obtener la búsqueda");
        }
        const result = (await response.json()) as JobResponse;
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error desconocido");
      }
    }

    fetchJob();
    const interval = setInterval(fetchJob, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId]);

  // useMemo must be called before any early returns (Rules of Hooks)
  const sortedBusinesses = useMemo(
    () => sortBusinesses(data?.businesses ?? [], sortKey),
    [data?.businesses, sortKey]
  );

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <p className="text-destructive">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  const { job, progress, discovery, businesses } = data;

  const isRunning = job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING;
  const isCompleted = job.status === JobStatus.COMPLETED;
  const isFailed = job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isCompleted
              ? `${discovery.businessesFound} negocios encontrados`
              : isFailed
                ? "La búsqueda falló"
                : "Buscando negocios…"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isRunning && (
            <>
              <ProgressBar value={progress.progress} />
              <JobStatusPanel progress={progress} startedAt={startedAt} />
            </>
          )}
          {isCompleted && (
            <p className="text-sm text-muted-foreground">
              &quot;{job.searchTerm}&quot; en {job.location} — búsqueda completada.
            </p>
          )}
          {isFailed && (
            <p className="text-sm text-destructive">{job.errorMessage}</p>
          )}
        </CardContent>
      </Card>

      {/* Full results list */}
      {isCompleted && businesses.length > 0 && (
        <div className="space-y-4">

          {/* Header + sort dropdown */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              {businesses.length} negocios latinos encontrados
            </h2>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <ArrowUpDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
              Ordenar:
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3">
            {sortedBusinesses.map((b: Business, i: number) => (
              <BusinessCard key={b.id} business={b} index={i} />
            ))}
          </div>

          {/* Dashboard CTA — three states */}
          {(() => {
            const isClaimed = claimedCollectionId || job.collectionId;

            // State 1: already saved (search was authenticated OR user just claimed)
            if (isLoggedIn && isClaimed) {
              return (
                <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 text-center">
                  <UserCheck className="mx-auto mb-3 h-8 w-8 text-green-600" />
                  <h3 className="mb-1 text-xl font-bold text-slate-900">
                    ¡Resultados guardados en tu cuenta!
                  </h3>
                  <p className="mb-5 text-sm text-slate-500">
                    Estos negocios están en tu dashboard. Puedes ver tu historial
                    completo, filtrar prospectos y dar seguimiento.
                  </p>
                  <Button asChild size="lg" className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700">
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Ver en el Dashboard
                    </Link>
                  </Button>
                </div>
              );
            }

            // State 2: logged in but public search — offer to save
            if (isLoggedIn && !isClaimed) {
              return (
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
                  <Save className="mx-auto mb-3 h-8 w-8 text-primary" />
                  <h3 className="mb-1 text-xl font-bold text-slate-900">
                    Guarda estos resultados en tu cuenta
                  </h3>
                  <p className="mb-5 text-sm text-slate-500">
                    Asocia esta búsqueda a tu perfil para verla en el dashboard,
                    filtrar por estado y dar seguimiento a cada prospecto.
                  </p>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto gap-2"
                    disabled={claiming}
                    onClick={async () => {
                      setClaiming(true);
                      try {
                        const res = await fetch(`/api/search/${jobId}/claim`, { method: "POST" });
                        const body = await res.json();
                        if (res.ok) setClaimedCollectionId(body.collectionId);
                      } finally {
                        setClaiming(false);
                      }
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {claiming ? "Guardando…" : "Guardar en mi cuenta"}
                  </Button>
                </div>
              );
            }

            // State 3: not logged in — prompt to sign up
            return (
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
                <LayoutDashboard className="mx-auto mb-3 h-8 w-8 text-primary" />
                <h3 className="mb-1 text-xl font-bold text-slate-900">
                  Guarda y gestiona tus prospectos
                </h3>
                <p className="mb-5 text-sm text-slate-500">
                  Crea tu cuenta gratis para guardar estos resultados, acceder a tu
                  historial y dar seguimiento a cada prospecto.
                </p>
                <Button asChild size="lg" className="w-full sm:w-auto gap-2">
                  <Link href={`/login?returnTo=/results/${jobId}`}>
                    <LayoutDashboard className="h-4 w-4" />
                    Crear cuenta gratis
                  </Link>
                </Button>
              </div>
            );
          })()}
        </div>
      )}

      {isCompleted && businesses.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <p className="font-medium text-slate-700">
              No encontramos negocios latinos con esos criterios.
            </p>
            <p className="text-sm text-muted-foreground">
              El filtro busca negocios que se identifiquen como <strong>empresas latinas o hispanas</strong> en esa categoría y ciudad.
              No todos los negocios tienen ese atributo registrado. Prueba con otra ciudad o industria con más presencia latina.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Nueva búsqueda
        </Link>
      </div>
    </div>
  );
}
