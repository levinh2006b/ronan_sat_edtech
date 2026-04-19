# v0.1 Redesign Plan

## Goal

Ship `v0.1` as a whole-product redesign of the Ronan SAT app so the entire project, not just isolated pages, follows `DESIGN.md` and visually aligns with the sibling `../landing-page` reference at the level of product character, layout energy, and tactile interaction language.

## Working rules

- Update this file before and after each major redesign phase.
- Keep tasks in execution order so multiple agents can safely pick up the next clear step.
- Treat `DESIGN.md` as authoritative over existing in-repo UI code and over the sibling landing page implementation details.
- Use the sibling `../landing-page` as a visual reference, not a literal source of class strings or effects.
- Preserve product behavior and role-aware flows while redesigning the UI surface.

## Scope for v0.1

- Shared visual foundation in `app/globals.css`, `app/layout.tsx`, and shared shell/navigation components.
- Public and auth-facing surfaces including `app/auth/**` and any entry flow that users see before reaching the app.
- Student product surfaces including dashboard, full-length, sectional, review, test-taking, vocab, hall-of-fame, and settings.
- Parent dashboard surfaces and admin/fix workflows.
- Shared states such as loading, empty, modal, alert, table, form, and mobile navigation patterns.

## Non-goals for v0.1

- Rewriting backend services, persistence, or API contracts unless a UI redesign exposes a concrete product gap.
- Rebuilding feature logic that already works when a presentational refactor is sufficient.
- Blindly copying blur-heavy or hex-heavy implementation details from `../landing-page` that conflict with `DESIGN.md`.

## Execution ledger

1. Done: establish the repository-wide agent contract in `AGENTS.md`, with strict `DESIGN.md` alignment and a root-level external memory workflow under `memory/`.
2. Done: define `v0.1` as a whole-project redesign milestone centered on `DESIGN.md` compliance and sibling landing-page visual alignment.
3. Done: create the shared design foundation in `app/globals.css` and shared shell primitives so the app has canonical tokens, brutal shadows, tactile borders, page surfaces, table styles, modal styles, and mobile-safe navigation behavior.
4. Done: redesign the global navigation and layout shell in `app/layout.tsx`, `components/AppShell.tsx`, and `components/Navbar.tsx` so the product now uses a workbook-style desktop binder nav and mobile bottom-tab shell.
5. Done: redesign auth and entry flows in `app/auth/**` so first-use and sign-in surfaces match the new product language.
6. Done: redesign the core student dashboards and test-library screens in `app/dashboard/page.tsx`, `app/full-length/page.tsx`, `app/sectional/page.tsx`, `app/hall-of-fame/page.tsx`, and related dashboard components.
7. Done: redesign the deep-work learning screens in `app/review/page.tsx`, `app/vocab/page.tsx`, `app/fix/page.tsx`, and their main component families while preserving controller logic.
8. Done: redesign the live test-taking surface in `app/test/[id]/page.tsx` and related test components with special care for timing, density, readability, and press states.
9. Done: redesign secondary product surfaces including `app/settings/page.tsx`, `app/hall-of-fame/page.tsx`, `app/parent/dashboard/page.tsx`, and `app/admin/page.tsx` so they stay within the same system rather than drifting back to generic panels.
10. In progress: run a final consistency pass across loading, empty, success, error, and mobile states to remove leftover legacy styling and confirm the entire app feels like one `Living Workbook` product.

## Phase breakdown

### Phase 1: Foundation

- Introduce the canonical workbook tokens and utility classes in `app/globals.css`.
- Add reusable surface, button, input, table, badge, sticker, and modal styling patterns that reflect `DESIGN.md`.
- Normalize typography and page background behavior in the root layout.
- Define a mobile navigation approach that mirrors the desktop binder/sidebar intent instead of hiding major navigation.

### Phase 2: Shell and entry

- Redesign the shared navbar and shell containers first so every later screen inherits the right frame.
- Redesign auth, forgot-password, reset-password, and parent-auth entry points next because they shape first impressions.

### Phase 3: Student core flows

- Update dashboard, full-length, sectional, and hall-of-fame to the workbook system.
- Keep data density high but tactile, with thick borders, alternating table rows, and accent-driven section identity.

### Phase 4: Deep-work surfaces

