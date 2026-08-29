import { describe, expect, it } from "vitest";
import { projectSchema } from "./catalog-schema";

const requiredProject = {
  slug: "primer",
  title: "ЖК Пример",
  shortDescription: "",
  description: [],
  roomPrices: [],
  features: [],
  purchasePrograms: [],
  gallery: [],
  documents: [],
  layouts: [],
  relatedProjectSlugs: [],
  sourceUrl: "https://example.test/catalog/primer/",
  sourceCheckedAt: "2026-08-29",
  dataQualityFlags: [],
};

describe("projectSchema image URLs", () => {
  it("accepts generated same-site media paths while rejecting unsafe schemes", () => {
    expect(projectSchema.safeParse({
      ...requiredProject,
      coverImage: {
        src: "/media/projects/primer/cover-960.webp",
        variants: [{
          url: "/media/projects/primer/cover-480.avif",
          width: 480,
          format: "avif",
        }],
      },
    }).success).toBe(true);
    expect(projectSchema.safeParse({
      ...requiredProject,
      coverImage: { src: "javascript:alert(1)", variants: [] },
    }).success).toBe(false);
  });

  it("accepts a commercial layout while preserving its exact source label", () => {
    expect(projectSchema.parse({
      ...requiredProject,
      layouts: [{
        id: "commercial-1",
        room: "commercial",
        roomLabel: "Торгово-офисное",
        notes: [],
      }],
    }).layouts[0]).toMatchObject({
      room: "commercial",
      roomLabel: "Торгово-офисное",
    });
  });
});
