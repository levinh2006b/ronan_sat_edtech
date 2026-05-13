# Question Corpus Evaluation

## Status

- Implemented: direct PostgreSQL question-corpus evaluator script with Opencode Go DeepSeek split-model orchestration.

## Decisions

- The evaluator pipeline lives in `scripts/questions/evaluateQuestionCorpus.ts` and is an operational script, not runtime UI.
- Model execution uses `opencode run -m <model> --pure --format json` so credentials stay in Opencode or process env and are not stored in repo files.
- Solver calls default to `opencode-go/deepseek-v4-flash`; evaluator calls default to `opencode-go/deepseek-v4-pro`. Use `--solver-model` and `--evaluator-model` for separate overrides, or legacy `--model` to set both when split flags are absent.
- Opencode calls default to `--agent summary` because the default `build` agent can call shell/write tools and produce non-JSON tool results. Use `--opencode-agent` only for intentional override.
- Windows timeout root cause from the May 11 dry-run was local process behavior, not Supabase or DeepSeek availability: payload files in `%TEMP%` triggered Opencode external-directory rejection, and spawned Opencode processes hung until timeout when stdin stayed open. The script now writes payloads under repo-local `.question-eval-tmp` and closes child stdin immediately.
- The script defaults to dry-run. Database mutation requires `--execute`; each affected row is backed up to JSONL before transaction commit.
- Direct database access uses `pg` pooling. Connection config prefers `DATABASE_URL`/`POSTGRES_URL`; otherwise it builds the Supabase host from `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD`.
- On this machine, `db.afmeruhjbgqeebczpxzf.supabase.co` resolves IPv6-only and direct TCP 5432 timed out. Use `--use-supabase-pooler`, Supabase pooler `DATABASE_URL`/`POSTGRES_URL`, or an IPv6-capable network for end-to-end runs.
- The evaluator now batches LLM work: each LLM batch gets three independent solver calls plus one evaluator call, instead of four calls per question.
- Math payloads reuse the UI renderer path (`normalizeMathDelimiters`, `tokenizeHtmlLatexContent`, `renderKatexMarkup`). The script sends source text and renderer text to the model, but does not write LaTeX/content normalization to the database by default.
- Valid-question mutation plans include deterministic text cleanup for common scraped mojibake and safe double-dollar math conversion. Dry-run logs these patches; `--execute` is still required before mutating database text.
- Non-mutating quality findings such as duplicate answer-option text, solver answer disagreement, low evaluator confidence, and rejected replacement candidate gates are logged to `quality-issues.jsonl` for later manual review.
- Visual assets are classified before LLM evaluation. Parsed tables are sent as Markdown; existing SVG/image assets downgrade unsolved visual questions to `needs_visual_review`, not `defective`.
- Visual missing detection is intentionally narrow. It flags prompts that reference a shown/provided/according-to graph/table/figure or similar visual source, but does not flag self-contained graph descriptions that give the needed slope, point, transformation, or equation data in text.
- As of May 12, `image_url` is not treated as a renderable student visual because the project does not render it in the current question UI/PDF path. Required-visual prompts with only `image_url` are deterministic `defective` dry-run replacement candidates.
- Fast visual gate: `missing_visual` and `bad_extra` rows skip solver/evaluator calls and become deterministic replacement candidates; `svg_visual` and `image_visual` rows skip LLM and are logged to `needs-visual-review.jsonl`.
- Placeholder multiple-choice answers such as `Option B` or `Choice C` are deterministic defects and skip LLM evaluation. They are also rejected as replacement candidates.
- Fast replacement candidates are not LLM-evaluated. They must pass deterministic gates: same shape/taxonomy/difficulty/type, different test period, answer key exists, visual state is only `none` or `text_table`, no math warnings, no duplicate multiple-choice option text, and no placeholder option text.
- Solver payloads exclude official answers and explanations so missing-table/missing-graph questions cannot be solved by model memorization. The evaluator still receives official answer/explanation for comparison after solver outputs.
- Operational staging flags: `--max-new` limits the number of unprocessed IDs, `--skip-completed-from` skips IDs from prior run folders or `evaluated.jsonl` files, `--known-issues-json` merges known manual corrections, and `--shutdown-on-complete` schedules Windows shutdown after logs flush.
- Gatecheap Pro evaluator can return Cloudflare 524 even for small batches. Use `--evaluator-fallback-model=deepseek-v4-flash` to keep overnight dry-runs moving; fallback use is logged to `evaluator-fallback.jsonl`.
- May 12 pipeline optimization: Flash solver calls use a separate configurable concurrency lane (`--solver-concurrency`, default at least three), so the three independent solver calls can run together even when evaluator concurrency is `--llm-concurrency=1`. Successful Flash solver results are cached per question and reused after Pro evaluator retry/split failures; cache events are logged to `solver-cache.jsonl`.
- Pro evaluator calls now have localized retry via `--evaluator-max-attempts` (default `2`) for transient 5xx/timeouts/no-content responses before batch splitting or fallback evaluation runs.
- Flash solver calls now default to `--max-attempts=2` because Gatecheap returned transient `502` and `fetch failed` errors during the first 500-question attempt.
- Gatecheap later returned repeated Flash `524` errors under three-way solver concurrency. For long runs on this provider, reduce `--solver-concurrency` to `1` or `2`, use `--max-attempts=3`, and prefer quick evaluator fallback when Pro starts timing out.
- KaTeX/math warnings downgrade automated decisions to `needs_math_review`, not replacement.

