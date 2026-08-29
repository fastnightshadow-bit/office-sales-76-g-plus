# Office Sales 76 G+ Edition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build a polished, responsive G+ Edition frontend demonstration for “Офис продаж 76” with a verified local snapshot of all 92 source projects and fully testable demo interactions.

**Architecture:** A strict TypeScript React application reads a generated local content snapshot and never depends on the source site at runtime. Source extraction, normalization, catalog state, reusable UI, page composition, and demo-only lead handling stay in separate modules with explicit interfaces and dedicated tests.

**Tech Stack:** Node.js 22, Vite, React, TypeScript, React Router, Zod, Cheerio, Sharp, CSS Modules, Vitest, Testing Library, Playwright, axe-core.

**Spec:** docs/superpowers/specs/2026-08-29-office-sales-76-g-plus-design.md

## Global Constraints

- Import exactly 92 unique project pages from https://офиспродаж76.рф/catalog-list/ and fail the import if the count changes without an explicit inventory update.
- Use “Офис продаж 76” as the public brand and “ООО «Ваш выбор», ИНН 7602067446” only in company and legal context.
- G+ palette: white #FFFFFF, section background #F4F6F3, graphite #17221D, text #1C2721, secondary #6F7A73, accent #718277, border #E2E7E3.
- Use the approved C/S photograph on the home hero and the rounded white D-style search panel.
- Never display missing values as zero, “нет”, an empty “от”, or a fabricated number.
- Treat catalog prices as total apartment prices unless the source explicitly provides a separate price-per-square-metre field.
- Every source-derived record includes sourceUrl and sourceCheckedAt.
- Demo forms validate locally, make no network request, retain no personal data, and show the approved demo explanation after success.
- No backend, database, authentication, analytics, advertising cookies, paid map API, CRM, email sender, or Telegram bot.
- Support 360, 390, 430, 768, 1024, 1280, and 1440 px layouts.
- Main text and controls meet WCAG AA; all menus, filters, dialogs, galleries, and forms work with a keyboard.
- Production build targets Lighthouse scores of at least 90 for Performance, Accessibility, Best Practices, and SEO on representative routes.
- Do not publish the site or contact the company during implementation.

---

## Planned File Structure

