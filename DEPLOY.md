# Deploying Coworking Frens (Vercel + Neon Postgres)

The app is Next.js (App Router) + Prisma + Postgres. Local dev ran on SQLite during
prototyping; production uses Postgres. This guide takes you from zero to a live URL.

You'll do the interactive steps (they need a browser login); everything in the
repo is already wired for them.

---

## 1. Push/import the app

1. Push this repo to GitHub (see "Push to GitHub" below).
2. <https://vercel.com/new> -> import the repo. Framework auto-detects as Next.js.

## 2. Add Neon through Vercel

Use the official Neon integration instead of manually pasting connection strings:

1. Vercel -> Marketplace -> Neon -> Install.
2. Choose one mode:
   - **Create New Neon Account** if you want Vercel-managed billing.
   - **Link Existing Neon Account** if you already created a Neon project.
3. Connect the Neon database to this Vercel project for **Production**.
4. Leave Preview Branching off for the first deploy unless you specifically want per-PR
   database branches now.

The integration injects the database variables this app expects:

| Variable                 | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `DATABASE_URL`           | Neon pooled connection for runtime           |
| `DATABASE_URL_UNPOOLED`  | Neon direct connection for Prisma migrations |

Do not add `DIRECT_URL`; Prisma is configured to use `DATABASE_URL_UNPOOLED`.

## 3. Set up Resend (login emails)

Sign-in is passwordless: users enter their email and get a one-time **magic link** to
click. Those links are sent with Resend, so Resend is **required in production** — it's
the same account that sends the reminder/notification emails. (The passwordless "dev
login" is disabled in production.)

1. <https://resend.com> → sign up, create an **API key** → `RESEND_API_KEY`.
2. To email anyone other than yourself, **verify a domain** (Resend → Domains) and set
   `EMAIL_FROM` to an address on it, e.g. `Coworking Frens <hola@tudominio.com>`.
   The `onboarding@resend.dev` sandbox sender only delivers to your own verified address —
   fine for a first test, not for inviting friends.

## 4. Add Vercel Blob (image uploads)

Profile photos upload directly from the browser to Vercel Blob, then the app stores
the returned public URL in Postgres. This same storage path is ready for hosted-place
photos later.

1. Vercel -> Project -> Storage -> Create Database -> Blob.
2. Name it `Images`, choose Public access, and connect it to Production.
3. Make sure Vercel adds `BLOB_READ_WRITE_TOKEN` to the project environment.
4. For local development, run `vercel env pull` after the Blob store is connected.

## 5. Add the remaining environment variables

Set these in Vercel -> Project -> Settings -> Environment Variables:

| Variable                          | Value                                                             |
| --------------------------------- | ----------------------------------------------------------------- |
| `AUTH_SECRET`                     | run `openssl rand -base64 32`                                     |
| `AUTH_TRUST_HOST`                 | `true`                                                            |
| `APP_URL`                         | your final URL, e.g. `https://coworking-frens.vercel.app`         |
| `CRON_SECRET`                     | run `openssl rand -hex 16` (Vercel Cron sends it automatically)   |
| `RESEND_API_KEY`                  | from <https://resend.com> - required for magic-link login/emails  |
| `EMAIL_FROM`                      | an address on a domain you verified in Resend                     |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | browser key with Maps JavaScript API and Places API (new) enabled |
| `BLOB_READ_WRITE_TOKEN`           | added by the connected Vercel Blob store; required for uploads    |

Verify that the Neon integration also added `DATABASE_URL` and
`DATABASE_URL_UNPOOLED` for Production.

## 6. Deploy

Trigger a Vercel deploy from the dashboard or push to the connected Git branch. The build
runs `prisma generate && prisma migrate deploy && next build`, so the schema is created
on Neon automatically on the first deploy.

## 7. The daily job (reminders + auto-open)

`vercel.json` already declares a cron hitting `/api/cron` at **23:00 UTC (20:00 in
Argentina)** every day. It materializes recurring days 3 weeks out and sends the
day-before reminder emails. Vercel authenticates it automatically using `CRON_SECRET`
— no extra setup. (Cron is enabled on Hobby and Pro plans.)

## 8. First run

1. Visit your URL, enter your email, and click the magic link it sends you.
2. Open **Friends**, copy your invite link, send it to a friend — accepting it makes
   you mutual friends.
3. Open **Host**, create your place, add a recurring rule or a one-off day.

There is no seeding in production (the `/api/dev/seed` route returns 404 unless
`NODE_ENV=development`).

---

## Push to GitHub

```bash
gh repo create coworking-frens --private --source=. --push
# or, with an existing empty repo:
git remote add origin git@github.com:YOU/coworking-frens.git
git push -u origin main
```

## Troubleshooting

- **`prepared statement "s0" already exists`** (or similar) at runtime: Neon's pooler is
  in transaction mode. Append `&pgbouncer=true` to `DATABASE_URL` (the pooled one only,
  not `DATABASE_URL_UNPOOLED`).
- **Build fails on `prisma migrate deploy`**: make sure both `DATABASE_URL` and
  `DATABASE_URL_UNPOOLED` are set for the environment being built (Production, and Preview
  if you use PR previews).

## Custom domain

Vercel → Settings → Domains → add your domain and follow the DNS steps. Then update
`APP_URL` (used to build the magic-link URLs and invite links).

## Emails: going beyond the sandbox

Resend's `onboarding@resend.dev` sender works immediately but only sends to your own
verified address. To email your friends, verify a domain in Resend and set
`EMAIL_FROM` to an address on it.
