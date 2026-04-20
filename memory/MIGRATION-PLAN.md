# Supabase Migration Plan

## Goal

Migrate the application from `NextAuth + MongoDB` to `Supabase Auth + Postgres + RLS`, while temporarily retaining MongoDB only as a legacy migration source.

## Product decisions

- Public exams are readable only by authenticated users.
- Teachers fully manage their own groups and memberships.
- Tests and questions migrate to Postgres.
- Multiple-choice questions store correct answers by foreign key to an option row, not by verbatim text.
- SPR questions use a separate accepted-answers table.
- The schema should minimize redundancy and rely on foreign keys and derived queries where practical.

## Working rules

- Update this file before and after each major migration phase.
- Keep execution order explicit so multiple agents can safely coordinate through the same plan.
- Prefer normalized SQL joins over duplicated columns or array fields.
- Enable RLS before cutting app reads and writes over to a table.
- Treat MongoDB as legacy-only for one-time migration and fetch workflows.

## Execution ledger

1. Done: initialize local Supabase tooling and repo workflow in `supabase/` on repo-specific local ports to avoid collisions with other local Supabase projects.
2. Done: add the first normalized SQL migration set for profiles, RBAC, groups, exams, questions, attempts, settings, review reasons, and vocab.
3. Done: add initial RLS helper functions and policies so authenticated users can read public exams, teachers can manage their own groups, and users can only access their own personal data.
4. Done: add local seed/reset workflow for core roles and permissions through the migration plus `supabase/seed.sql` and repo scripts.
5. In progress: wire the app to Supabase environment variables and client/server helpers without removing Mongo fix workflows yet.
6. In progress: replace NextAuth with Supabase Auth and cut profile gating over. Local auth users and profiles are now migrated, but app runtime still reads NextAuth.
7. In progress: migrate tests and questions from MongoDB into Postgres, preserving `legacy_mongo_id`.
8. In progress: migrate results into normalized attempts and answers tables, then rebuild review and error-log reads against SQL.
9. In progress: migrate user-owned settings, synced testing-room theme, review reasons, vocab storage, and streaks.
10. Done: replace Mongo fix-board storage with normalized `user_reports` rows in Supabase.
11. Pending: run local verification for student, teacher, and admin flows with RLS enabled.
12. Done: add a GitHub Actions migration pipeline so PRs validate `supabase/migrations/**` on a fresh local reset and pushes to `main` auto-push linked migrations to the production Supabase project.

## Schema checklist

### Identity and RBAC

- `profiles`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

### Group ownership

- `teacher_groups`
- `group_memberships`

### Exams and questions

- `tests`
- `test_sections`
- `questions`
- `question_options`
- `question_correct_options`
- `question_spr_accepted_answers`

### Attempts and review

- `test_attempts`
- `attempt_answers`
- `attempt_answer_reasons`
- `user_review_reasons`

### User-owned settings and vocab

- `user_settings`
- `user_streaks`
- `vocab_columns`
- `vocab_cards`
- `vocab_card_positions`

## Key constraints

- `profiles.id` should match `auth.users.id`.
- Do not duplicate passwords, reset tokens, or session state in app tables.
- Do not duplicate exam title, section, or ownership data onto child rows when it can be joined.
- `question_correct_options` must guarantee that the chosen option belongs to the same question.
- `question_spr_accepted_answers` should normalize accepted answers consistently with grading logic.
- `test_attempts` should be the canonical history source instead of keeping denormalized user aggregates such as `testsTaken`, `highestScore`, or `wrongQuestions`.
- Mongo-bridged entities must preserve `legacy_mongo_id` for fix workflow compatibility.

## Local-first rollout

### Phase 1: Local Supabase setup

- Initialize `supabase/` in the repo.
- Start local services with Docker.
- Record local env and seed workflow.

### Phase 2: Schema and RLS

- Add SQL migrations in dependency order.
- Enable RLS on every user-scoped or permission-sensitive table.
- Seed roles and permissions.

### Phase 3: Auth cutover

- Add Supabase client/server helpers.
- Replace NextAuth guards and session reads.
- Reimplement onboarding/profile gate on top of `profiles`.

### Phase 4: Data cutover

- Migrate tests/questions.
- Migrate attempts/results.
- Migrate review reasons, settings, vocab, and streaks.

### Phase 5: Final normalization and verification

- Keep Mongo limited to migration-source tooling only.
- Resolve referenced tests/questions through SQL foreign keys.
- Verify student, teacher, and admin flows locally under RLS.

## Open risks

- Existing Mongo `correctAnswer` values may not always map cleanly to a single imported option row.
- Legacy migration workflows become brittle if `legacy_mongo_id` is not preserved consistently.
- RLS policies must be verified through real authenticated sessions, not only service-role queries.
- The auth cutover touches middleware, route handlers, server components, and client session consumers at once, so partial cutovers can leave mixed assumptions behind.

## Current status

