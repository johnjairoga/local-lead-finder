import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/constants";
import { container } from "@/lib/di/container";
import { AppError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const collection = await container.collectionService.getById(id);

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const filters = collection.filters;
    const job = await container.jobService.createAndEnqueue({
      collectionId: collection.id,
      searchTerm: collection.searchTerm,
      location: collection.location,
      maxResults: filters.maxResults ?? DEFAULT_SEARCH_FILTERS.maxResults ?? 50,
      provider: filters.provider ?? "google-maps",
    });

    return NextResponse.json({ jobId: job.id, collectionId: collection.id }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
