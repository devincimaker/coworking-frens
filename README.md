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

## Key paths

| Path                     | What                                             |
| ------------------------ | ------------------------------------------------ |
| `src/auth.ts`            | NextAuth config (email magic link)               |
| `src/lib/actions.ts`     | All server actions (join, host, circles, invite) |
| `src/lib/days.ts`        | Day creation + audience snapshot + materializer  |
| `src/lib/queries.ts`     | Feed / day / host / circle reads                 |
| `src/app/api/cron`       | Daily materialize + reminder job                 |
| `prisma/schema.prisma`   | Data model                                       |