- Redesign review, vocab, and fix as the most distinctive product surfaces.
- Preserve controller logic and interactions, but restyle boards, sidebars, flashcards, overlays, and report panels around the new system.

### Phase 5: Test and secondary roles

- Redesign live test-taking with extra caution because usability regressions here are costly.
- Bring settings, parent dashboard, and admin screens into the same design family.

### Phase 6: Consistency pass

- Sweep remaining shared components for legacy colors, radii, shadows, and generic panels.
- Validate desktop and mobile layout behavior, especially long text and dense data cases.

## Route groups to cover explicitly

- `app/auth/page.tsx`
- `app/auth/forgot-password/page.tsx`
- `app/auth/reset-password/page.tsx`
- `app/auth/parent/page.tsx`
- `app/dashboard/page.tsx`
- `app/full-length/page.tsx`
- `app/sectional/page.tsx`
- `app/review/page.tsx`
- `app/test/[id]/page.tsx`
- `app/vocab/page.tsx`
- `app/fix/page.tsx`
- `app/settings/page.tsx`
- `app/hall-of-fame/page.tsx`
- `app/parent/dashboard/page.tsx`
- `app/admin/page.tsx`

## Main risks

- The current app has multiple visual languages already in production, so token drift is likely unless the foundation lands first.
- The sibling landing page contains some raw hex values and blur effects that conflict with `DESIGN.md`; visual borrowing must happen at the level of composition and mood, not direct copy-paste.
- The test-taking flow is operationally sensitive, so visual changes there need stricter verification than marketing or dashboard screens.
- Some large pages, especially parent dashboard and review, combine dense logic with markup, so redesign work may require careful component extraction without changing behavior.

## Reflection

### 2026-04-13 v0.1 Reset

- `v0.1` should be treated as an app-wide redesign milestone, not a narrow landing-page port.
- The correct order is foundation first, shell second, then page families in descending product importance.
- The sibling `../landing-page` is useful for visual energy, composition, and brand feel, but `DESIGN.md` is the final source of truth when they disagree.

### 2026-04-13 Phase 1 Start

- The first implementation pass is limited to shared foundation work: global tokens, workbook utility classes, root layout framing, and navigation shell updates.
- Later page-specific redesigns should consume these shared primitives instead of adding another parallel visual system.

### 2026-04-13 Phase 1 Foundation Complete

- `app/globals.css` now exposes the workbook palette and shared tactile primitives, including brutal shadows, workbook buttons, workbook inputs, workbook panels, table styles, and modal styles.
- `app/layout.tsx` now uses a distinct display/body/mono font stack that better matches the academic workbook direction.
- `components/AppShell.tsx` and `components/Navbar.tsx` now provide a route-aware shell with a desktop binder sidebar and a mobile bottom-tab navigation pattern.
- The project-wide TypeScript check still fails, but the reported errors are pre-existing and currently limited to `components/admin/CreateQuestionForm.tsx`, `components/admin/CreateStudentForm.tsx`, `dump.ts`, and `lib/mongodb.ts`.

### 2026-04-13 Branding Alignment

- The shared app metadata now points to the landing-page `icon.png` and `apple-icon.png` assets.
- The shared Ronan SAT mark is now available in-repo at `public/brand/logo.svg` and consumed through `components/BrandLogo.tsx`.
- The workbook sidebar and new auth shell now use the real landing-page brand icon instead of a temporary placeholder mark.

### 2026-04-13 Auth Family Complete

- `app/auth/page.tsx`, `app/auth/forgot-password/page.tsx`, `app/auth/reset-password/page.tsx`, and `app/auth/parent/page.tsx` now share one workbook-style visual language through `components/auth/AuthWorkbookShell.tsx`.
- The parent account flow preserves its two-step request-and-verify behavior while matching the redesigned student auth surfaces.
- Targeted lint passed across the updated auth files and shared branding components.

### 2026-04-13 Design Rule Added

- `DESIGN.md` and `AGENTS.md` now explicitly instruct agents to default to smaller focused components and split oversized presentational files before they become difficult to scan.

### 2026-04-13 Phase 3 Start

- The first Phase 3 pass will target the shared student library surfaces before route-specific flourishes.
- `components/dashboard/TestLibrary.tsx`, `components/sectional/SectionalTestLibrary.tsx`, and `components/TestCard.tsx` are the main leverage points because they shape most of the visible student practice browsing experience.

