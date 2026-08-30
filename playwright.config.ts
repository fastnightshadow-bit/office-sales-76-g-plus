import { defineConfig, devices } from "@playwright/test";

export function getPlaywrightPort(environment: { PLAYWRIGHT_PORT?: string }) {
  const rawPort = environment.PLAYWRIGHT_PORT ?? "4173";
  if (!/^\d+$/.test(rawPort)) throw new Error("PLAYWRIGHT_PORT must be a numeric TCP port");
  const port = Number(rawPort);
  if (port < 1024 || port > 65_535) throw new Error("PLAYWRIGHT_PORT must be between 1024 and 65535");
  return port;
}

const port = getPlaywrightPort(process.env);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  reporter: [["list"]],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 120_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
