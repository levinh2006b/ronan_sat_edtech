# Agent Instructions

This file is the canonical agent-facing instruction document for repository-wide implementation rules.

## Code structure rules

- Prefer small, reusable components and focused service functions when they fit the existing architecture in `app/`, `components/`, `hooks/`, and `lib/`.
- Keep page components thin. Put data-fetching, orchestration, and business logic in `lib/services/`, `lib/controllers/`, shared hooks, or nearby page controllers when that matches the current pattern.
- Do not introduce one-off abstractions, duplicate helpers, or parallel implementations unless there is a clear recurring need.
- Preserve the current Next.js App Router structure. New routes belong under `app/`, shared UI under `components/`, and shared non-UI logic under `lib/`.

## TypeScript rules

- Treat TypeScript errors as part of done criteria for any touched file.
- Prefer explicit types and normalized data at boundaries over broad unions, implicit coercion, non-null assertions, or optional values leaking through the tree.
- Keep server and client boundaries deliberate. Add `"use client"` only where hooks, browser APIs, or client-only interactivity actually require it.

## Web design rules

- Treat `DESIGN.md` as the canonical human-readable guide for the product design system. Read it before changing any UI.
- Follow `DESIGN.md` strictly. The intended product direction is `The Living Workbook`, not a generic dashboard, SaaS shell, or glassmorphic marketing site.
- Default to the design tokens defined in `DESIGN.md`:
  - `paper-bg` for page surfaces
  - `ink-fg` for text, borders, and shadows
  - `surface-white` for elevated cards and modals
  - `primary`, `accent-1`, `accent-2`, and `accent-3` for semantic emphasis
- Treat `primary` as a selective highlighter color, not a default large-area fill. Prefer `paper-bg` or `surface-white` for major surfaces, and use `primary` for focused emphasis such as stickers, active states, buttons, and score highlights.
- Do not add raw hex values, arbitrary shadows, ad hoc gradients, blur-heavy treatments, or one-off border styles in components when the design system can express the intent.
- Depth must come from hard offset shadows, not blur. Avoid `blur`, `backdrop-blur`, and soft shadow aesthetics unless the user explicitly asks for an exception.
- Default borders are `2px solid` in the `ink-fg` color. Strong interactive headers use `4px` borders. Do not invent alternate border widths casually.
- Default corners should stay in the rounded, tactile family described in `DESIGN.md`. Prefer `rounded-2xl` for major UI surfaces and `rounded-full` for pills and stickers.
- Every interactive control should have a visible press state. Prefer states such as `active:translate-x-0.5 active:translate-y-0.5 active:shadow-none` or the closest equivalent.
- Inputs, toggles, tables, modals, alerts, and empty states should reuse the patterns described in `DESIGN.md` instead of inventing new component languages.
- When introducing richer UI controls such as selects, comboboxes, menus, or popovers, prefer a shadcn/Radix-style primitive as the implementation base, then fully theme it to the workbook system before shipping. Do not leave default library styling in product surfaces.
- Feature theming must follow the accent mapping in `DESIGN.md`: vocabulary and creative flows lean on `accent-1`, math and logic flows lean on `accent-2`, and alerts/errors use `accent-3`.
- Preserve responsive canvas behavior. Left-side desktop navigation should collapse into a mobile bottom-tab or equivalent compact navigation pattern rather than disappearing.
- Always account for unusually long text, large score values, dense tables, and small mobile screens. Constrain overflow intentionally.
- Keep styling decisions centralized. Shared tokens and primitives belong in `app/globals.css` or a future dedicated design-token module; screen-specific composition should stay with the component.
- If the design contract changes materially, update both `DESIGN.md` and `AGENTS.md` in the same change.

## Component and UI rules