- Shared migration planning is now tracked in this file and mirrored from `memory/PLAN.md`.
- Local Supabase is initialized and running on repo-local ports: API `55321`, DB `55322`, Studio `55323`, Inbucket `55324`.
- The initial schema migration has been applied successfully through `supabase db reset`.
- Shared Supabase app scaffolding now exists in `lib/supabase/` plus package scripts for start, stop, reset, and test/question migration.
- A compatibility auth layer now exists under `lib/auth/`, and the app now imports those Supabase-backed session helpers directly instead of depending on the removed NextAuth package.
- The old NextAuth catch-all route now returns `410`, and `lib/authOptions.ts` has been removed so stale imports no longer pull dead auth code into runtime.
- Repo cleanup status: there are now no remaining `next-auth` or `authOptions` imports in application code, the `next-auth` package has been removed from dependencies, and the old auth env/docs references have been scrubbed from active configuration files.
- Mongo -> Supabase migration scripts now exist for users, tests/questions, user-owned vocab/review reasons, and results.
- The Mongo -> Supabase one-time migration scripts are now grouped under `scripts/migrations/mongodb-to-supabase/`, with a `supabase:migrate:all` wrapper and a local-only production runbook that keeps service-role credentials out of git.
- Local import status after the latest run:
  - Mongo source: `41` users, `38` tests, `3698` questions, `86` results
  - Supabase target: `41` profiles, `41` user roles, `38` tests, `3454` questions, `32` attempts, `1325` attempt answers, `123` review reasons, `34` vocab cards, `9` vocab columns
  - Supabase auth users were created locally from Mongo users with deterministic temporary passwords so local end-to-end auth testing can proceed before a production-grade reset/invite policy is finalized.
  - `30` malformed legacy questions were skipped rather than half-imported because they lacked usable options, accepted answers, or correct-answer mappings.
  - `54` results and `638` result answers were skipped because they referenced relations that do not currently map cleanly after the question import, so those need a dedicated cleanup pass before production migration.
- The main runtime auth/data cutover is now implemented, including Supabase-backed auth flows, profile/settings routes, tests/questions services, results/review services, vocab board, review reasons, and normalized reported-question storage in `user_reports`.
- The leaderboard runtime path now reads from Supabase `test_attempts` instead of the removed Mongo `Result` model.
- Dead Mongo-era models and scripts for migrated test/question/result/user domains have been removed, leaving Mongo only for migration tooling.
- GitHub Actions now validates changed Supabase migrations on pull requests with `supabase db reset`, and pushes merged migration changes on `main` to the linked production database through the GitHub `production` environment.
- The next highest-priority step is a production-readiness pass: remove dead Mongo code for migrated domains, validate end-to-end browser flows, and resolve skipped legacy data before any cloud or production cutover.

## Runtime cutover notes

- Auth entry flows now point at Supabase:
  - `app/auth/page.tsx` signs in with Supabase credentials/OAuth and signs up with Supabase Auth.
  - `app/auth/forgot-password/page.tsx` now sends Supabase password reset emails.
  - `app/auth/reset-password/page.tsx` now completes password reset through Supabase recovery sessions.
- The profile gate and settings APIs now read from Supabase `profiles` and `user_settings` instead of Mongo `User`.
- `hooks/useTestingRoomTheme.ts` now syncs the testing-room theme through `/api/user/settings` for authenticated users while still caching locally for immediate reads.
- Tests, questions, question explanations, and the main test/question services now read and write through Supabase/Postgres.
- User stats, review reason catalog, vocab board, and password changes now use Supabase-backed routes.
- Result creation, result history reads, review error-log reads, and answer-reason updates now route through the new Postgres-backed `resultService`.
- Reported questions now persist as normalized `user_reports` rows in Supabase, and the test-manager groups them by `question_id` at read time.

## Remaining work

- Run a full browser validation pass across:
  - sign in
  - sign up
  - Google OAuth
  - welcome onboarding
  - dashboard
  - full-length library
  - sectional library
  - live test flow
  - result submission
  - review and error-log screens
  - vocab board
  - settings and password change
  - admin access and admin creation flows
- Remove dead Mongo code for migrated domains where it is no longer used:
  - old user auth/profile logic
  - unused Mongoose models and services for migrated areas
  - stale helper code that only existed for NextAuth/Mongo session hydration
- Audit the remaining Mongo references and keep them limited to one-time migration and optional fetch tooling only.
- Resolve the skipped legacy migration rows before production migration:
  - malformed questions with missing options or answer keys
  - results referencing unmapped questions/tests
- Re-run local migration from a clean reset after any migration-script fixes and compare counts again.
- Decide production auth migration policy for existing users:
  - forced password reset
  - invite flow
  - admin-created credentials
  - or controlled one-time migration with communication plan

## Important caveats for next chat

- The codebase no longer depends on `next-auth`, but some internal helper names and migration notes still refer to “compatibility” because the cutover was staged.
- `app/api/auth/*` routes now intentionally return `410` because Supabase auth is used directly from the app.
- `app/api/pdf-data/route.ts` and other test/question consumers now read from Postgres and emit legacy-shaped payloads for UI compatibility.
- The local Supabase migration scripts are good enough to populate a working local environment, but they are not yet production-hardened against malformed data.
- The result/review service is now SQL-backed, but it should be exercised carefully in-browser because it was one of the densest service rewrites.