~~~text
.
├── e2e/
│   ├── accessibility.spec.ts
│   ├── catalog.spec.ts
│   ├── lead-form.spec.ts
│   ├── navigation.spec.ts
│   └── responsive.spec.ts
├── public/
│   ├── media/
│   │   ├── projects/<slug>/*.webp
│   │   └── site/hero-g-plus.webp
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/
│   ├── import-source.ts
│   ├── source/
│   │   ├── asset-cache.ts
│   │   ├── fetch-page.ts
│   │   ├── parse-company.ts
│   │   ├── parse-project.ts
│   │   └── parse-project-index.ts
│   └── write-route-assets.ts
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── AppErrorBoundary.tsx
│   │   └── routes.tsx
│   ├── components/
│   │   ├── Button/
│   │   ├── DemoNotice/
│   │   ├── LeadDialog/
│   │   ├── PageSkeleton/
│   │   ├── PropertyCard/
│   │   ├── Reveal/
│   │   ├── ResponsiveImage/
│   │   ├── SectionHeading/
│   │   ├── SiteFooter/
│   │   ├── SiteHeader/
│   │   └── MobileBottomNav/
│   ├── data/
│   │   ├── company.json
│   │   ├── legal.json
│   │   ├── projects.json
│   │   └── source-report.json
│   ├── features/
│   │   ├── catalog/
│   │   │   ├── catalog-filters.ts
│   │   │   ├── catalog-query.ts
│   │   │   ├── catalog-repository.ts
│   │   │   └── catalog.types.ts
│   │   ├── favorites/
│   │   │   ├── favorites-store.ts
│   │   │   └── use-favorites.ts
│   │   ├── company/
│   │   │   └── company.types.ts
│   │   └── leads/
│   │       ├── lead-validation.ts
│   │       └── lead.types.ts
│   ├── pages/
│   │   ├── AboutPage/
│   │   ├── CatalogPage/
│   │   ├── ContactsPage/
│   │   ├── FavoritesPage/
│   │   ├── HomePage/
│   │   ├── LegalPage/
│   │   ├── NotFoundPage/
│   │   └── ProjectPage/
│   ├── seo/
│   │   ├── Seo.tsx
│   │   └── seo-config.ts
│   ├── styles/
│   │   ├── global.css
│   │   ├── motion.css
│   │   └── tokens.css
│   ├── test/
│   │   ├── fixtures/
│   │   ├── render.tsx
│   │   └── setup.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── eslint.config.js
├── index.html
├── package.json
├── playwright.config.ts
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
~~~

## Task 1: Bootstrap the tested React application

**Files:**
- Create: package.json
- Create: index.html
- Create: tsconfig.json
- Create: tsconfig.app.json
- Create: tsconfig.node.json
- Create: vite.config.ts
- Create: eslint.config.js
- Create: playwright.config.ts
- Create: src/main.tsx
- Create: src/app/App.tsx
- Create: src/test/setup.ts
- Create: src/app/App.test.tsx
- Create: README.md

**Interfaces:**
- Produces: Vite application entry, test runner, lint/typecheck/build scripts, and a minimal App component that later tasks extend.

- [ ] **Step 1: Create package metadata and install the application/test dependencies**

Use package scripts with these exact names:

~~~json
{
  "name": "office-sales-76-g-plus",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty false",
    "lint": "eslint .",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "import:source": "tsx scripts/import-source.ts",
    "generate:routes": "tsx scripts/write-route-assets.ts"
  }
}
~~~

Run:

~~~bash
npm install react react-dom react-router-dom zod lucide-react @fontsource-variable/manrope @fontsource/cormorant-garamond
npm install -D typescript vite @vitejs/plugin-react eslint @eslint/js typescript-eslint globals vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test @axe-core/playwright cheerio sharp tsx
~~~

Expected: package-lock.json is created and npm reports no installation failure.

- [ ] **Step 2: Write the initial failing render test**

~~~tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the approved public brand", () => {
    render(<App />);
    expect(screen.getByText("Офис продаж 76")).toBeInTheDocument();
  });
});
~~~

- [ ] **Step 3: Run the focused test and verify the red state**

Run: npm run test:run -- src/app/App.test.tsx

Expected: FAIL because src/app/App.tsx and the test environment are not implemented.

- [ ] **Step 4: Add the minimal app entry and test configuration**

~~~tsx
// src/app/App.tsx
export function App() {
  return <main><h1>Офис продаж 76</h1></main>;
}
~~~

~~~tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
~~~

Configure Vitest with jsdom, src/test/setup.ts, and React plugin. Configure TypeScript strict mode, noUncheckedIndexedAccess, and exactOptionalPropertyTypes.

- [ ] **Step 5: Run the complete foundation checks**

Run:

~~~bash
npm run test:run
npm run typecheck
npm run lint
npm run build
~~~

Expected: all commands exit 0 and dist/index.html exists.

- [ ] **Step 6: Commit the foundation**

~~~bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js playwright.config.ts src README.md
git commit -m "chore: bootstrap G+ frontend"
~~~

## Task 2: Define source-safe project data contracts

**Files:**
- Create: src/features/catalog/catalog.types.ts
- Create: src/features/catalog/catalog-schema.ts
- Create: src/features/catalog/normalize-project.ts
- Create: src/features/catalog/normalize-project.test.ts
- Create: src/test/fixtures/project-input.ts

**Interfaces:**
- Produces: Project, Layout, ProjectDocument, RoomPrice, ImageAsset, DataQualityFlag, SourceProjectInput.
- Produces: normalizeProject(input: SourceProjectInput): Project.
- Produces: normalizeMoney(value: string): number | undefined.
- Produces: formatMoney(value: number): string.

- [ ] **Step 1: Write failing normalization tests**

~~~ts
import { describe, expect, it } from "vitest";
import { formatMoney, normalizeMoney, normalizeProject } from "./normalize-project";

describe("normalizeMoney", () => {
  it.each([
    ["6.9 мл", 6_900_000],
    ["5 698 000", 5_698_000],
    ["110 000 руб/м²", 110_000],
    ["от", undefined],
    ["0 млн", undefined],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeMoney(input)).toBe(expected);
  });
});

it("does not invent missing prices", () => {
  const project = normalizeProject({
    slug: "primer",
    title: "ЖК Пример",
    sourceUrl: "https://example.test/catalog/primer/",
    sourceCheckedAt: "2026-08-29",
    minimumPriceLabel: "от",
  });
  expect(project.minimumPrice).toBeUndefined();
  expect(project.dataQualityFlags).toContain("missing-price");
});

it("formats total price without a square-metre suffix", () => {
  expect(formatMoney(6_900_000)).toBe("6,9 млн ₽");
});
~~~

- [ ] **Step 2: Run tests and verify missing contracts**

Run: npm run test:run -- src/features/catalog/normalize-project.test.ts

Expected: FAIL with unresolved module errors.

- [ ] **Step 3: Implement exact domain types**

~~~ts
export type RoomKey = "studio" | "1" | "2" | "3" | "4+";
export type DataQualityFlag =
  | "missing-price"
  | "missing-completion"
  | "missing-cover"
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
~~~

Use a Zod schema with the same field names to validate generated JSON at build time.

- [ ] **Step 4: Implement normalization**

Implement normalizeMoney so that “мл”, “млн”, spaces, commas, periods, and ruble suffixes are handled; zero and incomplete labels return undefined. Implement normalizeProject so missing values remain omitted and quality flags are deterministic.

- [ ] **Step 5: Verify types and edge cases**

Run:

~~~bash
npm run test:run -- src/features/catalog/normalize-project.test.ts
npm run typecheck
~~~

Expected: PASS.

- [ ] **Step 6: Commit the data contracts**

~~~bash
git add src/features/catalog src/test/fixtures
git commit -m "feat: define verified catalog data model"
~~~

## Task 3: Import and locally cache all source content

**Files:**
- Create: scripts/source/fetch-page.ts
- Create: scripts/source/parse-project-index.ts
- Create: scripts/source/parse-project-index.test.ts
- Create: scripts/source/parse-project.ts
- Create: scripts/source/parse-project.test.ts
- Create: scripts/source/parse-company.ts
- Create: scripts/source/asset-cache.ts
- Create: scripts/import-source.ts
- Create: src/features/company/company.types.ts
- Create: src/test/fixtures/source-catalog.html
- Create: src/test/fixtures/source-project.html
- Generate: src/data/projects.json
- Generate: src/data/company.json
- Generate: src/data/legal.json
- Generate: src/data/source-report.json
- Generate: public/media/projects/<slug>/*.webp
- Generate: public/media/site/hero-g-plus.webp

**Interfaces:**
- Consumes: SourceProjectInput and normalizeProject from Task 2.
- Produces: parseProjectIndex(html: string, baseUrl: string): string[].
- Produces: parseProjectPage(html: string, sourceUrl: string, checkedAt: string): SourceProjectInput.
- Produces: cacheImage(url: string, destinationBase: string): Promise<ImageAsset>.
- Produces: CompanyData and LegalDocument validated before JSON is written.
- Produces: JSON files validated by catalogSchema.

- [ ] **Step 1: Save small deterministic HTML fixtures**

The catalog fixture must contain duplicate project links and one non-project link. The project fixture must include title, short description, three room prices, completion, address, documents, gallery, and two layouts, including one incomplete price.

- [ ] **Step 2: Write failing parser tests**

~~~ts
it("returns unique absolute project URLs only", () => {
  const links = parseProjectIndex(catalogHtml, "https://офиспродаж76.рф");
  expect(links).toEqual([
    "https://офиспродаж76.рф/catalog/zhk-novatsiya/",
    "https://офиспродаж76.рф/catalog/zhk-yaroslavl-siti-1-ztap/",
  ]);
});

it("separates total prices from price per metre", () => {
  const input = parseProjectPage(projectHtml, SOURCE_URL, "2026-08-29");
  expect(input.minimumPriceLabel).toBe("от 5.4 мл");
  expect(input.layouts?.[0]?.priceLabel).toBe("5 698 000");
  expect(input.layouts?.[0]?.pricePerMeterLabel).toBe("110 000");
});
~~~

- [ ] **Step 3: Run parser tests and verify the red state**

Run: npm run test:run -- scripts/source

Expected: FAIL because parser modules do not exist.

- [ ] **Step 4: Implement resilient fetching**

~~~ts
export async function fetchPage(url: string, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "OfficeSales76PrivateDemo/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}
~~~

Define company and legal contracts before parsing:

~~~ts
export interface CompanyData {
  brand: "Офис продаж 76";
  legalName: "ООО «Ваш выбор»";
  inn: "7602067446";
  director: string;
  address: string;
  cityPhone: string;
  mobilePhone: string;
  email: string;
  telegramUrl: string;
  maxUrl: string;
  sourceCheckedAt: string;
}

export interface LegalDocument {
  kind: "privacy" | "consent";
  title: string;
  paragraphs: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  requiresLegalReview: true;
}
~~~

- [ ] **Step 5: Implement catalog and project parsers**

Use Cheerio. Catalog selection is restricted to anchors whose normalized pathname matches /^\/catalog\/[^/]+\/$/. Project extraction reads visible heading groups and their adjacent values, all document anchors, gallery images, and layout cards. Strip script/style content and normalize whitespace before passing values to Task 2.

The parser must set sourceUrl and sourceCheckedAt on every record and must never calculate a price from another field.

- [ ] **Step 6: Implement image caching**

Download each used source image and generate 480, 960, 1440, and 1920 px variants when the source is large enough. For every size, write AVIF at quality 58 and WebP at quality 82 after Sharp rotate() and withoutEnlargement. Return an ImageAsset whose src is the largest WebP and whose variants are sorted by width and format. Deduplicate downloads by SHA-256 of the original URL. A failed non-cover gallery image is reported and skipped; a failed cover adds missing-cover.

- [ ] **Step 7: Implement the import orchestrator**

~~~ts
const EXPECTED_PROJECT_COUNT = 92;
const SOURCE_ROOT = "https://офиспродаж76.рф";
const checkedAt = new Date().toISOString().slice(0, 10);

const projectUrls = parseProjectIndex(
  await fetchPage(SOURCE_ROOT + "/catalog-list/"),
  SOURCE_ROOT,
);

if (projectUrls.length !== EXPECTED_PROJECT_COUNT) {
  throw new Error(
    "Expected " + EXPECTED_PROJECT_COUNT + " projects, received " + projectUrls.length,
  );
}
~~~

Process project pages with a concurrency limit of four. Sort projects by slug before writing JSON so repeated imports produce stable diffs. Write source-report.json with counts for imported projects, missing prices, missing completion dates, missing covers, failed assets, and sourceCheckedAt.

Check same-origin document URLs during import. Mark successful responses verified; mark timeouts and non-success responses unverified, add unreachable-document, and retain the project sourceUrl as the fallback. Document checks never run in the browser.

- [ ] **Step 8: Run the fixture tests**

Run:

~~~bash
npm run test:run -- scripts/source
npm run typecheck
~~~

Expected: PASS.

- [ ] **Step 9: Run the real import and inspect the report**

Run: npm run import:source

Expected:

~~~text
Imported projects: 92
Duplicate slugs: 0
Invalid records: 0
~~~

Open source-report.json and confirm every incomplete field is represented by a quality flag rather than a fabricated fallback.

- [ ] **Step 10: Test generated data as a build input**

Add a test that parses projects.json through the Zod catalog schema, asserts length 92, asserts unique slugs, and verifies that no minimumPrice equals zero.

Run: npm run test:run -- src/data

Expected: PASS.

- [ ] **Step 11: Commit the verified source snapshot**

~~~bash
git add scripts src/data src/test/fixtures public/media
git commit -m "feat: import complete source catalog snapshot"
~~~

## Task 4: Build catalog querying and favorites as isolated domain logic

**Files:**
- Create: src/features/catalog/catalog-repository.ts
- Create: src/features/catalog/catalog-filters.ts
- Create: src/features/catalog/catalog-query.ts
- Create: src/features/catalog/catalog-filters.test.ts
- Create: src/features/catalog/catalog-query.test.ts
- Create: src/features/favorites/favorites-store.ts
- Create: src/features/favorites/favorites-store.test.ts
- Create: src/features/favorites/use-favorites.ts

**Interfaces:**
- Consumes: Project[] from generated projects.json.
- Produces: CatalogQuery { text, district, rooms, maximumPrice, completion, sort }.
- Produces: getProjects(): readonly Project[].
- Produces: getProjectBySlug(slug: string): Project | undefined.
- Produces: filterProjects(projects, query): Project[].
- Produces: parseCatalogQuery(params): CatalogQuery.
- Produces: serializeCatalogQuery(query): URLSearchParams.
- Produces: FavoritesStore with subscribe, getSnapshot, toggle, clear.

Use these exact contracts:

~~~ts
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

export interface FavoritesStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): readonly string[];
  toggle(slug: string): void;
  clear(): void;
}
~~~

- [ ] **Step 1: Write failing filter and URL round-trip tests**

~~~ts
it("combines district, room and maximum price", () => {
  const result = filterProjects(projects, {
    district: "Центр",
    rooms: ["2"],
    maximumPrice: 8_000_000,
    sort: "price-asc",
  });
  expect(result.map((project) => project.slug)).toEqual(["central-park"]);
});

it("excludes missing prices from a price range", () => {
  expect(filterProjects(projects, { maximumPrice: 8_000_000 }))
    .not.toContainEqual(expect.objectContaining({ slug: "missing-price" }));
});

it("round-trips query state through URLSearchParams", () => {
  const query: CatalogQuery = {
    district: "Центр",
    rooms: ["1", "2"],
    sort: "price-asc",
  };
  expect(parseCatalogQuery(serializeCatalogQuery(query))).toEqual(query);
});
~~~

- [ ] **Step 2: Write failing favorites persistence tests**

Use an in-memory Storage test double. Verify toggle, duplicate prevention, clear, malformed JSON recovery, and subscriber notification.

- [ ] **Step 3: Run tests and verify failures**

Run: npm run test:run -- src/features/catalog src/features/favorites

Expected: FAIL with missing modules.

- [ ] **Step 4: Implement pure catalog functions**

Filtering order is text, district, room, completion, price, then sort. Text matching uses a lower-cased concatenation of title, shortDescription, district, and address. Sorting is stable and keeps missing prices after known prices.

- [ ] **Step 5: Implement the favorites external store**

Use one key: office-sales-76:favorites. Validate stored values as an array of strings. Expose the store through useSyncExternalStore so multiple cards update immediately.

- [ ] **Step 6: Run tests and commit**

~~~bash
npm run test:run -- src/features/catalog src/features/favorites
npm run typecheck
git add src/features
git commit -m "feat: add catalog filtering and favorites"
~~~

## Task 5: Establish the G+ design system and responsive application shell

**Files:**
- Create: src/styles/tokens.css
- Create: src/styles/global.css
- Create: src/styles/motion.css
- Create: src/components/Button/Button.tsx
- Create: src/components/Button/Button.module.css
- Create: src/components/ResponsiveImage/ResponsiveImage.tsx
- Create: src/components/Reveal/Reveal.tsx
- Create: src/components/PageSkeleton/PageSkeleton.tsx
- Create: src/components/SectionHeading/SectionHeading.tsx
- Create: src/components/SiteHeader/SiteHeader.tsx
- Create: src/components/SiteHeader/SiteHeader.module.css
- Create: src/components/SiteFooter/SiteFooter.tsx
- Create: src/components/MobileBottomNav/MobileBottomNav.tsx
- Create: src/components/DemoNotice/DemoNotice.tsx
- Modify: src/app/App.tsx
- Create: src/app/AppShell.test.tsx

**Interfaces:**
- Produces: shared site chrome for use inside the router built with the home page.
- Produces: Button, ResponsiveImage, Reveal, PageSkeleton, SectionHeading, DemoNotice.
- Consumes: generated company.json for contact links.

- [ ] **Step 1: Write the failing shell accessibility test**

~~~tsx
it("opens and closes the mobile menu with restored focus", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <SiteHeader mode="overlay" forceMobileForTest />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole("button", { name: "Открыть меню" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "Навигация" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
});
~~~

- [ ] **Step 2: Define the exact visual tokens**

~~~css
:root {
  --color-white: #ffffff;
  --color-surface: #f4f6f3;
  --color-graphite: #17221d;
  --color-text: #1c2721;
  --color-muted: #6f7a73;
  --color-accent: #718277;
  --color-border: #e2e7e3;
  --radius-card: 24px;
  --radius-control: 16px;
  --radius-pill: 999px;
  --container: 1320px;
  --shadow-soft: 0 22px 60px rgb(23 34 29 / 12%);
  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-sans: "Manrope Variable", Inter, system-ui, sans-serif;
}
~~~

Global styles include focus-visible, text selection, reduced motion, responsive container padding, and no horizontal overflow.

- [ ] **Step 3: Implement the semantic shell**

Header behavior:

- transparent over the home hero and solid on internal pages;
- desktop navigation at 1024 px and above;
- full-height mobile dialog below 1024 px;
- Escape closes the dialog and restores focus;
- body scroll locks while open.

Mobile bottom navigation contains Главная, Каталог, Избранное, Связаться and uses NavLink active state.

DemoNotice shows “Частная демонстрация” and the sourceCheckedAt date from source-report.json. It appears in the footer and near catalog price disclaimers without blocking navigation.

- [ ] **Step 4: Implement responsive media, loading, and motion primitives**

ResponsiveImage renders a picture element with AVIF and WebP srcset values from ImageAsset, preserves intrinsic aspect ratio, supports eager loading for the hero, and swaps to a neutral #F4F6F3 fallback with meaningful alt text after an image error.

Reveal uses IntersectionObserver once per section and leaves content visible when JavaScript, IntersectionObserver, or motion is unavailable. PageSkeleton exposes a labelled loading region used as the Suspense fallback when final route modules are added.

Add tests proving reduced-motion users receive no animated transform and a failed image never produces an empty broken-image icon.

- [ ] **Step 5: Run shell tests at desktop and mobile states**

Run:

~~~bash
npm run test:run -- src/app/AppShell.test.tsx
npm run typecheck
npm run build
~~~

Expected: PASS with no accessibility warnings from the test environment.

- [ ] **Step 6: Commit the shell**

~~~bash
git add src/app src/components src/styles
git commit -m "feat: add G+ application shell"
~~~

## Task 6: Implement honest demo lead flows

**Files:**
- Create: src/features/leads/lead.types.ts
- Create: src/features/leads/lead-validation.ts
- Create: src/features/leads/lead-validation.test.ts
- Create: src/components/LeadDialog/LeadDialog.tsx
- Create: src/components/LeadDialog/LeadDialog.module.css
- Create: src/components/LeadDialog/LeadDialog.test.tsx

**Interfaces:**
- Produces: LeadKind = "selection" | "callback" | "viewing".
- Produces: validateLead(input: LeadDraft): LeadErrors.
- Produces: LeadDialog props { open, kind, projectTitle?, onClose }.

Use these exact contracts:

~~~ts
export type LeadKind = "selection" | "callback" | "viewing";

export interface LeadDraft {
  name: string;
  phone: string;
  comment: string;
  consent: boolean;
  kind: LeadKind;
  projectTitle?: string;
}

export type LeadErrors = Partial<Record<"name" | "phone" | "consent", string>>;
~~~

- [ ] **Step 1: Write failing validation tests**

Verify trimmed name, Russian telephone normalization, required consent, optional comment, and rejection of fewer than ten phone digits.

- [ ] **Step 2: Write a failing no-network submission test**

~~~tsx
it("shows demo success without transmitting data", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const user = userEvent.setup();
  render(<LeadDialog open kind="viewing" projectTitle="ЖК Новация" onClose={vi.fn()} />);
  await user.type(screen.getByLabelText("Имя"), "Илья");
  await user.type(screen.getByLabelText("Телефон"), "+7 910 000-00-00");
  await user.click(screen.getByRole("checkbox", { name: /согласие/i }));
  await user.click(screen.getByRole("button", { name: "Проверить заявку" }));
  expect(await screen.findByText(/Демо-форма проверена/)).toBeVisible();
  expect(fetchSpy).not.toHaveBeenCalled();
});
~~~

- [ ] **Step 3: Run focused tests and verify failures**

Run: npm run test:run -- src/features/leads src/components/LeadDialog

Expected: FAIL with missing implementation.

- [ ] **Step 4: Implement the accessible dialog and local success state**

Use native dialog semantics through role="dialog", aria-modal, labelled title, focus trap, Escape close, and trigger focus restoration. Clear all input state after the success panel is closed. Submit handlers contain no fetch, XMLHttpRequest, navigator.sendBeacon, form action, or storage write.

- [ ] **Step 5: Verify and commit**

~~~bash
npm run test:run -- src/features/leads src/components/LeadDialog
npm run typecheck
git add src/features/leads src/components/LeadDialog
git commit -m "feat: add private demo lead flows"
~~~

## Task 7: Build the approved G+ home page

**Files:**
- Create: src/pages/HomePage/HomePage.tsx
- Create: src/pages/HomePage/HomePage.module.css
- Create: src/pages/HomePage/HomePage.test.tsx
- Create: src/pages/HomePage/components/HeroSearch.tsx
- Create: src/pages/HomePage/components/FeaturedProjects.tsx
- Create: src/pages/HomePage/components/ServiceSteps.tsx
- Create: src/pages/HomePage/components/TrustMetrics.tsx
- Create: src/pages/HomePage/components/DeveloperCta.tsx
- Create: src/app/routes.tsx
- Modify: src/app/App.tsx

**Interfaces:**
- Consumes: getProjects, filter serialization, PropertyCard, LeadDialog.
- Produces: the complete / route.

- [ ] **Step 1: Write the failing content-integrity test**

~~~tsx
it("uses real project count and never shows the rejected 184 figure", () => {
  renderHome();
  expect(screen.getByText("92 проекта")).toBeVisible();
  expect(screen.queryByText(/184/)).not.toBeInTheDocument();
});

it("submits hero search as catalog URL state", async () => {
  const user = userEvent.setup();
  renderHome();
  await user.selectOptions(screen.getByLabelText("Комнаты"), "2");
  await user.selectOptions(screen.getByLabelText("Район"), "Центр");
  await user.click(screen.getByRole("button", { name: /показать/i }));
  expect(window.location.search).toContain("rooms=2");
  expect(window.location.search).toContain("district=");
});
~~~

- [ ] **Step 2: Run the home tests and verify the red state**

Run: npm run test:run -- src/pages/HomePage

Expected: FAIL because the final home page is not implemented.

- [ ] **Step 3: Implement the hero exactly to the approved direction**

Use /media/site/hero-g-plus.webp with a dark horizontal overlay, transparent header, label “Отобранные новостройки Ярославля”, display headline “Весь город. Один правильный выбор.”, restrained supporting copy, and the rounded white search panel.

On mobile, replace the four-column search with one 44 px minimum button labelled “Комнаты · Цена · Район” that opens a bottom filter sheet.

- [ ] **Step 4: Implement the remaining home sections**

Use this order:

1. dynamic trust metrics;
2. featured projects selected deterministically from projects with covers and known prices;
3. service explanation;
4. zero-commission and developer-price benefits;
5. compact company section with verified contacts;
6. developer partnership CTA and presentation link;
7. final consultation CTA.

Do not use beige section fills. Alternate white and #F4F6F3.

Wrap editorial sections in Reveal, while keeping the hero visible immediately. Register the home route in createBrowserRouter and wrap route content with the Task 5 shell and PageSkeleton Suspense fallback.

- [ ] **Step 5: Verify home behavior and visual constraints**

Run:

~~~bash
npm run test:run -- src/pages/HomePage
npm run typecheck
npm run build
~~~

Expected: PASS.

- [ ] **Step 6: Commit the home page**

~~~bash
git add src/pages/HomePage public/media/site
git commit -m "feat: build approved G+ home page"
~~~

## Task 8: Build the full catalog and favorites pages

**Files:**
- Create: src/components/PropertyCard/PropertyCard.tsx
- Create: src/components/PropertyCard/PropertyCard.module.css
- Create: src/pages/CatalogPage/CatalogPage.tsx
- Create: src/pages/CatalogPage/CatalogPage.module.css
- Create: src/pages/CatalogPage/CatalogPage.test.tsx
- Create: src/pages/CatalogPage/components/CatalogFilters.tsx
- Create: src/pages/CatalogPage/components/CatalogToolbar.tsx
- Create: src/pages/CatalogPage/components/EmptyCatalog.tsx
- Create: src/pages/FavoritesPage/FavoritesPage.tsx
- Create: src/pages/FavoritesPage/FavoritesPage.test.tsx
- Modify: src/app/routes.tsx

**Interfaces:**
- Consumes: catalog query functions, favorites hook, Project.
- Produces: PropertyCard with compact and featured variants.
- Produces: complete /catalog and /favorites routes.

- [ ] **Step 1: Write failing catalog interaction tests**

Test district chip selection, room selection, maximum price, completion status, sort, reset, text search, “Показать ещё”, URL persistence, and empty results.

~~~tsx
it("does not render malformed price labels", () => {
  renderCatalog();
  expect(screen.queryByText(/млн ₽\/м²/)).not.toBeInTheDocument();
  expect(screen.queryByText(/^от\s*$/)).not.toBeInTheDocument();
});
~~~

- [ ] **Step 2: Write failing favorites tests**

Verify toggling from a card updates aria-pressed, persists after remount, appears on /favorites, and empty favorites has a catalog CTA.

- [ ] **Step 3: Run focused tests and verify failures**

Run: npm run test:run -- src/pages/CatalogPage src/pages/FavoritesPage

Expected: FAIL.

- [ ] **Step 4: Implement PropertyCard**

The card displays cover, district when known, completion label, title, short description, total minimum price formatted as “от 6,9 млн ₽”, and favorite toggle. Unknown price renders “Цена по запросу”, never zero. Entire card title links to the project; the favorite control remains a separate button.

- [ ] **Step 5: Implement desktop sidebar and mobile filter sheet**

Filters always read from and write to URLSearchParams. Mobile filter changes apply only when the user presses “Показать N проектов”; closing the sheet without applying preserves the prior URL.

- [ ] **Step 6: Implement incremental rendering**

Render 18 projects initially, then increase by 18. Reset visible count when filters change. Use a stable aria-live result count without announcing on every keystroke; debounce text search by 200 ms.

- [ ] **Step 7: Verify and commit**

Register /catalog and /favorites as lazy routes with PageSkeleton fallbacks before verification.

~~~bash
npm run test:run -- src/pages/CatalogPage src/pages/FavoritesPage src/components/PropertyCard
npm run typecheck
npm run build
git add src/components/PropertyCard src/pages/CatalogPage src/pages/FavoritesPage
git commit -m "feat: add complete catalog and favorites"
~~~

## Task 9: Build data-complete project detail pages

**Files:**
- Create: src/pages/ProjectPage/ProjectPage.tsx
- Create: src/pages/ProjectPage/ProjectPage.module.css
- Create: src/pages/ProjectPage/ProjectPage.test.tsx
- Create: src/pages/ProjectPage/components/ProjectGallery.tsx
- Create: src/pages/ProjectPage/components/ProjectFacts.tsx
- Create: src/pages/ProjectPage/components/ProjectLayouts.tsx
- Create: src/pages/ProjectPage/components/PurchasePrograms.tsx
- Create: src/pages/ProjectPage/components/RelatedProjects.tsx
- Modify: src/app/routes.tsx

**Interfaces:**
- Consumes: getProjectBySlug, PropertyCard, LeadDialog.
- Produces: complete /catalog/:slug route for all 92 slugs.

- [ ] **Step 1: Write failing route and omission tests**

~~~tsx
it.each(["zhk-novatsiya", "zhk-yaroslavl-siti-1-ztap", "zhk-granat"])(
  "renders imported route %s",
  (slug) => {
    renderProject(slug);
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByText(/Актуальность и наличие уточняйте/)).toBeVisible();
  },
);

it("omits empty facts instead of showing zero", () => {
  renderProject("project-with-missing-fields");
  expect(screen.queryByText(/0 млн|от\s*$|нет руб/)).not.toBeInTheDocument();
});
~~~

- [ ] **Step 2: Write failing gallery keyboard tests**

Verify open, ArrowRight, ArrowLeft, Escape, focus restoration, and meaningful alt text from project title plus image index.

- [ ] **Step 3: Run focused tests and verify failures**

Run: npm run test:run -- src/pages/ProjectPage

Expected: FAIL.

- [ ] **Step 4: Implement the project hero and facts**

Show title, short description, completion, room minimums, mortgage source label, address, map link, favorite, and “Записаться на показ”. Use URLSearchParams to deep-link to #description, #documents, #photos, and #layouts.

- [ ] **Step 5: Implement gallery, documents, layouts, and related projects**

Verified documents remain external source links with target="_blank" and rel="noopener noreferrer". An unverified document renders “Документ временно недоступен” plus a link to the project sourceUrl. Render Description, Documents, Photos, and Layouts as sequential semantic sections with a sticky anchor navigation, so content remains readable without client-side tab state. Layout cards omit unknown numeric cells. Related projects prefer explicit relatedProjectSlugs, then fill to three with same-district projects.

- [ ] **Step 6: Implement mobile fixed CTA safely**

Use CSS environment safe-area inset and reserve equivalent bottom padding on page content so the CTA never covers the last section or mobile bottom navigation.

- [ ] **Step 7: Verify every generated slug resolves**

Register /catalog/:slug as a lazy route, then add a test that maps every Project record through createMemoryRouter and asserts no route reaches NotFoundPage.

Run:

~~~bash
npm run test:run -- src/pages/ProjectPage
npm run typecheck
npm run build
~~~

Expected: PASS for all 92 project routes.

- [ ] **Step 8: Commit project pages**

~~~bash
git add src/pages/ProjectPage
git commit -m "feat: add complete project detail experience"
~~~

## Task 10: Build company, contacts, and legal pages

**Files:**
- Create: src/pages/AboutPage/AboutPage.tsx
- Create: src/pages/AboutPage/AboutPage.module.css
- Create: src/pages/AboutPage/AboutPage.test.tsx
- Create: src/pages/ContactsPage/ContactsPage.tsx
- Create: src/pages/ContactsPage/ContactsPage.module.css
- Create: src/pages/ContactsPage/ContactsPage.test.tsx
- Create: src/pages/LegalPage/LegalPage.tsx
- Create: src/pages/LegalPage/LegalPage.module.css
- Create: src/pages/LegalPage/LegalPage.test.tsx
- Modify: src/app/routes.tsx

**Interfaces:**
- Consumes: company.json, legal.json, LeadDialog.
- Produces: /about, /contacts, /privacy, /consent.

- [ ] **Step 1: Write failing company identity tests**

Verify public heading “Офис продаж 76”, legal reference “ООО «Ваш выбор»”, director name, city phone, mobile phone, email, address, and absence of 8 (902) 333-59-69 from primary contact UI.

- [ ] **Step 2: Write failing legal safety tests**

Verify both legal routes render the source-derived text, the legal-review notice, source link, and no real submission form.

- [ ] **Step 3: Run tests and verify failures**

Run: npm run test:run -- src/pages/AboutPage src/pages/ContactsPage src/pages/LegalPage

Expected: FAIL.

- [ ] **Step 4: Implement About**

Use the source statements as attributed company claims: 7 years, 1000+ sold objects, up to 90% of city new builds, official developer relationships, mortgage help, and 24/7 consultations. Render source certificates and testimonials only when imported assets are present.

- [ ] **Step 5: Implement Contacts**

Render tel:+74852955555, tel:+79109773737, mailto:yar.vibor@mail.ru, Telegram, MAX, and an encoded Yandex Maps search URL for “Ярославль, Победы 38/27, офис 501”. Add the callback LeadDialog.

- [ ] **Step 6: Implement Legal**

Use one page component selected by route data. Display the exact approved warning:

“Материал перенесён из действующего сайта и требует подтверждения оператора перед публикацией.”

Preserve source legal text as paragraphs without injecting source HTML.

- [ ] **Step 7: Verify and commit**

Register /about, /contacts, /privacy, and /consent as lazy routes before verification.

~~~bash
npm run test:run -- src/pages/AboutPage src/pages/ContactsPage src/pages/LegalPage
npm run typecheck
npm run build
git add src/pages/AboutPage src/pages/ContactsPage src/pages/LegalPage
git commit -m "feat: add company contact and legal pages"
~~~

## Task 11: Add SEO metadata, error states, and route assets

**Files:**
- Create: src/seo/seo-config.ts
- Create: src/seo/Seo.tsx
- Create: src/seo/Seo.test.tsx
- Create: src/app/AppErrorBoundary.tsx
- Create: src/pages/NotFoundPage/NotFoundPage.tsx
- Create: scripts/write-route-assets.ts
- Create: scripts/write-route-assets.test.ts
- Modify: src/app/routes.tsx
- Modify: index.html
- Generate: public/robots.txt
- Generate: public/sitemap.xml

**Interfaces:**
- Consumes: project route manifest.
- Produces: Seo props { title, description, image?, path }.
- Produces: buildCanonical(path, siteUrl?): string | undefined.
- Produces: route assets only when VITE_SITE_URL is explicitly provided.

- [ ] **Step 1: Write failing metadata tests**

Verify home and project titles, descriptions, Open Graph tags, and omission of canonical when VITE_SITE_URL is absent. Verify a supplied https://demo.example value generates a normalized canonical.

- [ ] **Step 2: Write failing route-asset tests**

Pass three fixture slugs and VITE_SITE_URL=https://demo.example. Assert sitemap contains home, catalog, and all three project URLs with escaped XML. With no VITE_SITE_URL, assert the generator reports that public route assets are skipped.

- [ ] **Step 3: Run tests and verify failures**

Run: npm run test:run -- src/seo scripts/write-route-assets.test.ts

Expected: FAIL.

- [ ] **Step 4: Implement metadata without pretending the demo owns the source domain**

Use document.title and deterministic meta-tag updates. Never set canonical to офиспродаж76.рф for the private demonstration. Generate canonical and sitemap only from an explicit environment URL.

- [ ] **Step 5: Implement error boundary and 404**

The error boundary shows a technical explanation, retry button, and home link. NotFoundPage offers catalog search and home. Both preserve the G+ shell.

- [ ] **Step 6: Generate local-safe route assets**

For the private demo, robots.txt contains:

~~~text
User-agent: *
Disallow: /
~~~

Sitemap generation remains testable but is not run without an approved public VITE_SITE_URL.

- [ ] **Step 7: Verify and commit**

~~~bash
npm run test:run -- src/seo scripts/write-route-assets.test.ts
npm run typecheck
npm run build
git add src/seo src/app src/pages/NotFoundPage scripts/write-route-assets.ts public index.html
git commit -m "feat: add metadata and resilient route states"
~~~

## Task 12: Verify complete user journeys, accessibility, and responsive polish

**Files:**
- Create: e2e/navigation.spec.ts
- Create: e2e/catalog.spec.ts
- Create: e2e/lead-form.spec.ts
- Create: e2e/accessibility.spec.ts
- Create: e2e/responsive.spec.ts
- Modify: README.md

**Interfaces:**
- Consumes: complete application.
- Produces: browser-level acceptance coverage and operator instructions.

- [ ] **Step 1: Add navigation and catalog journeys**

~~~ts
test("finds a project and returns with filters intact", async ({ page }) => {
  await page.goto("/catalog?district=Центр&rooms=2");
  await expect(page.getByText(/Найдено/)).toBeVisible();
  const firstCard = page.locator("article").first();
  const title = await firstCard.getByRole("heading").innerText();
  await firstCard.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/district=/);
  await expect(page).toHaveURL(/rooms=2/);
});
~~~

Add journeys for favorite persistence, empty results and reset, all primary navigation links, gallery keyboard controls, and legal routes.

- [ ] **Step 2: Add the demo-form journey**

Verify validation errors, successful demo result, automatic project context, no network request to any lead endpoint, and cleared fields after close.

- [ ] **Step 3: Add axe checks**

Run axe against /, /catalog, three project pages, /about, /contacts, /privacy, and /consent. Fail on serious and critical violations.

- [ ] **Step 4: Add responsive assertions**

At 360, 390, 430, 768, 1024, 1280, and 1440 px:

- documentElement.scrollWidth equals viewport width;
- mobile bottom navigation appears only below 1024 px;
- desktop navigation appears from 1024 px;
- hero search switches to the compact control below 768 px;
- fixed project CTA does not overlap the last content block;
- every visible primary control is at least 44 px high on mobile.

- [ ] **Step 5: Run the complete automated suite**

Run:

~~~bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npx playwright install chromium
npm run test:e2e
~~~

Expected: all commands exit 0.

- [ ] **Step 6: Run the production preview and inspect representative routes**

Run: npm run preview -- --host 127.0.0.1

Inspect /, /catalog, /catalog/zhk-novatsiya, /catalog/zhk-yaroslavl-siti-1-ztap, /catalog/zhk-granat, /about, /contacts, /privacy, and /consent in the browser. Confirm no console errors, broken images, empty legal content, horizontal scrolling, or focus traps.

- [ ] **Step 7: Measure Lighthouse**

Measure home, catalog, and one project route from the production preview. If any category is below 90, use the report to fix the specific blocking issue and rerun the affected automated checks.

- [ ] **Step 8: Complete README**

Document exact commands for install, import, dev, tests, build, preview, and data refresh. State prominently that:

- it is a private proposal demo;
- catalog snapshot date is visible in source-report.json;
- forms do not transmit;
- legal text, current availability, image rights, and integrations require company approval before publication.

- [ ] **Step 9: Commit final verification**

~~~bash
git add e2e README.md
git commit -m "test: verify complete G+ demonstration"
~~~

## Final Acceptance Gate

- [ ] git status --short is clean.
- [ ] src/data/projects.json contains exactly 92 unique projects.
- [ ] npm run lint passes.
- [ ] npm run typecheck passes.
- [ ] npm run test:run passes.
- [ ] npm run build passes.
- [ ] npm run test:e2e passes.
- [ ] Browser inspection passes at all required widths.
- [ ] Lighthouse representative routes score at least 90 in all four target categories.
- [ ] No request sends lead data, analytics, cookies, credentials, or private information.
- [ ] G+ hero, white rounded search, white/graphite palette, and independent mobile composition match the approved mockup.
- [ ] The final handoff states that the site is private and not publicly deployed.
