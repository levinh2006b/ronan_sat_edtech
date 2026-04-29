# Supabase PDF Flattening

Status: in progress

Goal: generate static PDF files for every existing Supabase test into a local desktop folder before manual or scripted upload to R2.

Decisions:
- Keep this as an internal script, not a student-facing API. Student downloads must continue to use `app/api/test-pdfs/download/route.ts`.
- Reuse `utils/questionTemplate.ts` so generated full-length and sectional PDFs match the existing booklet layout.
- Query Supabase with the service role key because this is an offline admin/export workflow.
- Generate one full-length PDF per test and one sectional PDF per available subject (`Verbal`, `Math`) per test. Sectional PDFs include both modules for that subject when present, matching the current `DownloadPdfButton` contract.
- Output locally to `Desktop/flattened-pdfs`; do not upload to R2 or insert `test_pdf_assets` rows automatically in the first pass.
- Render HTML to PDF through a local Chromium-family browser in headless print mode. On Windows, check common Edge and Chrome install paths because the browser executable is often not on `PATH`.

Operational notes:
- The script needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- If PDF rendering fails with "Could not find a Chromium-family browser", install Microsoft Edge or Chrome, or pass `PDF_BROWSER_PATH`.
- If a test has no questions, skip it and print a warning.

Image-only raster flattening update:
- `scripts/pdf/flattenPdfFolder.ts` now means image-only flattening, not form/annotation flattening.
- It reads from `Desktop/flattened-pdfs` by default and writes to `Desktop/image-only-pdfs` by default, preserving the folder structure.
- The production output profile is grayscale JPEG at 135 DPI and quality 62. This prevents text selection/copying while targeting roughly 3 MB for a typical full-length PDF.
- Do not overwrite `Desktop/flattened-pdfs`; keep it as the source archive for re-rasterization.
- The image-only script is resumable: existing readable outputs are skipped by default, and `PDF_FORCE=1` forces regeneration. Outputs are written as temporary `.partial` files before being renamed into place.
- Benchmark on April 30, 2026: 107 source PDFs contain 4096 pages and total 66.4 MB. A 5-page 300 DPI JPEG 4:4:4 sample converted from 168.4 KB to 1.14 MB. The lighter production profile converted the same 5-page sample to 266.2 KB, projecting about 3.1 MB for a 58-page full-length test.
