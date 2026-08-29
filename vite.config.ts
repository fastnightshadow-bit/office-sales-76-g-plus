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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), publicationIndexPlugin(env.VITE_SITE_URL)],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});
