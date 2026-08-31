import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { transformIndexForPublication } from "./src/seo/publication-config.ts";

function publicationIndexPlugin(siteUrl: string | undefined): Plugin {
  return {
    name: "publication-index",
    transformIndexHtml: (html) => transformIndexForPublication(html, siteUrl),
  };
}

function routeModulePreloadPlugin(): Plugin {
  const routeModules = {
    home: "/src/pages/HomePage/HomePage.tsx",
    catalog: "/src/pages/CatalogPage/CatalogPage.tsx",
    project: "/src/pages/ProjectPage/ProjectPage.tsx",
  } as const;

  return {
    name: "route-module-preload",
    transformIndexHtml: {
      order: "post",
      handler(html, context) {
        if (!context.bundle) return html;
        const chunks = Object.values(context.bundle).filter((output) => output.type === "chunk");
        const chunksByFile = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
        const warmGraphFor = (moduleSuffix: string) => {
          const entry = chunks.find(({ facadeModuleId }) => facadeModuleId?.endsWith(moduleSuffix));
          if (!entry) return undefined;
          const files: string[] = [];
          const visit = (fileName: string) => {
            if (files.includes(fileName)) return;
            files.push(fileName);
            for (const importedFile of chunksByFile.get(fileName)?.imports ?? []) visit(importedFile);
          };
          visit(entry.fileName);
          return files;
        };
        const files = {
          home: warmGraphFor(routeModules.home),
          catalog: warmGraphFor(routeModules.catalog),
          project: warmGraphFor(routeModules.project),
        };
        if (!files.home || !files.catalog || !files.project) {
          throw new Error("Expected production chunks for all performance-critical routes");
        }
        const routeFiles = JSON.stringify(files).replaceAll("<", "\\u003c");
        const preloadScript = `<script>
      (() => {
        const files = ${routeFiles};
        const path = window.location.pathname;
        const routeFiles = path === "/" ? files.home
          : path === "/catalog" ? files.catalog
            : /^\\/catalog\\/[a-z0-9-]+$/.test(path) ? files.project
              : undefined;
        if (!routeFiles) return;
        for (const file of routeFiles) {
          const preload = document.createElement("link");
          preload.rel = "modulepreload";
          preload.crossOrigin = "anonymous";
          preload.href = "/" + file;
          document.head.append(preload);
        }
      })();
    </script>`;
        const entryCssLink = /<link rel="stylesheet" crossorigin href="\/(assets\/index-[^"]+\.css)">/;
        const entryCssFile = entryCssLink.exec(html)?.[1];
        const entryCssAsset = entryCssFile ? context.bundle[entryCssFile] : undefined;
        if (!entryCssFile || !entryCssAsset || entryCssAsset.type !== "asset") {
          throw new Error("Expected the production entry stylesheet asset");
        }
        const entryCss = typeof entryCssAsset.source === "string"
          ? entryCssAsset.source
          : new TextDecoder().decode(entryCssAsset.source);
        html = html.replace(entryCssLink, `<style>${entryCss.replaceAll("</style", "<\\/style")}</style>`);
        const entryScript = '<script type="module"';
        if (!html.includes(entryScript)) throw new Error("Expected a production module entry script");
        return html.replace(entryScript, `${preloadScript}\n    ${entryScript}`);
      },
    },
  };
}

interface PreloadVariant {
  url: string;
  width: number;
  format: string;
}

interface ProjectPreloadRecord {
  slug: string;
  coverImage?: { variants: PreloadVariant[] };
}

function routeLcpPreloadPlugin(): Plugin {
  const summaries = JSON.parse(readFileSync(new URL("./src/data/projects-summary.json", import.meta.url), "utf8")) as ProjectPreloadRecord[];
  const variantsFor = (record?: ProjectPreloadRecord) => record?.coverImage?.variants
    .filter((variant) => variant.format === "avif")
    .sort((left, right) => left.width - right.width) ?? [];
  const manifest = {
    home: [
      { url: "/media/site/hero-g-plus-480.avif", width: 480 },
      { url: "/media/site/hero-g-plus-960.avif", width: 960 },
    ],
    catalog: variantsFor(summaries.find(({ slug }) => slug === "3-shoseynaya-20")),
    projects: Object.fromEntries(summaries.flatMap((project) => {
      const variants = variantsFor(project);
      return variants.length > 0 ? [[project.slug, variants]] : [];
    })),
  };
  const serializedManifest = JSON.stringify(manifest).replaceAll("<", "\\u003c");

  return {
    name: "route-lcp-preload",
    transformIndexHtml(html) {
      const script = `<script>
      (() => {
        const manifest = ${serializedManifest};
        const projectRoute = /^\\/catalog\\/([a-z0-9-]+)$/.exec(window.location.pathname);
        const variants = window.location.pathname === "/" ? manifest.home
          : window.location.pathname === "/catalog" ? manifest.catalog
            : projectRoute ? manifest.projects[projectRoute[1]]
              : undefined;
        if (!variants || variants.length === 0) return;
        const compact = window.matchMedia("(max-width: 600px)").matches;
        const preferred = compact ? variants[0] : variants.find((variant) => variant.width >= 960) ?? variants.at(-1);
        if (!preferred) return;
        const preload = document.createElement("link");
        preload.rel = "preload";
        preload.as = "image";
        preload.fetchPriority = "high";
        preload.type = "image/avif";
        preload.href = preferred.url;
        if (!compact && variants.length > 1) {
          preload.imageSrcset = variants.map((variant) => variant.url + " " + variant.width + "w").join(", ");
          preload.imageSizes = window.location.pathname === "/" ? "100vw"
            : window.location.pathname === "/catalog" ? "360px"
              : "56vw";
        }
        document.head.append(preload);
      })();
    </script>`;
      return html.replace("<!-- route-lcp-preload -->", script);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), publicationIndexPlugin(env.VITE_SITE_URL), routeLcpPreloadPlugin(), routeModulePreloadPlugin()],
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
      setupFiles: "./src/test/setup.ts",
    },
  };
});
