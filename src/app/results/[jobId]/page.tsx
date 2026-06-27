"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { JobStatusPanel } from "@/components/JobStatus";
import { LeadTable } from "@/components/LeadTable";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import type { JobResponse } from "@/types/api";
import { JobStatus } from "@/types/job";
import { Download } from "lucide-react";

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
        <CardContent className="pt-6 text-muted-foreground">Loading job...</CardContent>
      </Card>
    );
  }

  const { job, progress, leads } = data;
  const isFinished =
    job.status === JobStatus.COMPLETED ||
    job.status === JobStatus.FAILED ||
    job.status === JobStatus.CANCELLED;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {job.status === JobStatus.COMPLETED
              ? "Results"
              : job.status === JobStatus.FAILED
                ? "Search Failed"
                : "Searching..."}
          </CardTitle>
          {job.status === JobStatus.COMPLETED && (
            <Button asChild variant="outline" size="sm">
              <a href={`/api/jobs/${jobId}/download`} download>
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!isFinished && (
            <>
              <ProgressBar value={progress.progress} />
              <JobStatusPanel
                progress={progress}
                startedAt={startedAt}
              />
            </>
          )}

          {job.status === JobStatus.FAILED && (
            <p className="text-sm text-destructive">{job.errorMessage}</p>
          )}

          {job.status === JobStatus.COMPLETED && (
            <p className="text-sm text-muted-foreground">
              Found {leads.length} qualified lead{leads.length !== 1 ? "s" : ""} for
              &quot;{job.searchTerm}&quot; in {job.location}.
            </p>
          )}
        </CardContent>
      </Card>

      {job.status === JobStatus.COMPLETED && <LeadTable leads={leads} />}
    </div>
  );
}
