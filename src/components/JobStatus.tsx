import { estimateRemainingSeconds, formatDuration } from "@/lib/utils";
import type { JobProgress } from "@/types/job";

interface JobStatusPanelProps {
  progress: JobProgress;
  startedAt: number;
}

export function JobStatusPanel({ progress, startedAt }: JobStatusPanelProps) {
  const elapsedMs = Date.now() - startedAt;
  const remaining = estimateRemainingSeconds(
    progress.processed,
    progress.total,
    elapsedMs
  );

  return (
    <div className="space-y-2 text-sm">
      {progress.currentBusiness && (
        <p>
          <span className="text-muted-foreground">Analizando: </span>
          <span className="font-medium">{progress.currentBusiness}</span>
        </p>
      )}

      <p>
        <span className="text-muted-foreground">Procesados: </span>
        <span className="font-medium">
          {progress.processed} / {progress.total || "—"}
        </span>
      </p>

      {remaining !== null && (
        <p>
          <span className="text-muted-foreground">Tiempo estimado: </span>
          <span className="font-medium">{formatDuration(remaining)}</span>
        </p>
      )}
    </div>
  );
}
