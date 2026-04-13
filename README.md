# Bluebook Main

SAT/Bluebook practice platform built with `Next.js 16`, `React 19`, `MongoDB`, `NextAuth`, `Redis`, `Gemini`, and supporting services such as Gmail SMTP, Google OAuth, and Cloudinary.

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
- `STUDENT`, `PARENT`, and `ADMIN` roles
- SAT test taking, results, and dashboard flows
- AI chat for question explanations through Gemini
- parent verification via email
- leaderboard / hall of fame
- Redis-backed caching

Default entry flow:

- if the user is not logged in, the app redirects to `/auth`
- after login, the app continues through `/auth/redirect`

## 2. Tech stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `MongoDB + Mongoose`
- `NextAuth`
- `Redis`
- `Google Gemini API`
- `Nodemailer (Gmail SMTP)`
- `Cloudinary`
- `Ant Design`
- `Sentry`

## 3. Prerequisites

Recommended local environment:

- `Node.js 20 LTS` or newer
- `bun`
- a MongoDB instance
- a Redis instance

Optional services for full functionality:

- a Gmail account with an App Password for email sending
- a Google OAuth app
- a Gemini API key
- a Cloudinary account

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

```bash
bun install
cp .env.example .env.local
bun run dev
```

The current workspace already has a populated `.env.local`, so on this machine `bun run dev` is ready to use.

## 6. Fastest local setup

If you only want to boot the app and start developing, create a `.env.local` file with at least:

```env
MONGODB_URI=<mongodb connection string>
NEXTAUTH_SECRET=<long random secret>
REDIS_URL=redis://127.0.0.1:6379
```

Then run:

```bash
bun run dev
```

Open:

```txt
http://localhost:3000
```

Important notes:

- MongoDB is required; the app reads `lib/mongodb.ts` during startup
- `NEXTAUTH_SECRET` is required for auth to work reliably
- Redis should be available because several services read and write cache directly

## 7. Environment variables

The repo now includes a committed `.env.example`. Copy it to `.env.local` or `.env` for local development, then fill in the real values.

Environment variables used by the codebase:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection |
| `NEXTAUTH_SECRET` | Yes | NextAuth session/token secret |
| `REDIS_URL` | Strongly recommended | Cache for tests, questions, users, leaderboard |
| `GEMINI_API_KEY` | For AI chat | `/api/chat` |
| `EMAIL_USER` | For email features | Forgot password, parent verification |
| `EMAIL_PASS` | For email features | Gmail App Password for SMTP |
| `EMAIL_FROM_NAME` | Optional | Sender name for emails |
| `GOOGLE_CLIENT_ID` | For Google login | NextAuth Google provider |
| `GOOGLE_CLIENT_SECRET` | For Google login | NextAuth Google provider |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | For Cloudinary image flows | Client-side Cloudinary config |
| `NEXT_PUBLIC_DESMOS_URL` | For Desmos-related UI | Public frontend URL |

Example `.env.local`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/bluebook-main
NEXTAUTH_SECRET=replace-with-a-long-random-secret
REDIS_URL=redis://127.0.0.1:6379

GEMINI_API_KEY=

EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM_NAME=Bluebook Support

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_DESMOS_URL=
```

## 8. Service setup

### 7.1 MongoDB

You can use either:

- local MongoDB
- MongoDB Atlas

Local example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/bluebook-main
```

Atlas example:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
```

### 7.2 NEXTAUTH_SECRET

Use a long random string.

Example:

```env
NEXTAUTH_SECRET=this-should-be-a-long-random-secret-value
```

### 7.3 Redis

Redis is used directly by multiple services, including leaderboard, question, test, and user flows.

Local example:

```env
REDIS_URL=redis://127.0.0.1:6379
```

If you do not already have Redis, you can:

- run it with Docker
- install it locally
- point to a managed Redis instance

Docker example:

```bash
docker run -d --name bluebook-redis -p 6379:6379 redis
```

### 7.4 Gmail SMTP

Used for:

- forgot-password emails
- parent verification emails

Setup steps:

1. Sign in to Gmail.
2. Enable 2-Step Verification.
3. Create an App Password.
4. Put that App Password into `EMAIL_PASS`.

Example:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM_NAME=Bluebook Support
```

