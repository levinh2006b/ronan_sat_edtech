# Bluebook Main

SAT/Bluebook practice platform built with `Next.js 16`, `React 19`, `Supabase Auth`, `Supabase Postgres`, and supporting services such as Gmail SMTP and Google OAuth.

This README is intended to help a new contributor:

- install dependencies correctly
- configure the local environment
- run the app with the minimum required services
- enable optional integrations when needed
- seed sample data for quick testing

## 1. What is in this project

Main features currently present in the repo:

- email/password registration and login
- Google login
- forgot-password flow via email
- `STUDENT` and `ADMIN` roles
- SAT test taking, results, and dashboard flows
- leaderboard / hall of fame

Default entry flow:

- if the user is not logged in, the app redirects to `/auth`
- after login, the app continues through `/auth/redirect`

## 2. Tech stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Supabase Postgres`
- `Supabase Auth`
- `Nodemailer (Gmail SMTP)`
- `Ant Design`

## 3. Prerequisites

Recommended local environment:

- `Node.js 20 LTS` or newer
- `bun`
- local Docker support for the Supabase CLI stack

macOS prerequisites:

```bash
brew install bun
brew install supabase/tap/supabase
```

Windows prerequisites:

1. Install `bun` from `https://bun.sh/docs/installation`.
2. Install Docker Desktop.
3. Install the Supabase CLI from `https://supabase.com/docs/guides/local-development/cli/getting-started` if it is not already available.

Optional services for full functionality:

- a Gmail account with an App Password for email sending
- a Google OAuth app

This repo is now set up around `bun`:

- `bun.lock` is committed
- `package.json` declares `packageManager: bun@1.3.11`
- scripts are intended to be run with `bun run ...`

## 4. Install dependencies

```bash
git clone <repo-url>
cd ronansat-edtech
bun install
```

## 5. Get started

Fastest path to a working local setup:

Get `.env.keys` from a trusted teammate, then run:

```bash
bun install
bun run supabase:start
bun run dev
```

The committed `.env.development` file is encrypted. `bun run dev` now expects the matching local `.env.keys` file, plus an optional `.env.local` for personal overrides.

`bun run dev` no longer requires a local MongoDB process for the app runtime.

## 5. Database model

This repo now uses Supabase for the application runtime in development and production:

- Supabase Postgres for auth, profiles, tests, questions, attempts, review data, settings, vocab, normalized `user_reports`, and hall-of-fame students
- MongoDB only as an optional source for one-time migration scripts and legacy data refresh helpers

Local database behavior:

- `bun run supabase:start` starts the local Supabase stack
- `bun run db -- --fetch` refreshes local Supabase from the linked production Supabase project and can also pull legacy Mongo data when you explicitly need migration-source refreshes
- `bun run supabase:db:reset` resets the local Supabase schema from committed migrations, then restores `supabase/seeds/local-data.sql` if that snapshot exists
- `bun run dev` starts the app directly against Supabase-backed runtime services

Production database behavior:

- production schema changes are applied by `bun run supabase:db:push:production`
- the GitHub production workflow links to the production Supabase project and runs `supabase db push --linked --include-all`
- the production workflow does not run `supabase db reset`
- the production workflow does not apply `supabase/seed.sql` or the local snapshot at `supabase/seeds/local-data.sql`

For day-to-day app work, start Supabase locally with:

```bash
bun run supabase:start
bun run supabase:stop
```

If you need direct Supabase commands during migration work, you can still run:

```bash
bun run supabase:start
bun run supabase:db:reset
bun run supabase:migrate:users
bun run supabase:migrate:tests
bun run supabase:migrate:user-data
bun run supabase:migrate:results
bun run supabase:migrate:legacy-runtime
bun run supabase:migrate:all
```

The MongoDB to Supabase one-time migration scripts now live under `scripts/migrations/mongodb-to-supabase/`.

Current local Supabase ports for this repo:

```txt
API: http://127.0.0.1:55321
DB: postgresql://postgres:postgres@127.0.0.1:55322/postgres
Studio: http://127.0.0.1:55323
Inbucket: http://127.0.0.1:55324
```

If you want to refresh local data from the shared remote sources before startup, run:

```bash
bun run db -- --fetch
bun run dev
```

With `--fetch`, the script now:

- resets local Supabase, pulls `public`, `auth`, and `storage` data from the linked production Supabase project, and restores that data into the local stack
- writes a local-only Supabase snapshot to `supabase/seeds/local-data.sql` so future `supabase db reset` runs can restore the fetched data without linking to production again
- can also copy the remote MongoDB source when you need to run one-time Mongo -> Supabase migration scripts locally

Before the Supabase portion, authenticate your local CLI once:

```bash
supabase login
```

Then set only these local-only values in your shell or `.env.local`:

```env
SUPABASE_DB_PASSWORD=<production database password>
SUPABASE_PROJECT_REF=awzhqoxnyxyciaoejjno
```

