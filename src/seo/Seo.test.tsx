import { cleanup, render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../app/routes";
import { buildCanonical, getProjectSeo } from "./seo-config";

function metaContent(selector: string): string | null {
  return document.head.querySelector<HTMLMetaElement>(selector)?.content ?? null;
}

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  document.head.querySelectorAll("[data-route-seo]").forEach((element) => element.remove());
});

describe("route metadata", () => {
  it("publishes deterministic home metadata without claiming a canonical domain", async () => {
    vi.stubEnv("VITE_SITE_URL", "");
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(document.title).toBe("Новостройки Ярославля — Офис продаж 76"));
    expect(metaContent('meta[name="description"]')).toBe(
      "Сравните 92 проекта новостроек Ярославля в частной демонстрации сайта «Офис продаж 76».",
    );
    expect(metaContent('meta[property="og:title"]')).toBe("Новостройки Ярославля — Офис продаж 76");
    expect(metaContent('meta[property="og:description"]')).toBe(
      "Сравните 92 проекта новостроек Ярославля в частной демонстрации сайта «Офис продаж 76».",
    );
    expect(document.head.querySelector('link[rel="canonical"]')).not.toBeInTheDocument();
    expect(metaContent('meta[property="og:url"]')).toBeNull();
  });

  it("uses the local project cover and clears project-only metadata after navigation", async () => {
    vi.stubEnv("VITE_SITE_URL", "https://demo.example/");
    const router = createMemoryRouter(appRoutes, { initialEntries: ["/catalog/zhk-novatsiya"] });

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(document.title).toBe("ЖК Новация — новостройка в Ярославле | Офис продаж 76"));
    expect(metaContent('meta[name="description"]')).toBe(
      "ЖК Новация в Ярославле. Проверенные сведения из локального снимка каталога «Офис продаж 76».",
    );
    expect(metaContent('meta[property="og:title"]')).toBe(document.title);
    expect(metaContent('meta[property="og:type"]')).toBe("article");
    expect(metaContent('meta[property="og:image"]')).toMatch(/^https:\/\/demo\.example\/media\/projects\//);
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      "https://demo.example/catalog/zhk-novatsiya",
    );

    await router.navigate("/about");

    await waitFor(() => expect(document.title).toBe("О компании — Офис продаж 76"));
    expect(metaContent('meta[property="og:type"]')).toBe("website");
    expect(metaContent('meta[property="og:image"]')).toBeNull();
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      "https://demo.example/about",
    );
  });

  it("builds canonical URLs only from explicit valid HTTPS operator URLs", () => {
    expect(buildCanonical("/catalog", "https://demo.example/")).toBe("https://demo.example/catalog");
    expect(buildCanonical("/catalog", undefined)).toBeUndefined();
    expect(buildCanonical("/catalog", "http://demo.example")).toBeUndefined();
    expect(buildCanonical("//attacker.example", "https://demo.example")).toBeUndefined();
  });

  it("derives project metadata from data already loaded by the lazy project page", () => {
    expect(getProjectSeo({
      slug: "river-house",
      title: "ЖК Речной",
      coverImage: { src: "/media/projects/river-house/cover-960.webp" },
    })).toEqual({
      title: "ЖК Речной — новостройка в Ярославле | Офис продаж 76",
      description: "ЖК Речной в Ярославле. Проверенные сведения из локального снимка каталога «Офис продаж 76».",
      image: "/media/projects/river-house/cover-960.webp",
      path: "/catalog/river-house",
      type: "article",
    });

    expect(getProjectSeo({
      slug: "unsafe-cover",
      title: "ЖК Безопасный",
      coverImage: { src: "https://source.example/cover.webp" },
    })).not.toHaveProperty("image");
  });
});
