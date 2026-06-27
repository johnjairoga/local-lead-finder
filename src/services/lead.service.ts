import type { ScrapedBusiness } from "@/scraper/types";
import type { CreateLeadInput, Lead } from "@/types/lead";
import { LeadRepository } from "./lead.repository";

/**
 * Domain service for lead persistence.
 * Converts scraped/filtered data into DB records.
 */
export class LeadService {
  constructor(private readonly leadRepository: LeadRepository = new LeadRepository()) {}

  toCreateInput(jobId: string, business: ScrapedBusiness): CreateLeadInput {
    return {
      jobId,
      name: business.name,
      rating: business.rating,
      reviews: business.reviews,
      phone: business.phone ?? null,
      website: business.website ?? null,
      address: business.address ?? null,
      category: business.category ?? null,
      attributes: business.attributes,
      mapsUrl: business.mapsUrl,
    };
  }

  async saveForJob(jobId: string, businesses: ScrapedBusiness[]): Promise<number> {
    const inputs = businesses.map((business) => this.toCreateInput(jobId, business));
    return this.leadRepository.createMany(inputs);
  }

  async getByJobId(jobId: string): Promise<Lead[]> {
    return this.leadRepository.findByJobId(jobId);
  }

  async countByJobId(jobId: string): Promise<number> {
    return this.leadRepository.countByJobId(jobId);
  }
}
