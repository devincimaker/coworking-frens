# Coworking Frens

A private webapp for friends to open their homes as cowork spots. No strangers, no
payments — the attendee list is the product. See [`DEPLOY.md`](./DEPLOY.md) to ship it.

## What it does

- **Friends & circles.** Personal invite links create mutual friendships. Organize
  friends into private circles (audience selectors — nobody sees your circles but you).
- **Hosting.** Set up your place (address, arrival notes, amenities, capacity). Open it
  as one-off days or recurring weekly rules that auto-open 3 weeks ahead.
- **Joining.** See upcoming days you're invited to, claim a spot first-come first-served,
  see who else is coming.
- **Email.** Join/leave, day-opened, cancellation, and a day-before reminder.

All times are Argentina-local (MVP assumption — no per-user timezones).

## Stack

Next.js App Router · Prisma · Postgres · NextAuth v5 (email magic link) · Resend · Vercel Blob · Tailwind v4.

## Local development

The app targets Postgres. For local work, point it at a Neon dev branch, or run a local
Postgres:

```bash
cp .env.example .env          # fill DATABASE_URL / DATABASE_URL_UNPOOLED / AUTH_SECRET
npx prisma migrate deploy     # create tables
npm run dev                   # http://localhost:3000
```

Sign-in is a passwordless **email magic link** (via Resend). With no `RESEND_API_KEY`
in local development, the magic link is logged to the server console instead of sent.
Profile photos upload directly to **Vercel Blob**; set `BLOB_READ_WRITE_TOKEN` locally
with `vercel env pull` after creating a Blob store in the Vercel project.
The host address picker uses **Google Maps Places Autocomplete** when
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; without it, local development falls back to
manual address entry.
`GET /api/dev/seed` creates a sample friend group (Ana, Marco, Lea)
with two hosted places to click around. In development, open
`/api/dev/login?email=ana@test.dev&redirectTo=/gente` to sign in as Ana locally.

## Parallel feature work with Git worktrees

Worktrees are optional. Keep using the primary checkout (and port 3000) for small or
sequential changes. When you want a fully isolated feature environment, run:

```bash
npm run wt:new -- feature/my-change
cd ../frens-worktrees/feature-my-change
npm run dev
```

Creation is fast: it copy-on-write clones the existing `node_modules` on macOS,
allocates an app port from 3100-3199, starts one shared local Postgres container,
creates a database just for the branch, and applies migrations. Env secrets are
copied from the primary checkout into ignored files; database URLs and `APP_URL` are
overridden for the isolated environment.

Useful commands:

```bash
npm run wt:list                         # paths, app ports, and database names
npm run db:seed                         # run after this checkout's dev server starts
npm run wt:setup                        # repair/re-run setup inside a linked worktree
npm run wt:remove -- feature/my-change  # drop its DB and remove the checkout
```

Cleanup refuses a dirty worktree or one with a running dev server. It deletes the
local branch only when that branch is already merged into `main`. The shared
Postgres data volume remains available so creating the next worktree stays quick.
Uncommitted changes in the checkout where you create a worktree stay there; Git
worktrees branch from committed `HEAD` unless you provide another base ref.

A normal feature lifecycle is: work and test in the linked checkout, commit and
push that branch, open/review/merge its PR, then run `wt:remove` from the primary
checkout. Direct work on `main` remains available whenever isolation is unnecessary.

## Key paths

| Path                     | What                                             |
| ------------------------ | ------------------------------------------------ |
| `src/auth.ts`            | NextAuth config (email magic link)               |
| `src/lib/actions.ts`     | All server actions (join, host, circles, invite) |
| `src/lib/days.ts`        | Day creation + audience snapshot + materializer  |
| `src/lib/queries.ts`     | Feed / day / host / circle reads                 |
| `src/app/api/cron`       | Daily materialize + reminder job                 |
| `prisma/schema.prisma`   | Data model                                       |