### 2026-04-13 Phase 3 Student Libraries

- `app/full-length/page.tsx` and `app/sectional/page.tsx` now use workbook-style hero sections instead of generic page headers.
- Shared student browsing components were redesigned around smaller primitives: `components/dashboard/LibraryFilterSidebar.tsx`, `components/dashboard/LibraryHeader.tsx`, and `components/dashboard/LibraryPagination.tsx`.
- `components/TestCard.tsx`, `components/TestCardSkeleton.tsx`, and `components/DownloadPdfButton.tsx` now follow the workbook card language with tactile actions and denser visual hierarchy.
- Targeted lint passed for the updated student library files.

### 2026-04-13 Phase 3 Hall of Fame

- `app/hall-of-fame/page.tsx`, `components/StudentCard.tsx`, and `components/StudentCardSkeleton.tsx` now match the workbook system.
- The remaining student-core routing question is `app/dashboard/page.tsx`, which currently re-exports the parent dashboard and needs a deliberate product decision before the student dashboard portion of Phase 3 can be considered fully complete.

### 2026-04-13 Navigation And Color Correction

- Admin navigation now includes the main study destinations again, including `full-length`, `sectional`, `review`, and `vocab`, instead of showing only admin-only routes.
- `DESIGN.md` and `AGENTS.md` now explicitly state that `primary` is a selective highlighter, not a default flood-fill surface color.
- Shared workbook components were adjusted to reduce neon overuse by moving major surfaces back to `paper-bg` or `surface-white` and reserving `primary` for stickers and focused emphasis.

### 2026-04-13 Student Surface Cleanup

- The remaining large accent hero slabs in `app/sectional/page.tsx` and `app/hall-of-fame/page.tsx` were reduced to neutral surfaces with accent used only in stickers and small support details.
- Targeted lint passed after the cleanup pass.

### 2026-04-13 Student Dashboard Restored

- `app/dashboard/page.tsx` no longer re-exports the parent dashboard.
- The dashboard route is now role-aware: students see a dedicated workbook dashboard, parents are redirected to `/parent/dashboard`, and admins are redirected to `/admin`.
- The new student dashboard uses the existing user stats, results, and leaderboard APIs through `dashboardService`, and the shared dashboard panels were restyled into the workbook system.
- `/api/dashboard` still re-exports the parent dashboard API route, but it is currently unused by the app and was intentionally left untouched in this pass.

### 2026-04-13 Phase 4 Start

- Phase 4 begins with the most logic-heavy deep-work surfaces: `review`, then the kanban-style `vocab` and `fix` boards.
- The goal is to reframe these flows with workbook-style shells and tactile primitives while leaving controller logic intact.

### 2026-04-13 Phase 4 First Pass

- `app/review/page.tsx`, `components/review/ReviewResultsSidebar.tsx`, `components/review/ReviewReport.tsx`, `components/review/SkillPerformanceCard.tsx`, and `components/ReviewPageSkeleton.tsx` now use the workbook shell and tactile report styling.
- `app/vocab/page.tsx` and `app/fix/page.tsx` now sit on the workbook board shell instead of the older glassmorphic backdrop treatment.
- Shared board primitives and card surfaces were updated through `components/vocab/VocabBoardPrimitives.tsx`, `components/vocab/vocabPageTheme.ts`, `components/vocab/AddCardComposer.tsx`, `components/vocab/EditableVocabCard.tsx`, and `components/fix/FixCardTile.tsx`, which also affects the shared `vocab` and `fix` column families.
- Targeted lint passed for the first Phase 4 file set.
- `components/ReviewPopup.tsx`, `components/review/AnswerDetails.tsx`, and `components/review/PassageCollumn.tsx` are now migrated too, completing the main review flow shell for Phase 4.

### 2026-04-13 Phase 5 First Pass

- `components/test/TestHeader.tsx`, `components/test/TestFooter.tsx`, and `components/QuestionViewer.tsx` now use the workbook shell language instead of the older blue exam chrome.
- The live test route still needs a second-pass sweep on remaining support components, but the main test frame is now migrated.

### 2026-04-13 Secondary Surface Pass

