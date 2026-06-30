import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/constants";
import { container } from "@/lib/di/container";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { CreateSearchRequest } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSearchRequest;

    // Check for an authenticated session (optional — public searches are allowed)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let jobId: string;
    let collectionId: string | undefined;

    if (user) {
      // Authenticated flow: create/find a collection and tie the run to it
      const collection = await container.collectionService.findOrCreate({
        name: body.collectionName,
        searchTerm: body.searchTerm,
        location: body.location,
        filters: {
          ...DEFAULT_SEARCH_FILTERS,
          maxResults: body.maxResults,
          provider: (body.provider as "google-maps") ?? DEFAULT_SEARCH_FILTERS.provider,
        },
      });

      const job = await container.jobService.createAndEnqueue({
        collectionId: collection.id,
        searchTerm: body.searchTerm,
        location: body.location,
        maxResults: body.maxResults,
        provider: (body.provider as "google-maps") ?? "google-maps",
      });

      jobId = job.id;
      collectionId = collection.id;
    } else {
      // Public flow: run without a collection (businesses saved globally)
      const job = await container.jobService.createAndEnqueue({
        searchTerm: body.searchTerm,
        location: body.location,
        maxResults: body.maxResults,
        provider: (body.provider as "google-maps") ?? "google-maps",
      });

      jobId = job.id;
    }

    return NextResponse.json({ jobId, collectionId }, { status: 201 });
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
