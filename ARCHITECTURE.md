# Architecture

This document summarizes the main entry points and data flow for the Ronan SAT codebase. It is intentionally high level: use it to find the right area of the project before drilling into specific files.

## App Shell and Routing

The app uses the Next.js App Router under `app/`.

`app/layout.tsx` is the root shell. It loads the workbook fonts and wraps the app with the shared runtime providers: auth/session, PostHog, vocab board state, startup preloading, toast UI, and `AppShell`.

Main user-facing route areas include:

- `app/dashboard`
- `app/full-length`
- `app/sectional`
- `app/test`
- `app/review`
- `app/admin`
- `app/test-manager`
- `app/vocab`
- `app/groups`
- `app/settings`
- `app/welcome`

API route handlers live under `app/api/**/route.ts`.

## UI Components

Domain UI is grouped under `components/` by product area:

- `components/test` for the testing room and question-taking UI
- `components/review` and `components/report` for review/result surfaces
- `components/dashboard` for dashboard and test library UI
- `components/admin` and `components/test-manager` for admin workflows
- `components/vocab`, `components/groups`, and `components/question` for feature-specific UI

Shared primitives and workbook-styled UI building blocks live in `components/ui`.

Rich question content is rendered through the question viewer/rendering helpers, especially `QuestionViewer`, `QuestionExtraBlock`, `RichTextWithLatex`, and `utils/renderContent.tsx`. These areas handle HTML, LaTeX, tables, figures, and extra question payloads.

## API and Data Layer

Client-side API calls generally use `lib/axios.ts`, which sends credentials and performs a short 401 retry flow while browser auth state synchronizes.

Server route handlers under `app/api/**/route.ts` should stay thin. They delegate business logic to:

- `lib/services` for most data access and feature workflows
- `lib/controllers` for controller-style orchestration where that pattern already exists
- `lib/schema` for validation schemas
- `types` for shared TypeScript types

Supabase helpers and clients live under `lib/supabase`. Google Drive and PDF asset integration lives under `lib/googleDrive` and `lib/services/pdfAssetService.ts`. Runtime PDF downloads prefer the active Google Drive asset recorded in Supabase; if Drive streaming fails and a matching raster file exists in the configured local asset roots, `pdfAssetService` can stream that local raster through the same authenticated API route and audit path.

## State Management

Global app state is provider-based and starts in `app/layout.tsx`. This includes auth/session, PostHog, the vocab board provider, startup preload state, and shared app shell behavior.

Most feature state is local React state in page/client components or custom hooks. Shared hooks live in `hooks/`.

The test engine state is centered around `hooks/useTestEngine.ts`, `hooks/useTimer.ts`, `components/test`, and `lib/services/testEngineService.ts`.

Client-side cache and prefetch behavior lives in `lib/clientCache.ts`, `AppStartupPreloader`, and intent-prefetch hooks/components.

## Basic Data Flow

The normal request flow is:

1. A browser loads a route from `app/`.
2. The route renders page/client components from `components/`.
3. User actions call `lib/axios.ts` or a feature client/service.
4. Requests hit `app/api/**/route.ts`.
5. API routes call `lib/services` or `lib/controllers`.
6. Services read or write Supabase, auth/session data, PDF metadata, Google Drive assets, or other configured integrations.
7. The API response returns to the client.
8. Component state, hook state, or client cache updates the UI.

## Scripts and Operations

The `scripts/` directory contains operational workflows, not runtime UI.

Important script areas include:

- `scripts/pdf` for PDF generation, rasterization, and publishing workflows
- `scripts/questions` for scraped question conversion, repair, AI answer/classification pipelines, and the PostgreSQL-backed corpus evaluator
- `scripts/supabase` for local and remote Supabase maintenance
- `scripts/migrations` for migration workflows
- `scripts/users` for user maintenance utilities

Generated PDFs and question-conversion outputs should be treated as pipeline artifacts. Runtime student PDF delivery is handled through the authenticated API and the PDF asset services.

Math PDF repair uses `scripts/questions/auditRepairMathPdfLatex.ts` before the PDF pipeline when source content needs deterministic LaTeX cleanup. The PDF template also applies the shared scraped-content mojibake repair at render time so Drive uploads do not preserve common `â€™`/`Â°`-style encoding artifacts in generated HTML/PDF. The overnight Math rerender path should use the PDF script math-affected filters so only `sectional/Math` and full-length assets for tests that actually contain Math are regenerated and published.

Question corpus evaluation uses `scripts/questions/evaluateQuestionCorpus.ts`. It connects to PostgreSQL with `pg`, chunks question IDs into LLM batches, runs three DeepSeek solver calls plus one evaluator call per batch, writes JSONL backups and checkpoints outside the repo by default, and only mutates `public.questions` plus related answer tables when invoked with `--execute`. The script defaults solvers to DeepSeek V4 Flash and the evaluator to DeepSeek V4 Pro, with `--solver-model`, `--evaluator-model`, or legacy shared `--model` overrides. LLM execution defaults to Opencode with the text-only `summary` agent, but `--llm-provider=openai` can route the same prompts through an OpenAI-compatible `/chat/completions` endpoint using `--openai-base-url` and `--openai-api-key-env`. Solver calls use a separate concurrency lane so the three Flash solver calls can run together, and successful solver results are memoized per question so evaluator retries or split batches do not re-run the same Flash work. The script reuses the UI math renderer helpers for LaTeX payloads, skips known visual-problem rows before LLM calls, treats `image_url` as non-renderable for this project, sends existing SVG rows to visual review, treats placeholder answer choices such as `Option B` as deterministic defects, and routes missing/broken visual-source rows through deterministic replacement gates instead of LLM candidate evaluation. Operational runs can use `--max-new`, `--skip-completed-from`, `--known-issues-json`, and `--shutdown-on-complete` for staged dry-runs and overnight audits.
