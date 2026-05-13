# Scraped Question Content Normalization

## Status

- Done: normalize scraped question content before full migration/import.

## Decision

- Scraped CSV conversion should store workbook-renderable HTML, not raw Markdown markers, in generated admin JSON.
- The same normalization should also run during admin JSON upload so older `*.ready.json` files are cleaned before database writes.
- Normalization includes common mojibake repair, light Markdown inline/block conversion, and existing LaTeX delimiter cleanup.

## Scope

- Convert blockquote lines to `<blockquote>`.
- Convert bold/italic Markdown markers to `<strong>` and `<em>`.
- Convert blank-line paragraph breaks to `<br><br>` while preserving existing HTML snippets.
- Repair common scraped mojibake sequences such as smart quotes, degree symbols, comparison/math glyphs, and dash/ellipsis punctuation.

## Verification

- Added `scripts/questions/checkScrapedQuestionContentNormalization.ts` with representative mojibake, Markdown blockquote, paragraph break, bold/italic, and LaTeX preservation checks.
- Ran the check script and targeted ESLint successfully.

## 2026-05-11 PDF/Evaluator Follow-up

- `utils/questionTemplate.ts` now applies shared mojibake repair during PDF HTML generation so regenerated Drive PDFs do not render common scraped encoding artifacts.
- `scripts/questions/evaluateQuestionCorpus.ts` includes deterministic mojibake repair in valid-question mutation plans; dry-runs log patches and execute mode is still required before database text changes.

## 2026-05-07 Provenance Note

- Regenerated scraped admin JSON with Codex answer fill using `--ai-offset=100 --ai-limit=100`, producing 99 ready rows.
- The current expected workflow is convert-only; do not automatically upload converted scraped data.
- Converter now emits clean upload payloads plus provenance artifacts:
  - `admin-json/all.ready.json` for upload payloads without metadata.
  - `admin-json/all.ready.with-meta.json` for local auditing with source metadata included in each row.
  - `reports/ready-provenance.json` as the canonical log mapping each ready row to its source file, CSV row number, section, module, and question text.
- The 99 ready rows from this run all came from `bluebooky_math_test_march_2026.csv`.