- Keep visual components presentational where practical. Pass prepared data and state in through props instead of mixing dense logic into the rendered markup.
- Default to small, focused UI components. If a component starts rendering multiple distinct sections or becomes hard to scan in one pass, split it into nearby presentational subcomponents unless the UI is truly trivial.
- Reuse existing page-level controller hooks such as `useReviewPageController`, `useTestManagerPageController`, `useSectionalTestsController`, and `useVocabPageController` when extending those areas.
- Prefer extending existing UI families in `components/landing/`, `components/dashboard/`, `components/review/`, `components/test/`, `components/test-manager/`, and `components/vocab/` over creating near-duplicate component sets.
- When changing shared shell behavior, check `app/layout.tsx`, `components/Navbar.tsx`, and `app/globals.css` first so the result stays coherent across the product.

## Data and service rules

- Keep database access and persistence logic in `lib/models/`, `lib/schema/`, `lib/mongodb.ts`, and `lib/services/` rather than embedding it directly in route handlers or components.
- API routes under `app/api/` should stay thin and call shared service or controller code when possible.
- For local development workflows, prefer a local MongoDB target by default and require an explicit opt-in sync step when pulling fresh data from a remote MongoDB source.
- Preserve role-aware behavior for `STUDENT` and `ADMIN` flows. Do not collapse role distinctions accidentally when editing auth, dashboard, or admin features.
- Treat environment-backed integrations such as MongoDB, NextAuth, SMTP, and other external providers as configuration boundaries. Do not hardcode secrets, credentials, or provider-specific fallback values.

## Secure PDF and R2 rules

- Flattened PDFs are served from private Cloudflare R2 through `app/api/test-pdfs/download/route.ts`; do not restore the old browser-side PDF generation flow for students.
- `app/api/pdf-data/route.ts` must not expose raw question, answer, passage, or explanation payloads to students. If a debug/raw-data endpoint is ever needed, keep it admin-only and explicitly document the risk.
- Supabase stores only PDF metadata and R2 object keys in `test_pdf_assets`; never store R2 secrets in Supabase. R2 credentials belong only in server runtime env.
- `test_pdf_assets.object_key` must be the exact R2 object key, for example `test-pdfs/<testId>/full/v1.pdf`. It must not be a public URL, signed URL, or custom-domain URL.
- For Cloudflare R2 SDK access, `R2_ENDPOINT` must be the S3 API account endpoint origin, for example `https://<account-id>.r2.cloudflarestorage.com`. Do not include the bucket path, and do not use a public custom domain such as `https://storage.ronansat.com`.
- Keep `R2_BUCKET_NAME` separate from `R2_ENDPOINT`; the SDK receives the bucket via `Bucket`, and `forcePathStyle: true` is required for the current R2 client.
- When debugging R2 `NoSuchKey`, first compare `test_pdf_assets.object_key` against the object detail key in Cloudflare R2, then verify `R2_BUCKET_NAME`, then verify `R2_ENDPOINT` points at the same Cloudflare account as the bucket.
- Public custom-domain URLs are useful only for manual verification that a file exists. The app should stream through the authenticated API so auth, token-lock checks, and audit logging always run.
- Token-locked tests must also protect PDF downloads. Client-side unlocked flags are not sufficient; the download route must verify the stored token server-side before streaming from R2.
- Every successful PDF download should insert an audit row into `test_pdf_download_events` with user, test, asset, mode, user-agent, and IP when available.
- If the Supabase local reset script fails with `spawn supabase ENOENT` on Windows, resolve the local CLI from `node_modules/.bin/supabase.cmd`. If it then fails on Docker pipes, Docker Desktop is not running or not installed.
- `scripts/pdf/flattenPdfFolder.ts` is the image-only raster flattening pass. It reads static PDFs from `Desktop/flattened-pdfs`, writes separate output to `Desktop/image-only-pdfs`, preserves folder structure, and must not overwrite the source PDFs.
- Image-only flattening rasterizes pages and rebuilds a PDF from JPEG images so text cannot be selected/copied. The default production profile is 135 DPI, grayscale, JPEG quality 62 to keep full-length downloads near the low-MB range; override only after benchmarking.
- The image-only script must be resumable for overnight jobs: skip readable existing outputs by default, use `PDF_FORCE=1` only when regenerating, and write each output through a temporary `.partial` file before rename.

## Client prefetch and test-engine rules

