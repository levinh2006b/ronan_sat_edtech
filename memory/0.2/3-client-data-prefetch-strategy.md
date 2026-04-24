# Client Data Prefetch Strategy

Status: Implemented

## Scope

- Add safe client-side data prefetching for student dashboard, full-length test library, sectional test library, and review result summaries.
- Do not data-prefetch the test engine (`/test/*`) or admin surfaces.
- Keep prefetch cache keys aligned with the default controller state:
  - Full-length tests: page `1`, limit `15`, sort `newest`, period `All`, subject `all`.
  - Sectional tests: page `1`, limit `15`, sort `newest`, period `All`, subject `reading`.
  - Review: summary results only via `review:results`.

## Decisions

- All route data prefetches should go through `readThroughClientCache` so inflight work deduplicates with later page loads.
- Intent prefetch should be one-shot per browser session and gated by a short hover delay; touch starts trigger immediately enough to help mobile route changes.
- After test submission, clear dashboard/review caches, warm fresh summaries with `forceRefresh`, call `router.refresh()`, then navigate to review.

## Implementation Notes

- `useIntentPrefetch` owns hover intent, touch start, abort, and one-shot session flags.
- `/admin`, `/test/*`, admin-role users, and `/review?view=error-log` are excluded from data prefetch.
- Sectional route prefetch intentionally warms only the default reading tab, not the math tab.
- `clientCache` now evicts expired/oldest entries on quota errors and wraps read-through loads in a timeout so failed prefetches cannot pin `inflightCache`.
