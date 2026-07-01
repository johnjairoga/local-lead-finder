import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/constants";
import { container } from "@/lib/di/container";
import { AppError } from "@/lib/errors";
import { getBusinessIdsFromMetadata } from "@/jobs/job.repository";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { CreateSearchRequest } from "@/types/api";

/** Resolve business names to skip from a prior job so the scraper avoids re-visiting them. */
async function resolveSkipNames(previousJobId: string): Promise<string[]> {
  try {
    const record = await prisma.searchRun.findUnique({
      where: { id: previousJobId },
      select: { metadata: true, collectionId: true },
    });
    if (!record) return [];

    // Get business IDs from the previous run (stored in metadata for public runs,
    // or from the collection for authenticated runs)
    let businessIds: string[] = getBusinessIdsFromMetadata(record.metadata);

    if (businessIds.length === 0 && record.collectionId) {
      const links = await prisma.collectionBusiness.findMany({
        where: { collectionId: record.collectionId },
        select: { businessId: true },
      });
      businessIds = links.map((l) => l.businessId);
    }

    if (businessIds.length === 0) return [];

    const businesses = await prisma.business.findMany({
      where: { id: { in: businessIds } },
      select: { name: true },
    });

    return businesses.map((b) => b.name.trim().toLowerCase());
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateSearchRequest;

    // Check for an authenticated session (optional — public searches are allowed)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Resolve skip names from a previous job (for expanded searches)
    const skipBusinessNames = body.previousJobId
      ? await resolveSkipNames(body.previousJobId)
      : [];

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
        skipBusinessNames,
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
        skipBusinessNames,
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
