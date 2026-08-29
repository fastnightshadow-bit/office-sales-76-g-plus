import { z } from "zod";

const imageUrlSchema = z.string().refine((value) => {
  if (/^\/media\/[a-zA-Z0-9._~!$&'()*+,;=:@%/-]+$/.test(value)) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}, "Expected a local /media path or an HTTP(S) URL");

export const roomKeySchema = z.enum(["studio", "1", "2", "3", "4+", "commercial"]);

export const dataQualityFlagSchema = z.enum([
  "missing-price",
  "missing-completion",
  "missing-cover",
  "untrusted-price",
  "unparseable-completion",
  "unreachable-document",
  "contact-conflict",
  "legal-review",
]);

export const imageVariantSchema = z.object({
  url: imageUrlSchema,
  width: z.union([z.literal(480), z.literal(960), z.literal(1440), z.literal(1920)]),
  format: z.enum(["avif", "webp"]),
});

export const imageAssetSchema = z.object({
  src: imageUrlSchema,
  variants: z.array(imageVariantSchema),
});

export const roomPriceSchema = z.object({
  room: roomKeySchema,
  minimumPrice: z.number().positive().optional(),
});

export const projectDocumentSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  status: z.enum(["verified", "unverified"]),
});

export const layoutSchema = z.object({
  id: z.string().min(1),
  room: roomKeySchema,
  roomLabel: z.string().min(1),
  area: z.number().positive().optional(),
  price: z.number().positive().optional(),
  pricePerMeter: z.number().positive().optional(),
  floors: z.string().min(1).optional(),
  entrances: z.string().min(1).optional(),
  notes: z.array(z.string()),
  image: imageAssetSchema.optional(),
});

export const projectSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  shortDescription: z.string(),
  description: z.array(z.string()),
  district: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  completionLabel: z.string().min(1).optional(),
  completionDate: z.union([
    z.literal("ready"),
    z.string().regex(/^\d{4}-Q[1-4]$/),
  ]).optional(),
  minimumPrice: z.number().positive().optional(),
  minimumPricePerMeter: z.number().positive().optional(),
  roomPrices: z.array(roomPriceSchema),
  mortgageRateLabel: z.string().min(1).optional(),
  developer: z.string().min(1).optional(),
  features: z.array(z.string()),
  purchasePrograms: z.array(z.string()),
  coverImage: imageAssetSchema.optional(),
  gallery: z.array(imageAssetSchema),
  documents: z.array(projectDocumentSchema),
  layouts: z.array(layoutSchema),
  relatedProjectSlugs: z.array(z.string()),
  sourceUrl: z.string().url(),
  sourceCheckedAt: z.string().min(1),
  dataQualityFlags: z.array(dataQualityFlagSchema),
});

export const sourceLayoutInputSchema = z.object({
  id: z.string().min(1),
  roomLabel: z.string().min(1).optional(),
  areaLabel: z.string().min(1).optional(),
  priceLabel: z.string().min(1).optional(),
  pricePerMeterLabel: z.string().min(1).optional(),
  floors: z.string().min(1).optional(),
  entrances: z.string().min(1).optional(),
  notes: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
});

export const sourceProjectInputSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  sourceCheckedAt: z.string().min(1),
  shortDescription: z.string().min(1).optional(),
  description: z.array(z.string()).optional(),
  district: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  completionLabel: z.string().min(1).optional(),
  minimumPriceLabel: z.string().min(1).optional(),
  minimumPricePerMeterLabel: z.string().min(1).optional(),
  roomPriceLabels: z.partialRecord(roomKeySchema, z.string()).optional(),
  mortgageRateLabel: z.string().min(1).optional(),
  developer: z.string().min(1).optional(),
  features: z.array(z.string()).optional(),
  purchasePrograms: z.array(z.string()).optional(),
  coverImageUrl: z.string().url().optional(),
  galleryUrls: z.array(z.string().url()).optional(),
  documents: z.array(projectDocumentSchema).optional(),
  layouts: z.array(sourceLayoutInputSchema).optional(),
  relatedProjectSlugs: z.array(z.string()).optional(),
});

/** Schema used to validate normalized catalog JSON at build time. */
export const catalogSchema = projectSchema;
