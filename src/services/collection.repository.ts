import { prisma } from "@/lib/db";
import { DEFAULT_SEARCH_FILTERS } from "@/lib/constants";
import { ensureDefaultProfile } from "@/lib/profile";
import type {
  Collection,
  CollectionDetail,
  CollectionListItem,
  CollectionSearchRunSummary,
  CreateCollectionInput,
  SearchFilters,
} from "@/types/collection";

function mapFilters(record: {
  minRating: number;
  maxReviews: number;
  latinoOnly: boolean;
}): SearchFilters {
  return {
    minRating: record.minRating,
    maxReviews: record.maxReviews,
    requiredAttributes: record.latinoOnly ? [...DEFAULT_SEARCH_FILTERS.requiredAttributes!] : [],
    provider: DEFAULT_SEARCH_FILTERS.provider,
    maxResults: DEFAULT_SEARCH_FILTERS.maxResults,
  };
}

function mapCollection(record: {
  id: string;
  name: string;
  searchTerm: string;
  location: string;
  minRating: number;
  maxReviews: number;
  latinoOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Collection {
  return {
    id: record.id,
    name: record.name,
    searchTerm: record.searchTerm,
    location: record.location,
    filters: mapFilters(record),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export class CollectionRepository {
  async findOrCreate(input: CreateCollectionInput): Promise<Collection> {
    const userId = await ensureDefaultProfile();
    const name = input.name?.trim() || `${input.searchTerm} — ${input.location}`;
    const minRating = input.filters?.minRating ?? DEFAULT_SEARCH_FILTERS.minRating ?? 4;
    const maxReviews = input.filters?.maxReviews ?? DEFAULT_SEARCH_FILTERS.maxReviews ?? 100;
    const latinoOnly = (input.filters?.requiredAttributes?.length ?? 0) > 0;

    const record = await prisma.collection.upsert({
      where: {
        userId_searchTerm_location: {
          userId,
          searchTerm: input.searchTerm.trim(),
          location: input.location.trim(),
        },
      },
      create: {
        userId,
        name,
        searchTerm: input.searchTerm.trim(),
        location: input.location.trim(),
        minRating,
        maxReviews,
        latinoOnly,
      },
      update: {
        name,
        minRating,
        maxReviews,
        latinoOnly,
      },
    });

    return mapCollection(record);
  }

  async findById(id: string): Promise<Collection | null> {
    const record = await prisma.collection.findUnique({ where: { id } });
    return record ? mapCollection(record) : null;
  }

  async findByIdOrThrow(id: string): Promise<Collection> {
    const collection = await this.findById(id);
    if (!collection) {
      throw new Error(`Collection not found: ${id}`);
    }
    return collection;
  }

  async listWithStats(): Promise<CollectionListItem[]> {
    const records = await prisma.collection.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        collectionBusinesses: { select: { businessId: true } },
        searchRuns: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { finishedAt: true, createdAt: true },
        },
      },
    });

    return records.map((record) => ({
      ...mapCollection(record),
      businessCount: record.collectionBusinesses.length,
      lastSearchAt: record.searchRuns[0]?.finishedAt ?? record.searchRuns[0]?.createdAt ?? null,
    }));
  }

  async getDetail(id: string): Promise<CollectionDetail | null> {
    const record = await prisma.collection.findUnique({
      where: { id },
      include: {
        collectionBusinesses: { select: { businessId: true } },
        searchRuns: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            businessesFound: true,
            newBusinesses: true,
            updatedBusinesses: true,
            executionTime: true,
            createdAt: true,
            finishedAt: true,
          },
        },
      },
    });

    if (!record) return null;

    const searchRuns: CollectionSearchRunSummary[] = record.searchRuns.map((run) => ({
      id: run.id,
      status: run.status,
      businessesFound: run.businessesFound,
      newBusinessesAdded: run.newBusinesses,
      businessesUpdated: run.updatedBusinesses,
      executionTimeMs: run.executionTime,
      createdAt: run.createdAt,
      completedAt: run.finishedAt,
    }));

    return {
      ...mapCollection(record),
      businessCount: record.collectionBusinesses.length,
      searchRuns,
    };
  }

  async count(): Promise<number> {
    return prisma.collection.count();
  }
}