- `app/settings/page.tsx`, `app/admin/page.tsx`, and `app/parent/dashboard/page.tsx` now use workbook-style page shells and major panel wrappers.
- The admin form family was also migrated through `components/admin/CreateTestForm.tsx`, `components/admin/CreateStudentForm.tsx`, and `components/admin/CreateQuestionForm.tsx`.

### 2026-04-13 Library Control Rule

- Library browsing surfaces now treat syncing as a lightweight inline status next to the section sticker rather than as a competing badge.
- New select-like controls should use a themed shadcn/Radix-style base component and be reskinned to workbook tokens before shipping.

### 2026-04-13 Phase 5 Completion And Consistency Sweep

- The remaining live-test support pieces now match the workbook system: `components/TestEngine.tsx` uses a workbook empty state and paper canvas, `components/DesmosCalculator.tsx` now renders as a tactile math tool overlay, and `components/test/SelectableTextPanel.tsx` now uses workbook-styled annotation controls and design-token highlight colors.
- Shared loading and skeleton surfaces were normalized away from leftover slate placeholders in `components/ReviewPageSkeleton.tsx`, `components/dashboard/LeaderboardTableSkeleton.tsx`, `components/dashboard/UserStatsPanelSkeleton.tsx`, `components/StudentCardSkeleton.tsx`, and `components/TestCardSkeleton.tsx`.
- Targeted eslint passed across the updated Phase 5 and consistency-sweep files.

### 2026-04-13 Testing Room Theme Preference

- `app/settings/page.tsx` now exposes a top-level local-only testing room preference so users can switch between the Ronan workbook exam chrome and a cleaner College Board / Bluebook-style room.
- The preference is stored in browser `localStorage` through `hooks/useTestingRoomTheme.ts` and `lib/testingRoomTheme.ts`, not in server-backed account settings.
- `components/TestEngine.tsx`, `components/test/TestHeader.tsx`, `components/QuestionViewer.tsx`, `components/test/TestFooter.tsx`, and `components/DesmosCalculator.tsx` now all consume that shared client preference so the live exam shell and calculator stay visually consistent.

### 2026-04-13 Testing Room Preset Architecture

- `lib/testingRoomTheme.ts` is now the canonical preset registry for testing-room themes, including theme metadata, settings-card preview styling, and exam-surface style tokens for the shell, header, footer, question viewer, and Desmos overlay.
- Future testing-room themes should be added by extending the preset registry and reusing the shared component structure rather than adding new per-component `theme === ...` branches.
- `app/settings/page.tsx` now renders its selectable theme cards from the preset list, so new configured themes automatically appear in settings without another parallel options list.

### 2026-04-14 Testing Room Mobile Pass

- `components/QuestionViewer.tsx` now collapses the split passage-and-question layout into a vertical stack on smaller screens, keeps the draggable divider desktop-only, and reduces mobile padding and answer density so the exam room stays usable on narrow devices.

### 2026-04-19 Route Transition Feedback Pass

- Shared route transitions now use `components/RouteProgressBar.tsx`, mounted in `app/layout.tsx`, to show an immediate YouTube-style top loading bar for internal page changes instead of waiting for destination screens to visibly stall.
- The main navbar destinations now keep their page frame visible while loading: `dashboard`, `full-length`, `sectional`, `review`, `admin`, and `settings` render in-layout skeleton states rather than replacing the whole screen with the generic `Loading` overlay.
- Repository verification is still partially blocked by pre-existing tooling issues: eslint currently crashes inside `eslint-plugin-react` (`react/display-name`), and `tsc --noEmit` currently reports stale `.next` validator references to missing route layout files.

### 2026-04-19 Initial Boot Loader Consistency Pass

- `components/InitialTabBootReady.tsx` now supports a `when` gate and clears the initial-tab boot flag only after two animation frames, so the pretty loader drops only after the ready screen has actually painted.
- Hydration-sensitive routes now gate boot completion correctly: `app/vocab/page.tsx` waits for board hydration, and `app/fix/page.tsx` waits for fix-board hydration instead of clearing boot as soon as the shell mounts.
- Non-happy-path settled states now also clear boot so the app does not get stuck on the pretty loader when a page resolves into an empty or unauthorized screen: `app/settings/page.tsx`, `app/parent/dashboard/page.tsx`, and `components/TestEngine.tsx` now mark boot ready in those resolved fallback states too.

### 2026-04-19 Review Error Log