- The app uses a custom client cache in `lib/clientCache.ts`; route-data prefetch must go through `readThroughClientCache` so page loads can join inflight work instead of duplicating API calls.
- Preload and intent-prefetch data should be persisted for the browser session with `persistForSession: true`; sessionStorage survives normal reloads and clears when the tab/session ends.
- Keep prefetch cache keys exactly aligned with page default state. For the test libraries, page-1 defaults are full-length `tests:1:15:createdAt:desc:All:all` and sectional reading `tests:1:15:createdAt:desc:All:reading`.
- Do not data-prefetch forbidden or high-risk areas broadly: `/admin`, admin-role data, route-level `/test/*`, or bulk review explanations. Current product exceptions allow explicit hover intent on a concrete Start/Retake test action to warm that test payload, and explicit hover intent on a concrete review result/question/back/next target to warm that single result/question only.
- Dashboard, full-length page 1, sectional page 1, and review summary are owned by `AppStartupPreloader`; do not add duplicate route-hover data prefetch for those destinations.
- `AppStartupPreloader` may warm data before a hover occurs. If a hover prefetch appears to do nothing, first check whether startup preload or `sessionStorage` already filled the same `bluebook:*` cache key.
- For hover-intent prefetch, cancel only the pending debounce timer before a request starts. Once a request has entered `readThroughClientCache`, do not abort it on `mouseleave` or unmount, because the destination page may already be sharing that inflight promise.
- Use one-shot and running-key guards for intent prefetches. Mark a prefetch as completed only after the callback succeeds; failures should not permanently block retry in the same browser session.
- Keep Next.js UI prefetch separate from data prefetch. Submit/Next Module hover in the test engine may call `router.prefetch()` for the review route only when it is actually possible to navigate there, and it must never trigger API/data prefetch before the submit mutation succeeds.
- In the test engine, the 75% answered threshold is a manual early-submit/early-next-module gate only. Timer expiry must call `handleSubmit({ trigger: "timer", bypassCompletionGate: true })`, advance full-length modules when applicable, and submit final/sectional attempts with unanswered questions saved as `"Omitted"`.
- Manual test-engine submit paths should pass `trigger: "manual"` explicitly. `isSubmittingRef` must remain the first duplicate-submission guard so timer and manual click races cannot create double submissions.
- The results API currently validates that `answers` is non-empty, not that a minimum percentage was answered. If server-side validation is added later, keep it compatible with timer-triggered omitted-answer submissions.

## Documentation rules

- Keep `README.md` aligned with any workflow, environment, or architecture changes that affect contributors.
- When a change introduces or updates a global convention, design rule, route contract, or memory workflow, update `AGENTS.md` in the same change.
- Prefer English for all new or edited documentation, code comments, identifiers shown to contributors, and developer-facing text. If touched code contains comments in another language, translate those comments to English instead of preserving mixed-language commentary unless the user explicitly requests otherwise.
- Default user-facing product copy to plain language that students and parents can parse quickly. Prefer common words like `Score Change`, `Sessions`, and `Latest Score` over analytics-heavy or finance-style labels unless the domain truly requires them.

## External memory rules

- Use `memory/` as the durable working-memory area for plans, decisions, and implementation notes.
- Do not keep appending major work logs into `memory/PLAN.md`.
- The current memory version is `0.2`. Log major feature work under `memory/0.2/` using the format `memory/0.2/[indexed 1-n]-specific-feature.md`.
- Before major feature work, migrations, or broad refactors, read the relevant notes under `memory/0.2/` instead of relying on a long shared `PLAN.md` ledger.
- If the requested major work is not yet documented, create the next indexed file under `memory/0.2/` with a short specific feature name before broad implementation continues.
- Record durable architectural or product decisions in small, specific markdown files under the active versioned memory directory so future agents can resume without relying on chat context alone.
- Keep memory files append-oriented where practical. Preserve prior decisions, mark status changes explicitly, and record what changed plus the next recommended step.
- If a subagent or side investigation produces a lasting conclusion, write that conclusion back into the appropriate versioned memory note before considering the work complete.

## Compatibility note

If another tool prefers a tool-specific instruction file, that file should point back to `AGENTS.md` instead of duplicating policy.
