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

Google Drive publishing update:
- PDF binary storage has pivoted from R2 to Google Drive. `test_pdf_assets.object_key` remains a logical path, while `drive_file_id` points to the actual Drive file.
- App downloads must continue through `/api/test-pdfs/download`; never expose raw Drive links to students.
- `scripts/pdf/publishDrivePdfAssets.ts` handles mapping, rasterizing, uploading to Drive, and inserting Supabase metadata. It is dry-run by default and requires `--execute` for Drive/Supabase mutations.
- The publish script supports strict file names (`<uuid>_full.pdf`, `<uuid>_verbal.pdf`, `<uuid>_math.pdf`) and the current legacy folder layout.

Math LaTeX repair and rerender update:
- Before rerendering Math-affected PDFs, run `scripts/questions/auditRepairMathPdfLatex.ts` in dry-run mode. It targets Math questions/options/SPR answers and table extras only, writes backup/diff/review reports, and only applies deterministic syntax fixes when run with `--execute`.
- Use the math-affected PDF filters for the overnight pipeline. This scope includes `sectional/Math` plus full-length assets for tests that contain Math, and excludes `sectional/Verbal` plus Verbal-only full-length assets.
- Generated HTML must be scanned for `katex-error` before Drive publish. Do not publish a Math-affected asset if the source repair report still has unresolved ambiguous source-loss items for that asset.

May 11, 2026 publish result:
- Production Supabase Math content repair ran twice after pagination fixes, updating 4,871 fields total. Backups/reports were written outside the repo under `Desktop/math-affected-pdf-rerender-db-audit-v2` and `Desktop/math-affected-pdf-rerender-db-audit-v6`.
- Math-affected vector generation produced 80 PDFs under `Desktop/flattened-pdfs-math-affected-pdf-rerender`: 40 full-length PDFs for tests containing Math and 40 Math sectional PDFs. Generated HTML scan found 0 `katex-error` files.
- Drive publish executed with 300 DPI, JPEG quality 80, 4:4:4 chroma, grayscale off, and `PDF_FORCE=1`. It published exactly 80 active assets: 40 full and 40 sectional Math. No sectional Verbal assets were regenerated or published.
- Post-publish Supabase verification found all 80 published object keys active. The 40 affected tests still have their existing 40 active Verbal assets, but none came from this publish run.
- One source-loss Math prompt remains unresolved for manual review: question `a0b68dce-9b27-46c5-b065-184ecdcd09dc` contains `\(x1+x−71=x^2−7x6\)`. It renders without KaTeX failure, but the math semantics are likely wrong in source data.
