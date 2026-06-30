import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

/**
 * POST /api/search/[jobId]/claim
 *
 * Associates a public (no-collection) search run with the authenticated user.
 * Creates a Collection for the user, links all discovered businesses to it,
 * and updates the SearchRun.collectionId so the dashboard reflects the data.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;

    // Require authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Load the search run
    const run = await prisma.searchRun.findUnique({ where: { id: jobId } });

    if (!run) {
      return NextResponse.json({ error: "Búsqueda no encontrada" }, { status: 404 });
    }

    // Already claimed — just return the existing collectionId
    if (run.collectionId) {
      return NextResponse.json({ collectionId: run.collectionId });
    }

    // Extract searchTerm, location and businessIds from metadata
    const meta = (run.metadata ?? {}) as {
      searchTerm?: string;
      location?: string;
      businessIds?: string[];
    };

    const searchTerm = meta.searchTerm ?? "Búsqueda";
    const location = meta.location ?? "";
    const businessIds: string[] = meta.businessIds ?? [];

    // Ensure the user's Profile row exists
    await prisma.profile.upsert({
      where: { id: user.id },
      create: { id: user.id },
      update: {},
    });

    // Create (or find existing) collection for this user + search combination
    const latinoOnly =
      (DEFAULT_SEARCH_FILTERS.requiredAttributes?.length ?? 0) > 0;

    const collection = await prisma.collection.upsert({
      where: {
        userId_searchTerm_location: {
          userId: user.id,
          searchTerm: searchTerm.trim(),
          location: location.trim(),
        },
      },
      create: {
        userId: user.id,
        name: `${searchTerm} — ${location}`,
        searchTerm: searchTerm.trim(),
        location: location.trim(),
        minRating: DEFAULT_SEARCH_FILTERS.minRating ?? 4,
        maxReviews: DEFAULT_SEARCH_FILTERS.maxReviews ?? 99999,
        latinoOnly,
      },
      update: {},
    });

    // Link every discovered business to the collection (skip already linked)
    if (businessIds.length > 0) {
      await prisma.collectionBusiness.createMany({
        data: businessIds.map((businessId) => ({
          collectionId: collection.id,
          businessId,
        })),
        skipDuplicates: true,
      });
    }

    // Update the search run to point to the new collection
    await prisma.searchRun.update({
      where: { id: jobId },
      data: { collectionId: collection.id },
    });

    return NextResponse.json({ collectionId: collection.id });
  } catch (error) {
    console.error("[claim]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
