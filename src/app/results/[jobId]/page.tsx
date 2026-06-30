"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { JobStatusPanel } from "@/components/JobStatus";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import type { JobResponse } from "@/types/api";
import { JobStatus } from "@/types/job";

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

export default function ResultsPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
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
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    fetchJob();
    const interval = setInterval(fetchJob, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [jobId]);

  useEffect(() => {
    if (data?.job.status === JobStatus.COMPLETED) {
      const timer = setTimeout(() => router.push("/dashboard"), 4000);
      return () => clearTimeout(timer);
    }
  }, [data?.job.status, router]);

  if (error) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6 text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6 text-muted-foreground">Loading discovery run...</CardContent>
      </Card>
    );
  }

  const { job, progress, discovery } = data;
  const isFinished =
    job.status === JobStatus.COMPLETED ||
    job.status === JobStatus.FAILED ||
    job.status === JobStatus.CANCELLED;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {job.status === JobStatus.COMPLETED
              ? "Discovery Complete"
              : job.status === JobStatus.FAILED
                ? "Discovery Failed"
                : "Discovering Leads..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isFinished && (
            <>
              <ProgressBar value={progress.progress} />
              <JobStatusPanel progress={progress} startedAt={startedAt} />
            </>
          )}

          {job.status === JobStatus.FAILED && (
            <p className="text-sm text-destructive">{job.errorMessage}</p>
          )}

          {job.status === JobStatus.COMPLETED && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Search for &quot;{job.searchTerm}&quot; in {job.location} finished successfully.
              </p>
              <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                <div>
                  <p className="text-muted-foreground">Businesses Found</p>
                  <p className="text-2xl font-semibold">{discovery.businessesFound}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">New Businesses</p>
                  <p className="text-2xl font-semibold">{discovery.newBusinessesAdded}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Existing Updated</p>
                  <p className="text-2xl font-semibold">{discovery.businessesUpdated}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Execution Time</p>
                  <p className="text-2xl font-semibold">
                    {formatDuration(discovery.executionTimeMs)}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
              <Button className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
