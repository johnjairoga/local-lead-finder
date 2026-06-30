import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Business, BusinessStatus, UpsertBusinessResult } from "@/types/business";
import type { BusinessAttribute } from "@/scraper/types";
import type { ScrapedBusiness } from "@/scraper/types";

function mapAttributes(value: Prisma.JsonValue): BusinessAttribute[] {
  return Array.isArray(value) ? (value as unknown as BusinessAttribute[]) : [];
}

/**
 * Extracts city name from a typical US address string.
 * "123 Main St, Dallas, TX 75001, United States" → "Dallas"
 */
function extractCity(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  // City is usually the second segment; if the address has only one part, skip
  if (parts.length >= 2) {
    const candidate = parts[1];
    // Reject if it looks like a state abbreviation or ZIP code
    if (/^\d+$/.test(candidate) || /^[A-Z]{2}$/.test(candidate)) return null;
    return candidate;
  }
  return null;
}

function mapBusiness(record: {
  id: string;
  name: string;
  googleMapsUrl: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  rating: number;
  reviews: number;
  businessAttributes: Prisma.JsonValue;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}): Business {
  return {
    id: record.id,
    name: record.name,
    googleMapsUrl: record.googleMapsUrl,
    phone: record.phone,
    email: record.email,
    city: record.city ?? null,
    country: record.country ?? null,
    rating: record.rating,
    reviews: record.reviews,
    businessAttributes: mapAttributes(record.businessAttributes),
    status: record.status as BusinessStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastSeenAt: record.lastSeenAt,
  };
}

export class BusinessRepository {
  async upsertFromDiscovery(
    collectionId: string,
    businesses: ScrapedBusiness[]
  ): Promise<UpsertBusinessResult> {
    let newBusinessesAdded = 0;
    let businessesUpdated = 0;
    const now = new Date();

    for (const scraped of businesses) {
      const existing = await prisma.business.findUnique({
        where: { googleMapsUrl: scraped.mapsUrl },
      });

      const city = extractCity(scraped.address);

      if (!existing) {
        const created = await prisma.business.create({
          data: {
            name: scraped.name,
            googleMapsUrl: scraped.mapsUrl,
            phone: scraped.phone ?? null,
            email: null,
            city,
            country: "United States",
            rating: scraped.rating,
            reviews: scraped.reviews,
            businessAttributes: scraped.attributes as unknown as Prisma.InputJsonValue,
            status: "NEW",
            lastSeenAt: now,
          },
        });

        await prisma.collectionBusiness.create({
          data: {
            collectionId,
            businessId: created.id,
          },
        });

        newBusinessesAdded++;
        continue;
      }

      await prisma.business.update({
        where: { id: existing.id },
        data: {
          name: scraped.name,
          rating: scraped.rating,
          reviews: scraped.reviews,
          businessAttributes: scraped.attributes as unknown as Prisma.InputJsonValue,
          lastSeenAt: now,
          phone: existing.phone || scraped.phone || null,
          city: existing.city || city,
          country: existing.country || "United States",
        },
      });

      await prisma.collectionBusiness.upsert({
        where: {
          collectionId_businessId: {
            collectionId,
            businessId: existing.id,
          },
        },
        create: {
          collectionId,
          businessId: existing.id,
        },
        update: {},
      });

      businessesUpdated++;
    }

    return {
      businessesFound: businesses.length,
      newBusinessesAdded,
      businessesUpdated,
    };
  }

  /** Upsert businesses for public (no-collection) search runs. Returns IDs of all affected businesses. */
  async upsertPublic(businesses: ScrapedBusiness[]): Promise<{ result: UpsertBusinessResult; ids: string[] }> {
    let newBusinessesAdded = 0;
    let businessesUpdated = 0;
    const ids: string[] = [];
    const now = new Date();

    for (const scraped of businesses) {
      const existing = await prisma.business.findUnique({
        where: { googleMapsUrl: scraped.mapsUrl },
      });

      const city = extractCity(scraped.address);

      if (!existing) {
        const created = await prisma.business.create({
          data: {
            name: scraped.name,
            googleMapsUrl: scraped.mapsUrl,
            phone: scraped.phone ?? null,
            email: null,
            city,
            country: "United States",
            rating: scraped.rating,
            reviews: scraped.reviews,
            businessAttributes: scraped.attributes as unknown as Prisma.InputJsonValue,
            status: "NEW",
            lastSeenAt: now,
          },
        });
        ids.push(created.id);
        newBusinessesAdded++;
      } else {
        await prisma.business.update({
          where: { id: existing.id },
          data: {
            name: scraped.name,
            rating: scraped.rating,
            reviews: scraped.reviews,
            businessAttributes: scraped.attributes as unknown as Prisma.InputJsonValue,
            lastSeenAt: now,
            phone: existing.phone || scraped.phone || null,
            city: existing.city || city,
            country: existing.country || "United States",
          },
        });
        ids.push(existing.id);
        businessesUpdated++;
      }
    }

    return {
      result: { businessesFound: businesses.length, newBusinessesAdded, businessesUpdated },
      ids,
    };
  }

  async findByIds(ids: string[]): Promise<Business[]> {
    if (ids.length === 0) return [];
    const records = await prisma.business.findMany({ where: { id: { in: ids } } });
    return records.map(mapBusiness);
  }

  async updateStatus(id: string, status: BusinessStatus): Promise<Business> {
    const record = await prisma.business.update({
      where: { id },
      data: { status },
    });
    return mapBusiness(record);
  }

  async findById(id: string): Promise<Business | null> {
    const record = await prisma.business.findUnique({ where: { id } });
    return record ? mapBusiness(record) : null;
  }

  async findByCollectionId(collectionId: string): Promise<Business[]> {
    const links = await prisma.collectionBusiness.findMany({
      where: { collectionId },
      include: { business: true },
      orderBy: { createdAt: "desc" },
    });

    return links.map((link) => mapBusiness(link.business));
  }

  async countAll(): Promise<number> {
    return prisma.business.count();
  }

  async countByStatus(status: BusinessStatus): Promise<number> {
    return prisma.business.count({ where: { status } });
  }

  async getLastDiscoveryAt(): Promise<Date | null> {
    const latest = await prisma.business.findFirst({
      orderBy: { lastSeenAt: "desc" },
      select: { lastSeenAt: true },
    });
    return latest?.lastSeenAt ?? null;
  }
}