- `app/review/page.tsx` now includes a sibling `Error log` screen next to `Results`, so review can switch between per-test report cards and a single Notion-inspired mistake table.
- The new `components/review/ReviewErrorLog.tsx` flattens review history into only wrong and skipped questions, supports search and wrong/skipped filtering, and lets students assign a single `Reason` category inline.
- `Result.answers` now supports a persisted `errorReason`, exposed through `/api/results` and updated through `/api/results/reason`, so reason labels survive reloads instead of living only in client state.
- Review reasons now live in the user record as a synced catalog with label, color, and order metadata, served by `/api/user/review-reasons` and used by the error-log dropdown and customization UI.

### 2026-04-19 Review Error Log Performance Pass

- The error log now reads from a dedicated paginated endpoint at `/api/results/error-log` instead of flattening the full review history in the client.
- The error-log screen now loads only 20 latest matching questions at a time and appends the next 20 through an explicit `Show more` action.
- Review route warmup no longer preloads the full review-history payload, and `useReviewPageController` skips full-results hydration entirely while the error-log view is active so route progress stays responsive.

### 2026-04-19 Review Reason Persistence Tightening

- Answer-reason writes now use `updateOne` and only touch the single matched `answers.$.errorReason` field, unsetting it fully when a reason is removed instead of reading back the whole result document.
- User reason-catalog saves now use `updateOne` too, and the default catalog is no longer stored on every user document; if a user is still on defaults, the field is omitted and reconstructed on read.
- `Result` now has a compound index on `{ userId, isSectional, createdAt }` to better support paginated error-log reads.

### 2026-04-17 Vocab Revision Upgrade Start

- The SAT vocab board is being extended from plain text cards into revision cards with a dedicated term plus editable definition.
- The feature scope includes per-card practice access, collection-level flashcard practice, and a free dictionary lookup action that can prefill a card definition for later editing.
- Backward compatibility matters here because persisted boards already exist, so normalization should upgrade legacy `word: meaning` text cards into the new structured shape instead of dropping user data.

### 2026-04-18 Startup Data Warmup

- The root layout now mounts a hidden startup preloader that begins warming authenticated app data as soon as profile-gated routes open.
- The preload pass fills the same session-storage keys already used by the student dashboard, full-length library, sectional library, review flow, and parent dashboard so those screens can render from warm cache immediately after the initial loading phase.
- The sectional controller now reuses the shared cached result history instead of always doing a fresh `/api/results` fetch on first open.
- The parent dashboard now shares a dedicated `parent:dashboard` cache entry and also reuses the warmed leaderboard cache instead of always cold-loading both panels.

### 2026-04-14 Dracula Testing Room Theme

- `lib/testingRoomTheme.ts` now includes a third `dracula` preset with a dark graphite shell, crimson accents, and shared styling tokens for the test shell, header, footer, viewer, Desmos overlay, and settings preview card.
- `components/test/TestHeader.tsx` now reads mobile control shape classes from the preset itself instead of hard-coding a `ronan` vs non-`ronan` split, so future themes can define their own button geometry cleanly.
- `components/QuestionViewer.tsx` now also reads the SPR label color and crossed-out answer strike color from the active preset so dark testing-room themes keep the core question UI legible.

### 2026-04-14 PDF Booklet Alignment

- `components/DownloadPdfButton.tsx` still drives the client-side print/export flow, but the printable template in `utils/questionTemplate.ts` is now being pushed toward the official SAT digital practice booklet structure instead of the earlier generic Ronan export layout.
- Deployment-safe PDF assets are now bundled in-repo under `public/pdf-assets/banners/` and `public/pdf-assets/fonts/`, including the top-banner SVGs and Minion Pro font files.
- The PDF template now links KaTeX CSS, uses bundled Minion Pro through `@font-face`, and preserves a two-column booklet-style layout with official-style section sequencing.
- A durable implementation note for this work now lives in `memory/pdf-export-official-digital-booklet.md` and should be read before continuing PDF fidelity work.
- The current unresolved visual issue is exact top-banner scaling/alignment: future work should debug `buildTopBand()` together with the active `.top-band` CSS instead of reverting to inline base64 banners or local filesystem asset paths.
- Full-line math equation centering in the PDF template now works by promoting standalone math in both `questionText` and `passage`, then centering the resulting `.display-math-block`; this must not be applied to answer choices.