## 6. Fastest local setup

If you only want to boot the app and start developing, get the team `.env.keys` file first. Then create a `.env.local` only if you need personal Supabase or migration-source overrides.

Typical `.env.local` override example:

```env
SUPABASE_DB_PASSWORD=<production database password>
SUPABASE_PROJECT_REF=awzhqoxnyxyciaoejjno
```

Then run:

```bash
bun run supabase:start
bun run dev
```

Open:

```txt
http://localhost:3000
```

Important notes:

- `bun run supabase:start` and `bun run supabase:stop` are enough for normal local app work
- `bun run db -- --fetch` is mainly for refreshing local Supabase data, with optional Mongo refresh only when you need a legacy migration source
- after one successful `bun run db -- --fetch`, later local `bun run supabase:db:reset` runs will reuse the gitignored `supabase/seeds/local-data.sql` snapshot until you fetch again
- MongoDB is not required for the normal app runtime anymore
- Supabase local keys are required for auth to work reliably

## 7. Environment variables

The repo now includes a committed `.env.example` for reference and a committed encrypted `.env.development` for shared development values.

This repo uses an encrypted shared development env with `dotenvx`:

- commit `.env.development` as the team-shared encrypted file
- commit `.env.production` when you want a separately encrypted production file
- keep `.env.keys` local and never commit it
- keep `.env.local` for personal overrides on top of the shared development values
- prefer Supabase local env values for runtime work, and keep Mongo env values only when you need one-time migration scripts or explicit legacy fetches

Run the app in development with the encrypted shared env loaded through `dotenvx`:

```bash
bun run supabase:start
bun run dev
```

Refresh the local Supabase snapshot before booting:

```bash
bun run db -- --fetch
bun run dev
```

Production build and start use `.env.production`:

```bash
bun run build
bun run start
```

Production Supabase schema push uses the encrypted production env plus a separate DB password secret:

```bash
bun run supabase:db:push:production
```

That production workflow does not run `supabase db reset` and does not apply local snapshot seed files. It only runs `supabase db push` against the linked production project.

To update the shared encrypted development env:

```bash
./node_modules/.bin/dotenvx decrypt -f .env.development
# edit .env.development
./node_modules/.bin/dotenvx encrypt -f .env.development
```

You can distribute the encrypted `.env.development` through git, and distribute the matching `.env.keys` to trusted developers through a separate secure channel.

`bun run db`, `bun stop db`, `bun run dev`, `bun run build`, and `bun run start` all load env through `dotenvx`. Development commands use `.env.development` plus optional `.env.local` overrides, while production build and start use `.env.production`. The deployed production server runtime decrypts `.env.production` on startup with `DOTENV_PRIVATE_KEY_PRODUCTION`. `bun run db -- --fetch` requires a local `supabase login` plus `SUPABASE_DB_PASSWORD` and optional `SUPABASE_PROJECT_REF` to refresh local Supabase data from production, and can optionally refresh a legacy Mongo source when you need to run one-time migration scripts. A successful fetch also refreshes the gitignored local snapshot at `supabase/seeds/local-data.sql`, and `bun run supabase:db:reset` will replay that snapshot automatically after a normal local reset.

The repo also includes a two-step GitHub Actions pipeline for Supabase schema sync:

- `Database CI` runs only when Supabase migration-related files change
- that CI workflow starts a local Supabase stack, runs `supabase db lint`, and runs `supabase db reset`
- `Database Production` runs only after `Database CI` succeeds on `main`
- the production workflow uses the GitHub `Action Production` environment with `DOTENV_PRIVATE_KEY_PRODUCTION`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_DB_PASSWORD`
- the production push explicitly links to the repo's committed Supabase project ref and runs `bun run supabase:db:push:production`, which applies `--include-all` so the remote schema stays aligned with the committed migration history

Environment variables used by the codebase:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Only for one-time Mongo migration scripts | Legacy MongoDB connection |
| `LOCAL_MONGODB_URI` | Optional | Local MongoDB target used only by legacy data refresh tooling |
| `REMOTE_MONGODB_URI` | Optional | Explicit remote MongoDB source for `bun run db -- --fetch` |
| `SUPABASE_DB_PASSWORD` | For `bun run db -- --fetch` Supabase sync | Production Supabase database password |
| `SUPABASE_PROJECT_REF` | Optional | Overrides the default production Supabase project ref used by `bun run db -- --fetch` |
| `NEXT_PUBLIC_SUPABASE_URL` | For Supabase migration work | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For Supabase migration work | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For Supabase migration scripts/server-only work | Supabase service role key |
| `GOOGLE_CLIENT_ID` | For Google login | Supabase Google provider config |
| `GOOGLE_CLIENT_SECRET` | For Google login | Supabase Google provider config |
| `NEXT_PUBLIC_DESMOS_URL` | For Desmos-related UI | Public frontend URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | For PostHog analytics | Public PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Optional | PostHog ingest host, defaults to `https://us.i.posthog.com` |

