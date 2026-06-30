"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Star, Phone, MapPin, Lock } from "lucide-react";
import { JobStatusPanel } from "@/components/JobStatus";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import type { JobResponse } from "@/types/api";
import type { Business } from "@/types/business";
import { JobStatus } from "@/types/job";

const PREVIEW_COUNT = 3;

function BusinessPreviewCard({ business }: { business: Business }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{business.name}</h3>
          {business.city && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {business.city}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {business.rating.toFixed(1)}
          <span className="font-normal text-amber-500/70">({business.reviews})</span>
        </div>
      </div>
      {business.phone && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <Phone className="h-4 w-4 text-slate-400" />
          {business.phone}
        </div>
      )}
    </div>
  );
}

function BlurredRow() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-white p-5">
      <div className="space-y-2 blur-sm select-none">
        <div className="h-5 w-48 rounded bg-slate-200" />
        <div className="h-4 w-32 rounded bg-slate-100" />
        <div className="h-4 w-40 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const [data, setData] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());

  useEffect(() => {
    let active = true;

    async function fetchJob() {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error ?? "Failed to fetch job");
        }
        const result = (await response.json()) as JobResponse;
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    fetchJob();
    const interval = setInterval(fetchJob, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId]);

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
        Loading…
      </div>
    );
  }

  const { job, progress, discovery, businesses } = data;

  const isRunning =
    job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING;
  const isCompleted = job.status === JobStatus.COMPLETED;
  const isFailed =
    job.status === JobStatus.FAILED || job.status === JobStatus.CANCELLED;

  const preview: Business[] = businesses.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, businesses.length - PREVIEW_COUNT);

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
                : "Buscando en Google Maps…"}
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

      {/* Preview results */}
      {isCompleted && businesses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Vista previa — primeros {Math.min(PREVIEW_COUNT, businesses.length)} resultados
          </h2>

          <div className="space-y-3">
            {preview.map((b) => (
              <BusinessPreviewCard key={b.id} business={b} />
            ))}
          </div>

          {/* Blurred locked rows */}
          {hiddenCount > 0 && (
            <div className="space-y-3">
              {Array.from({ length: Math.min(hiddenCount, 3) }).map((_, i) => (
                <BlurredRow key={i} />
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
            <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-1 text-xl font-bold text-slate-900">
              {hiddenCount > 0
                ? `+ ${hiddenCount} negocios más te esperan`
                : "Guarda y gestiona tus prospectos"}
            </h3>
            <p className="mb-5 text-sm text-slate-500">
              Inicia sesión para ver la lista completa con teléfonos, filtrar
              por estado y hacer seguimiento a cada prospecto.
            </p>
            <Button asChild size="lg" className="w-full sm:w-auto gap-2">
              <Link href="/login">
                Acceder a la lista completa — Gratis
              </Link>
            </Button>
          </div>
        </div>
      )}

      {isCompleted && businesses.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No encontramos negocios con esos criterios. Prueba con otro término o ciudad.
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-600 hover:underline">
          ← Nueva búsqueda
        </Link>
      </div>
    </div>
  );
}
