import type { BusinessAttribute, ScrapedBusiness } from "@/scraper/types";

export type BusinessAttributes = BusinessAttribute;
export type RawBusiness = ScrapedBusiness;

export interface Lead {
  id?: string;
  jobId?: string;
  name: string;
  rating: number;
  reviews: number;
  phone: string | null;
  website: string | null;
  address: string | null;
  category: string | null;
  attributes: BusinessAttributes[];
  mapsUrl: string;
  createdAt?: Date;
}

export interface CreateLeadInput {
  jobId: string;
  name: string;
  rating: number;
  reviews: number;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  category?: string | null;
  attributes: BusinessAttributes[];
  mapsUrl: string;
}