Example `.env.local`:

```env
LOCAL_MONGODB_URI=mongodb://127.0.0.1:27017/ronansat-local
REMOTE_MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
SUPABASE_DB_PASSWORD=<production database password>
SUPABASE_PROJECT_REF=awzhqoxnyxyciaoejjno
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<local supabase service role key>

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXT_PUBLIC_DESMOS_URL=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

For production migration, keep the production `SUPABASE_SERVICE_ROLE_KEY` out of git and inject it only in your local shell or secure local env file. The one-time migration runbook lives at `scripts/migrations/mongodb-to-supabase/README.md`.

## 8. Service setup

### 7.1 MongoDB (optional)

MongoDB is no longer part of the normal app runtime.

You only need Mongo connection values if you plan to:

- refresh a legacy local Mongo copy with `bun run db -- --fetch`
- run one-time scripts under `scripts/migrations/mongodb-to-supabase/`

Example:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
```

### 7.4 Google OAuth

Used by the Google login button on `/auth`.

Create OAuth credentials in Google Cloud Console and add:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Typical local callback URL for Supabase OAuth:

```txt
http://localhost:3000/api/auth/callback/google
```

### 7.5 PostHog

Used for client-side product analytics and pageview logging.

Add:

```env
NEXT_PUBLIC_POSTHOG_KEY=<your-posthog-project-api-key>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

Notes:

- Leave `NEXT_PUBLIC_POSTHOG_HOST` as `https://us.i.posthog.com` unless your PostHog project uses a different region or a self-hosted instance.
- Authenticated users are identified from the Supabase-backed app session using their Ronan SAT user id, email, role, and profile metadata.

## 9. Running the project

### Development

```bash
bun run dev
```

### Production build

```bash
bun run build
bun run start
```

Before deploying with encrypted env files, set `DOTENV_PRIVATE_KEY_PRODUCTION` in Vercel so the build and the deployed server runtime can decrypt the committed `.env.production` file.

For local development with encrypted files, keep `DOTENV_PRIVATE_KEY_DEVELOPMENT` in your local `.env.keys` file.

If you are not using the encrypted-file workflow, make sure the Vercel project environment has the same required secrets as your app build, especially:

- `DOTENV_PRIVATE_KEY_PRODUCTION` when the app reads the committed encrypted `.env.production`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Lint

```bash
bun run lint
```

## 10. Suggested verification after setup

After configuring the environment and running `bun run dev`, verify in this order:

1. Open `http://localhost:3000`.
2. Confirm the app redirects to `/auth` when logged out.
3. Create a new account with email/password.
4. Log back in with that account.
5. Verify test/question flows against your current Supabase data.
6. If email is configured, test forgot password.
7. If Google OAuth is configured, test Google login.

## 11. Available scripts

| Command | Meaning |
| --- | --- |
| `bun run dev` | Start the local dev server |
| `bun run build` | Build for production |
| `bun run start` | Start the production build |
| `bun run lint` | Run ESLint |
| `bun run changelog` | Generate/update changelog |

## 12. Notable project structure

| Path | Role |
| --- | --- |
| `app/` | App Router pages and API routes |
| `app/api/` | Route handlers |
| `components/` | UI components |
| `hooks/` | React hooks |
| `lib/` | Shared logic and infrastructure |
| `lib/models/` | Legacy data models kept only if migration tooling still needs them |
| `lib/services/` | Business logic |
| `lib/controllers/` | Controller layer |
| `lib/auth/` | Supabase-backed auth and session helpers |
| `next.config.ts` | Next.js config with image settings |
| `question_bank/` | Question content/source data |

## 13. Common issues

### `Please define the MONGODB_URI environment variable`

Cause:

- you are running a legacy Mongo -> Supabase migration script without a Mongo source configured
- `.env.keys` is missing, so `.env.development` could not be decrypted
- `MONGODB_URI` is missing or invalid

Fix:

- make sure `.env.keys` is present
- create `.env.local` only if you need local overrides
- check the MongoDB connection string only if you are intentionally using legacy migration tooling

### Google login does not work

Check:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- the redirect URI in Google Cloud Console

### Email sending fails

Check:

- your Supabase email provider configuration

## 15. Recommended onboarding order

If you want the fastest path to a working local environment:

1. Run `bun install`.
2. Get `.env.keys` from a trusted teammate.
3. Create `.env.local` only if you need local overrides.
4. Run `bun run dev`.
5. Confirm sign-up and login work.
6. Verify test and question flows against the current migrated dataset.
7. Enable email and Google login only when needed.

## 16. Additional notes

- The local workspace may already contain `node_modules/`, but after a fresh clone you should still run `bun install`.
- `/api/export-pdf` currently returns `410` and points users toward a client-side print flow instead of server-side PDF export.
- The current application roles are `STUDENT` and `ADMIN`.
