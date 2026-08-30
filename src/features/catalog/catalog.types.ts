export type RoomKey = "studio" | "1" | "2" | "3" | "4+" | "commercial";

export type CompletionFilter = "all" | "ready" | "2026" | "2027" | "2028+";
export type CatalogSort = "featured" | "price-asc" | "price-desc" | "completion";

export interface CatalogQuery {
  text?: string;
  district?: string;
  rooms?: RoomKey[];
  maximumPrice?: number;
  completion?: CompletionFilter;
  sort?: CatalogSort;
}

export type DataQualityFlag =
  | "missing-price"
  | "missing-completion"
  | "missing-cover"
  | "untrusted-price"
  | "unparseable-completion"
  | "unreachable-document"
  | "contact-conflict"
  | "legal-review";

export interface RoomPrice {
  room: RoomKey;
  minimumPrice?: number;
}

export interface Layout {
  id: string;
  room: RoomKey;
  roomLabel: string;
  area?: number;
  price?: number;
  pricePerMeter?: number;
  floors?: string;
  entrances?: string;
  notes: string[];
  image?: ImageAsset;
}

export interface ProjectDocument {
  title: string;
  url: string;
  status: "verified" | "unverified";
}

export interface ImageVariant {
  url: string;
  width: 480 | 960 | 1440 | 1920;
  format: "avif" | "webp";
}

export interface ImageAsset {
  src: string;
  variants: ImageVariant[];
}

export interface Project {
  slug: string;
  title: string;
  shortDescription: string;
  description: string[];
  district?: string;
  address?: string;
  completionLabel?: string;
  completionDate?: string;
  minimumPrice?: number;
  minimumPricePerMeter?: number;
  roomPrices: RoomPrice[];
  mortgageRateLabel?: string;
  developer?: string;
  features: string[];
  purchasePrograms: string[];
  coverImage?: ImageAsset;
  gallery: ImageAsset[];
  documents: ProjectDocument[];
  layouts: Layout[];
  relatedProjectSlugs: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  dataQualityFlags: DataQualityFlag[];
}

export interface ProjectSummary {
  slug: string;
  title: string;
  shortDescription: string;
  district?: string;
  address?: string;
  completionLabel?: string;
  completionDate?: string;
  minimumPrice?: number;
  roomPrices: RoomPrice[];
  availableRooms: RoomKey[];
  mortgageRateLabel?: string;
  coverImage?: ImageAsset;
  relatedProjectSlugs: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  dataQualityFlags: DataQualityFlag[];
}

export interface SourceLayoutInput {
  id: string;
  roomLabel?: string;
  areaLabel?: string;
  priceLabel?: string;
  pricePerMeterLabel?: string;
  floors?: string;
  entrances?: string;
  notes?: string[];
  imageUrl?: string;
}

export interface SourceProjectInput {
  slug: string;
  title: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  shortDescription?: string;
  description?: string[];
  district?: string;
  address?: string;
  completionLabel?: string;
  minimumPriceLabel?: string;
  minimumPricePerMeterLabel?: string;
  roomPriceLabels?: Partial<Record<RoomKey, string>>;
  mortgageRateLabel?: string;
  developer?: string;
  features?: string[];
  purchasePrograms?: string[];
  coverImageUrl?: string;
  galleryUrls?: string[];
  documents?: ProjectDocument[];
  layouts?: SourceLayoutInput[];
  relatedProjectSlugs?: string[];
}
