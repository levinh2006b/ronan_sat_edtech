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
- `scripts/questions` for scraped question conversion, repair, and AI answer/classification pipelines
- `scripts/supabase` for local and remote Supabase maintenance
- `scripts/migrations` for migration workflows
- `scripts/users` for user maintenance utilities

Generated PDFs and question-conversion outputs should be treated as pipeline artifacts. Runtime student PDF delivery is handled through the authenticated API and the PDF asset services.
