# Test Manager And Hall Of Fame Supabase Cutover

## Status

- Done: reported-question runtime storage now lives in normalized Supabase `public.user_reports` rows keyed to `questions.id`.
- Done: hall-of-fame student cards moved from Mongo `students` to Supabase `public.hall_of_fame_students`.
- Done: the app runtime no longer imports `lib/mongodb.ts` or the old Mongoose models.

## What Changed

- Added Supabase migrations for `hall_of_fame_students`, then normalized reported-question storage further into `public.user_reports`.
- Replaced the old board persistence flow with SQL-backed grouping queries across:
  - `/api/test-manager-reports`
  - `lib/services/testManagerReportService.ts`
  - `lib/services/testManagerQuestionService.ts`
- Changed report submissions to insert one normalized row per user/question report with reason, source, and additional context.
- Added manager-only resolve/delete actions on reported questions, backed by `user_reports.resolved_at` and `user_reports.resolved_by_user_id` plus manager-only update/delete policies.
- Simplified `scripts/dev.ts` so local app runtime no longer requires a local MongoDB process.
- Added `scripts/migrations/mongodb-to-supabase/migrateLegacyBoardAndStudentsToSupabase.ts` for one-time import of legacy Mongo reports and hall-of-fame data.

## Verification

- `bunx tsc --noEmit --pretty false`
- `bun run lint` passed with existing repo warnings only.
- `bun run supabase:db:reset`
- `bun run supabase:migrate:legacy-runtime`

## Follow-Up

- README and local data-sync tooling still mention Mongo as a normal runtime dependency in several places and should be simplified further.
- Mongo remains useful only as an optional source for one-time migration and local refresh workflows.
