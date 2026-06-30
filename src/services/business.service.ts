import type { ScrapedBusiness } from "@/scraper/types";
import type { UpsertBusinessResult } from "@/types/business";
import type { DashboardSummary } from "@/types/api";
import type {
  Collection,
  CollectionDetail,
  CollectionListItem,
  CreateCollectionInput,
} from "@/types/collection";
import { BusinessStatus } from "@/types/business";
import { BusinessRepository } from "./business.repository";
import { CollectionRepository } from "./collection.repository";

export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository = new CollectionRepository()
  ) {}

  findOrCreate(input: CreateCollectionInput): Promise<Collection> {
    return this.collectionRepository.findOrCreate(input);
  }

  getById(id: string): Promise<Collection | null> {
    return this.collectionRepository.findById(id);
  }

  getDetail(id: string): Promise<CollectionDetail | null> {
    return this.collectionRepository.getDetail(id);
  }

  listWithStats(): Promise<CollectionListItem[]> {
    return this.collectionRepository.listWithStats();
  }
}

export class BusinessService {
  constructor(
    private readonly businessRepository: BusinessRepository = new BusinessRepository(),
    private readonly collectionRepository: CollectionRepository = new CollectionRepository()
  ) {}

  upsertFromSearchRun(
    collectionId: string,
    businesses: ScrapedBusiness[]
  ): Promise<UpsertBusinessResult> {
    return this.businessRepository.upsertFromDiscovery(collectionId, businesses);
  }

  getByCollectionId(collectionId: string) {
    return this.businessRepository.findByCollectionId(collectionId);
  }

  updateStatus(id: string, status: BusinessStatus) {
    return this.businessRepository.updateStatus(id, status);
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [totalLeads, collectionsCount, newLeads, lastDiscoveryAt] = await Promise.all([
      this.businessRepository.countAll(),
      this.collectionRepository.count(),
      this.businessRepository.countByStatus(BusinessStatus.NEW),
      this.businessRepository.getLastDiscoveryAt(),
    ]);

    return { totalLeads, collectionsCount, newLeads, lastDiscoveryAt };
  }
}
