import { describe, expect, it, vi } from "vitest";
import type { Project } from "./catalog.types";
import { createProjectDetailRepository } from "./project-detail-repository";

describe("createProjectDetailRepository", () => {
  it("evicts a rejected import so an explicit retry can load the detail", async () => {
    const project = { slug: "retry-project" } as Project;
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("chunk failed"))
      .mockResolvedValueOnce({ default: project });
    const getDetail = createProjectDetailRepository({
      "../../data/project-details/retry-project.json": load,
    });

    await expect(getDetail("retry-project")).rejects.toThrow("chunk failed");
    await expect(getDetail("retry-project")).resolves.toEqual(project);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