If you see an error like `WebLoginRequired`, open Gmail in a browser, complete any pending security verification, and create a new App Password.

### 7.5 Google OAuth

Used by the Google login button on `/auth`.

Create OAuth credentials in Google Cloud Console and add:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Typical local callback URL for NextAuth:

```txt
http://localhost:3000/api/auth/callback/google
```

### 7.6 Gemini API

Used for the question explanation chat feature.

```env
GEMINI_API_KEY=
```

If this variable is empty, the chat route will return `Gemini API key not configured`.

### 7.7 Cloudinary

If your current work depends on Cloudinary upload/display flows, configure:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

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

### Lint

```bash
bun run lint
```

## 10. Seeding sample data

The repo includes a seed script:

```bash
bun run seed
```

This script:

- reads `MONGODB_URI`
- creates a sample test
- inserts sample questions into MongoDB

The repo also contains:

- `parse_and_seed.ts`
- `reading_sample.txt`
- `math_sample.txt`

That script is meant for importing a larger sample set, but it does not have its own `package.json` script. Run it manually if needed:

```bash
bunx tsx parse_and_seed.ts
```

Warning:

- `parse_and_seed.ts` deletes old data in the `Test` and `Question` collections
- only run it if you are okay resetting test/question data

## 11. Suggested verification after setup

After configuring the environment and running `bun run dev`, verify in this order:

1. Open `http://localhost:3000`.
2. Confirm the app redirects to `/auth` when logged out.
3. Create a new account with email/password.
4. Log back in with that account.
5. If you seeded data, verify test/question flows.
6. If email is configured, test forgot password.
7. If Gemini is configured, test the AI chat in review flow.
8. If Google OAuth is configured, test Google login.

## 12. Available scripts

| Command | Meaning |
| --- | --- |
| `bun run dev` | Start the local dev server |
| `bun run build` | Build for production |
| `bun run start` | Start the production build |
| `bun run lint` | Run ESLint |
| `bun run seed` | Seed sample MongoDB data |
| `bun run changelog` | Generate/update changelog |

## 13. Notable project structure

| Path | Role |
| --- | --- |
| `app/` | App Router pages and API routes |
| `app/api/` | Route handlers |
| `components/` | UI components |
| `hooks/` | React hooks |
| `lib/` | Shared logic and infrastructure |
| `lib/models/` | Mongoose models |
| `lib/services/` | Business logic |
| `lib/controllers/` | Controller layer |
| `lib/authOptions.ts` | NextAuth configuration |
| `lib/mongodb.ts` | MongoDB connection |
| `lib/email.ts` | Gmail SMTP email sending |
| `next.config.ts` | Next.js config with Sentry and image settings |
| `seed.ts` | Basic sample data seed |
| `parse_and_seed.ts` | Larger sample import script |
| `question_bank/` | Question content/source data |

## 14. Common issues

### `Please define the MONGODB_URI environment variable inside .env.local`

Cause:

- `.env.local` is missing
- `MONGODB_URI` is missing or invalid

Fix:

- create `.env.local`
- check the MongoDB connection string

### Google login does not work

Check:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- the redirect URI in Google Cloud Console

### Email sending fails

Check:

- `EMAIL_USER`
- `EMAIL_PASS`
- Gmail App Password setup
- whether the Gmail account has passed Google security verification

### AI chat reports configuration errors

Check:

- `GEMINI_API_KEY`

### Redis connection errors on some routes

Check:

- whether Redis is running
- whether `REDIS_URL` is correct

## 15. Recommended onboarding order

If you want the fastest path to a working local environment:

1. Run `bun install`.
2. Create `.env.local`.
3. Fill in `MONGODB_URI`, `NEXTAUTH_SECRET`, and `REDIS_URL`.
4. Run `bun run dev`.
5. Run `bun run seed`.
6. Confirm sign-up and login work.
7. Enable email, Google login, Gemini, and Cloudinary only when needed.

## 16. Additional notes

- The local workspace may already contain `node_modules/`, but after a fresh clone you should still run `bun install`.
- `/api/export-pdf` currently returns `410` and points users toward a client-side print flow instead of server-side PDF export.
- The current application roles are `STUDENT`, `PARENT`, and `ADMIN`.
