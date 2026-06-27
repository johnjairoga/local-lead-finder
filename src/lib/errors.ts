export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class JobNotFoundError extends AppError {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`, "JOB_NOT_FOUND", 404);
    this.name = "JobNotFoundError";
  }
}

export class ScraperError extends AppError {
  constructor(message: string) {
    super(message, "SCRAPER_ERROR", 500);
    this.name = "ScraperError";
  }
}

export class ExportNotFoundError extends AppError {
  constructor(jobId: string) {
    super(`Export not found for job: ${jobId}`, "EXPORT_NOT_FOUND", 404);
    this.name = "ExportNotFoundError";
  }
}