### 2026-04-14 PDF Booklet Styling

- `components/DownloadPdfButton.tsx` still uses the client-side print flow, but `utils/questionTemplate.ts` has been fully rebuilt from the old generic export into an SAT-style print booklet template.
- The current PDF template now follows the official digital SAT paper-practice structure much more closely: official-style cover page, `Test begins on the next page`, module headers, reading and writing module pages, math reference/instructions pages, stop banners on the final page of each module, spacer pages that say `No Test Material On This Page`, and a final general-directions page.
- The front-page badge now uses `public/brand/logo.svg` and the `RONAN SAT` wordmark instead of the prior SAT placeholder lockup.
- The cover-page `6VSL02` text was intentionally removed.
- The footer `CONTINUE` control was restyled away from a generic gray pill into a right-pointing arrow-style control with the label inside it.
- The question content was tightened to better match the official booklet density: smaller body text, smaller table text, taller gray question bars, and tuned black number tabs.
- The redundant `Question n` text above passages was removed because it did not exist in the reference and added noise.
- Important implementation detail: the question-tab centering bug was caused by `.question-bar span` affecting both the outer tab wrapper and the inner numeral span. This was corrected by changing the selector to `.question-bar > span`, which allows `.question-bar-number-text` to be moved independently for optical alignment.
- Current PDF styling work should continue from `utils/questionTemplate.ts`; do not reintroduce the older answer-key appendix or generic boxed-question export unless there is an explicit product request.
- `components/test/TestHeader.tsx` now wraps safely on mobile by moving the timer onto its own row, shrinking control sizing, and preventing the title, timer, and action cluster from overlapping.
- `components/test/TestFooter.tsx` now uses a shorter mobile bar, a more compact navigator label, smaller action buttons, and a lower mobile question-grid sheet so bottom controls fit short screens better.
- Targeted eslint passed for `components/QuestionViewer.tsx`, `components/test/TestHeader.tsx`, and `components/test/TestFooter.tsx` after the responsive adjustments.
- The live testing UI in `components/QuestionViewer.tsx` now mirrors the PDF math legibility fix for inline tall math: fractions/exponents are detected from the raw source, inline `\frac` is upgraded to `\dfrac`, `\displaystyle` is added for tall inline math, and testing-only spacing classes in `app/globals.css` increase prompt and choice leading without changing unrelated product surfaces.

### 2026-04-14 Student Dashboard Trend Panel

- `app/dashboard/page.tsx` now gives the student dashboard a dedicated improvement graph panel ahead of the leaderboard instead of using that primary slot only for rankings.
- The new `components/dashboard/ImprovementTrendPanel.tsx` derives a daily best-score trend from the existing dashboard results payload, supports `15 Days` and `Month` windows without a new API, and shows net change, latest score, and session count for the selected window.
- A local shadcn-style chart base now lives in `components/ui/chart.tsx`, themed to workbook tokens and used with `recharts` so future charts can stay visually consistent without bootstrapping the whole repo into full shadcn component generation.

### 2026-04-15 PDF QR Entry Flow

- `components/DownloadPdfButton.tsx` now generates a QR code during the existing client-side print flow and passes the linked testing-room entry URL plus QR SVG into `utils/questionTemplate.ts`.
- `utils/questionTemplate.ts` now renders a QR callout on the PDF cover with the Ronan logo centered in the code, preserving the current client-side export architecture rather than restoring the deprecated server-side PDF route.
- QR links now target a dedicated entry route at `app/test/[id]/entry/page.tsx` instead of dropping straight into the timed room.
- The new `/test/[id]/entry` screen supports both full-length and sectional links, shows exam specs before launch, and for sectional links without a module lets the student choose the module from that screen.
- Shared test-room link construction now lives in `lib/testEntryLinks.ts`; future QR, share-link, or invite work should build on that helper rather than manually assembling `/test/...` URLs in multiple places.

### 2026-04-18 Student Identity Onboarding

- Student accounts now need a one-time welcome setup with an immutable `username` and `birthDate` before entering the main app.
- Username availability should stay efficient by querying a sparse unique MongoDB index on the normalized lowercase `username` field rather than scanning names or using regex lookups.
- Settings should show student identity details as locked read-only values, not as editable profile fields.
