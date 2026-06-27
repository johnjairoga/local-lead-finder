import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/di/container";
import { AppError } from "@/lib/errors";
import type { CreateSearchRequest } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSearchRequest;

    const job = await container.jobService.createAndEnqueue({
      searchTerm: body.searchTerm,
      location: body.location,
      maxResults: body.maxResults,
      provider: (body.provider as "google-maps") ?? "google-maps",
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
