import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function estimateRemainingSeconds(
  processed: number,
  total: number,
  elapsedMs: number
): number | null {
  if (processed <= 0 || total <= 0 || processed >= total) return null;
  const msPerItem = elapsedMs / processed;
  return ((total - processed) * msPerItem) / 1000;
}
