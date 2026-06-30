import type { BusinessAttribute } from "@/scraper/types";

export enum BusinessStatus {
  NEW = "NEW",
  NOT_CONTACTED = "NOT_CONTACTED",
  CONTACTED = "CONTACTED",
  NOT_INTERESTED = "NOT_INTERESTED",
  INTERESTED = "INTERESTED",
  CLIENT = "CLIENT",
}

export interface Business {
  id: string;
  name: string;
  googleMapsUrl: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  rating: number;
  reviews: number;
  businessAttributes: BusinessAttribute[];
  status: BusinessStatus;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface UpsertBusinessResult {
  businessesFound: number;
  newBusinessesAdded: number;
  businessesUpdated: number;
}

/** @deprecated Use Business — kept for gradual UI migration */
export type Lead = Business & {
  mapsUrl?: string;
  attributes?: BusinessAttribute[];
  jobId?: string;
};
