# Task 7 report — approved G+ home page

## Result

Implemented the approved G+ home route on base `d2b5265`, including the shared router shell,
source-backed hero and search, full ordered home-page composition, accessible mobile filter sheet,
honest local lead CTAs, deterministic featured projects, and the shared `PropertyCard` contract that
Task 8 can extend.

No source snapshot, imported project media, or public integration was changed. No site was deployed.

## Delivered architecture

- Replaced the preview-only `BrowserRouter` wrapper with `createBrowserRouter` in
  `src/app/routes.tsx`; `App` now renders `RouterProvider`.
- Added one shared layout with skip link, overlay header on `/`, solid header on internal routes,
  `Suspense`/`PageSkeleton`, `Outlet`, footer, and mobile bottom navigation.
- Registered restrained private-demo placeholders for future routes and a styled route error state,
  so current links never fall into React Router's default error screen. Tasks 8–11 can replace these
  route elements directly.
- Added `data-mode` to `SiteHeader` as an observable shell contract for route-level tests.

## Home page

- Uses `/media/site/hero-g-plus.webp` plus its verified AVIF/WebP variants with eager/high-priority
  loading, a restrained horizontal contrast overlay, the exact approved eyebrow and headline, and a
  rounded white search panel.
- Desktop search has room, maximum-price, and dynamically derived district fields plus a submit
  result count. It navigates through `serializeCatalogQuery` rather than mutating `window.location`.
- Below 1024 px, search becomes the exact `Комнаты · Цена · Район` button and an accessible bottom
  sheet with draft-only edits, actual result count, apply/cancel separation, focus trapping, Escape,
  focus restoration, safe-area padding, internal scrolling, body lock, inert background, and cleanup.
- Sections follow the approved order and alternate only white / `#F4F6F3`: real trust metrics,
  featured projects, service steps, verified benefit claims, compact company/contact block,
  developer CTA, and final consultation CTA. Editorial sections use `Reveal`; the hero does not.
- All counts and district values are derived from `getProjects()`: 92 projects, 5 districts, and 80
  projects with a trusted displayed minimum price. The rejected 184 figure is absent.
- The developer CTA is the truthful `Запросить презентацию` button. Because validated company data
  contains no presentation asset, it opens the existing local callback `LeadDialog`; no fake file,
  download, message, or network action is presented.
- `LeadDialog` now states at initial open that the form sends and stores nothing, rather than only
  revealing that fact after validation succeeds.

## Shared PropertyCard

- Added a stable `PropertyCard({ project, variant?: "featured" | "compact" })` API.
- Featured cards render a responsive cover, known district/completion, title, description, total
  minimum price as `от X млн ₽`, and `Цена по запросу` when total price is absent.
- Price-per-square-metre labels are never synthesized from a total price.
- Project navigation and the 46 px favorite control are separate interactive elements. The favorite
  button uses `useFavorites`, exposes an accurate accessible name and `aria-pressed`, and persists
  through the existing store.
- Home selection is deterministic: source projects with covers and positive trusted minimum prices
  are ordered by slug and the first three are shown.

## TDD evidence

1. Added Home, router-shell, and PropertyCard behavior tests before production modules existed.
2. The focused RED run failed on missing `src/app/routes.tsx`, missing `PropertyCard`, and the legacy
   App placeholder headline.
3. Implemented the smallest route/card/home contracts, then used failing focused assertions to fix
   Russian result-count pluralization, the whole-text `92 проекта` integrity contract, the initial
   no-transmission notice, and strict optional image props.
4. Focused tests reached green, followed by the full regression suite.

Coverage includes exact hero text/image, 92/no-184 integrity, deterministic priced featured cards,
desktop URL serialization, mobile draft/cancel/apply/result count, focus/body cleanup, honest CTA
dialogs, real contacts, overlay/solid shell modes, safe placeholder routing, malformed-price absence,
and favorite-button separation.

## Fresh verification

| Command | Result |
| --- | --- |
| `npm run test:run -- src/pages/HomePage src/components/PropertyCard src/app/App.test.tsx` | Exit 0; 3 files / 12 tests passed |
| `npm run test:run` | Exit 0; 18 files / 158 tests passed |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; production bundle completed |
| `git diff --check` | Exit 0 |

## Remaining verification and limitations

- Controller/root browser QA remains required at 360, 390, 430, 768, 1024, 1280, and 1440 px for
  exact composition, image-subject placement, interactive focus appearance, and horizontal overflow.
- Vite reports its advisory 500 kB uncompressed chunk threshold for the lazy Home chunk because it
  contains the complete verified 92-project JSON snapshot. The built Home chunk is 809.15 kB
  minified and 123.01 kB gzip. The warning limit was not suppressed; later data-route work can split
  delivery if browser measurements show a real performance issue.
- An independent reviewer subagent was not dispatched because the Task 7 assignment explicitly
  prohibited subagents. The implementation received a local requirements/diff self-review; root
  review and browser QA remain the next gates.
