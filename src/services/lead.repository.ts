import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CreateLeadInput, Lead } from "@/types/lead";

function mapLead(record: {
  id: string;
  jobId: string;
  name: string;
  rating: number;
  reviews: number;
  phone: string | null;
  website: string | null;
  address: string | null;
  category: string | null;
  attributes: Prisma.JsonValue;
  mapsUrl: string;
  createdAt: Date;
}): Lead {
  return {
    id: record.id,
    jobId: record.jobId,
    name: record.name,
    rating: record.rating,
    reviews: record.reviews,
    phone: record.phone,
    website: record.website,
    address: record.address,
    category: record.category,
    attributes: Array.isArray(record.attributes)
      ? (record.attributes as Lead["attributes"])
      : [],
    mapsUrl: record.mapsUrl,
    createdAt: record.createdAt,
  };
}

export class LeadRepository {
  async createMany(inputs: CreateLeadInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    const result = await prisma.lead.createMany({
      data: inputs.map((input) => ({
        jobId: input.jobId,
        name: input.name,
        rating: input.rating,
        reviews: input.reviews,
        phone: input.phone ?? null,
        website: input.website ?? null,
        address: input.address ?? null,
        category: input.category ?? null,
        attributes: input.attributes as Prisma.InputJsonValue,
        mapsUrl: input.mapsUrl,
      })),
    });

    return result.count;
  }

  async findByJobId(jobId: string): Promise<Lead[]> {
    const records = await prisma.lead.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });

    return records.map(mapLead);
  }

  async countByJobId(jobId: string): Promise<number> {
    return prisma.lead.count({ where: { jobId } });
  }
}