## Operational Notes

- Default command: `bun run questions:evaluate-corpus -- --sample=20 --llm-batch-size=5`.
- Production command: `bun run questions:evaluate-corpus:production -- --use-supabase-pooler --sample=20 --workers=2 --llm-concurrency=2 --llm-batch-size=5 --llm-timeout-ms=600000 --solver-model=opencode-go/deepseek-v4-flash --evaluator-model=opencode-go/deepseek-v4-pro` for dry-run, then add `--execute` only after reviewing logs.
- The script scans all `public.questions` rows by default; use `--public-only=true` only when intentionally limiting to public-visible tests.
- Outputs are written outside the repo by default under `~/Desktop/question-corpus-evaluation-*`.
- Checkpoints include `evaluated.jsonl`, `failed.jsonl`, `patches.jsonl`, `backup.jsonl`, `asset-classification.jsonl`, `quality-issues.jsonl`, `needs-visual-review.jsonl`, `needs-math-review.jsonl`, `llm-start.jsonl`, `llm-finish.jsonl`, `batch-results.jsonl`, `batch-splits.jsonl`, and `replacement-updates.sql.jsonl`.
- Retry/cache diagnostics include `evaluator-retry.jsonl`, `evaluator-fallback.jsonl`, and `solver-cache.jsonl`.
- Use `--resume --output-dir=<existing-run-dir>` to skip completed IDs, or `--retry-failed=<failed.jsonl>` to retry failures.

## May 11, 2026 Run Notes

- The 60-question dry-run under `C:\Users\MHC\Desktop\Log_Check_Cau_Hoi_200_fixed_mojibake` had `answerMismatch: 0`. The SPR patch for `7887ba94-18fb-4d55-937a-6a528c6b1f9e` is a valid accepted-answer expansion, not a wrong-answer finding.
- The continuation attempt for 140 more IDs was stopped after the first normal text batch timed out. The timed-out LLM call was a small 28 KB payload with 4 nonvisual questions, so the timeout was not caused by missing/broken visual data.
- Direct one-line Opencode health checks for both `opencode-go/deepseek-v4-flash` and `opencode-go/deepseek-v4-pro` produced no stdout/stderr and timed out. Current blocker is Opencode/provider response availability or runtime hang, not PostgreSQL connectivity or question payload shape.
- Added `--llm-provider=openai` for OpenAI-compatible gateways such as Gatecheap. Configure with `--openai-base-url=<base-url>` and `--openai-api-key-env=<env-var-name>`, then use provider-specific model names through `--solver-model` and `--evaluator-model`.
- Fixed PDF render normalization for scraped exponential choices where negative exponents were stored as baseline minus text, such as `y=34(1.04)−x`. `utils/questionTemplate.ts` now repairs this to exponent form at render time and wraps bare exponential equations for KaTeX. Verified the affected 60-run question `f572c0c5-7638-4ab1-978b-ba9659fc8a45` renders without `katex-error` or raw equation strings in `render-check-60/f572-fixed-render.html`.
- Gatecheap continuation on May 11 completed 57 of the 140 continuation IDs before the gateway returned HTTP 402 `payment_required` ("out of daily/package credit and no top-up credit"). The run was stopped to avoid noisy retries. Remaining unevaluated IDs were written to `C:\Users\MHC\Desktop\Log_Check_Cau_Hoi_200_fixed_mojibake\continuation-remaining-after-gatecheap-credit.txt`.
- The completed 200-question dry-run exposed a real render/content issue in the sample PDF HTML: a graph question had placeholder options `Option B`, `Option C`, and `Option D`. The evaluator now catches this deterministically. The same review also exposed overbroad visual detection that marked self-contained graph questions as `missing_visual`; the visual detector was tightened to avoid those false defects.
- After manual review, required-visual keywords were expanded for tables, scatterplots, histograms, line/bar/box/dot plots, graph-model prompts, right-triangle/figure prompts, and verbal data-from-table/graph prompts. Known confirmed issues are built in for `3ee20bdd-f073-4183-835e-6f2364b46941`, `25bcf9c4-68f8-456d-8324-44d53c1a9155`, and `f8d09cdc-6136-4a73-b67c-993cd9147c36`.
