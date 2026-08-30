import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), publicationIndexPlugin(env.VITE_SITE_URL), routeModulePreloadPlugin()],
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
      setupFiles: "./src/test/setup.ts",
    },
  };
});
