# Task 5 report — G+ design system and responsive application shell

## Result

Implemented the reusable G+ application shell and UI primitives on top of base commit `7525f68` without introducing the Task 7 router or home-page content early.

The delivered shell uses the approved white / soft-green / graphite visual direction, local Cormorant Garamond and Manrope fonts, a 1320 px content container, 24 px cards, restrained motion, and an exact desktop boundary of `min-width: 1024px`.

## Production changes

### Shared styling

- Added `src/styles/tokens.css` with the approved palette, typography, radius, shadow, timing, and container tokens.
- Expanded `src/styles/global.css` with local font imports, box sizing, safe horizontal overflow, responsive container gutters, selection styling, visible keyboard focus, and reusable visually-hidden text.
- Added `src/styles/motion.css` so reduced-motion users receive effectively static animation and transition behavior.
- Updated `src/main.tsx` to load tokens before global styles and reduced-motion overrides after them.

### Shared primitives

- `Button`: primary, secondary, and ghost variants; regular/large sizes; full-width option; hover, active, focus-visible, disabled, and honest loading state. It never performs a network action itself.
- `ResponsiveImage`: AVIF and WebP `srcset` generation from the existing `ImageAsset` contract, sorted responsive widths, `sizes`, configurable aspect ratio, eager/high-priority hero support, lazy default loading, and a neutral labelled fallback that removes the failed `<img>` instead of leaving a broken-image icon. It only consumes shared asset URLs and makes no ownership assumptions about deduplicated files.
- `Reveal`: server/JavaScript-safe visible default, one `IntersectionObserver` per mounted section when supported, disconnect-after-first-intersection behavior, visible fallback without the API, and no transform for reduced-motion users.
- `PageSkeleton`: an accessible labelled `role="status"` loading region with responsive placeholders and reduced-motion-safe animation.
- `SectionHeading`: reusable editorial eyebrow, display heading, description, and alignment contract.
- `DemoNotice`: reads `sourceCheckedAt` from `source-report.json`, renders a semantic `<time>` value, states “Частная демонстрация”, and includes the approved availability warning without blocking navigation.

### Responsive shell

- `SiteHeader` supports solid internal-page and transparent overlay modes.
- Desktop navigation is shown from exactly 1024 px; mobile navigation is used through 1023 px.
- The mobile menu is a body-level full-height modal portal with `aria-modal`, a labelled dialog, correct `aria-expanded` / `aria-controls`, close button, Escape handling, navigation-close handling, focus trapping, trigger focus restoration, body scroll lock, background `inert` + `aria-hidden`, and full cleanup on close or unmount.
- Header consultation actions resolve to a real `tel:` URI derived from schema-validated `company.json`; no form submission is implied.
- `MobileBottomNav` contains Главная, Каталог, Избранное, and Связаться; the first three use `NavLink` active state, while Связаться is an honest mobile-phone `tel:` link derived from validated company data. Every target is at least 44 px high and the bar accounts for safe-area insets.
- `SiteFooter` uses validated company identity and real `tel:` / `mailto:` links, legal navigation, company context, and the dated private-demo notice.
- `App.tsx` demonstrates only the shell with a restrained placeholder, skip link, and real internal catalog link. Task 7 remains responsible for the final router and complete home page.

## TDD evidence

1. Initial shell test failed because `SiteHeader` did not exist.
2. The first header implementation then failed the Escape-close assertion, proving the keyboard test exercised real behavior; the event-boundary bug was corrected and the test turned green.
3. The expanded suite failed while the remaining primitives were absent, then passed after the components were implemented.
4. A combined app-shell run exposed the legacy smoke test's ambiguous text query after the footer correctly repeated the brand; the smoke assertion was narrowed to the unique level-one heading.
5. Production build initially failed on a nonexistent Manrope subset CSS entrypoint. The import was corrected to the package's real local entrypoint and the build passed.

`src/app/AppShell.test.tsx` now covers:

- menu open state and ARIA wiring;
- close button, Escape, and navigation close paths;
- focus trap and focus restoration;
- body lock, inert background, and unmount cleanup;
- server rendering without browser-global access during render/import;
- active mobile navigation and real contact URI;
- validated phone/email links and snapshot date/private-demo status;
- AVIF/WebP source sets, eager hero priority, aspect ratio, and failed-image fallback;
- reduced-motion reveal behavior;
- labelled skeleton and disabled/loading button state.

## Fresh verification

- `npm run lint` — PASS, exit 0.
- `npm run typecheck` — PASS, exit 0.
- `npm run test:run` — PASS, 14 files and 113 tests.
- `npm run build` — PASS, Vite production bundle completed.
- `git diff --check` — PASS, exit 0.

## Scope and remaining verification

- Source snapshot files, catalog domain contracts, generated JSON, and generated media were not modified.
- No backend, network submission, analytics, storage, router expansion, home sections, catalog page, or lead flow was introduced.
- Interactive browser QA could not be completed in this worker because the sandbox rejected the local Vite listener with `listen EPERM`; the permission escalation produced no output and was aborted. Root will run preview/browser QA after this scoped commit. Static responsive rules and all DOM-level interaction/accessibility contracts above are verified.
