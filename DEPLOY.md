# Deploying Coworking Frens (Vercel + Neon Postgres)

The app is Next.js (App Router) + Prisma + Postgres. Local dev ran on SQLite during
prototyping; production uses Postgres. This guide takes you from zero to a live URL.

You'll do the three interactive steps (they need a browser login); everything in the
repo is already wired for them.

---

## 1. Create the database (Neon)

1. Go to <https://neon.tech>, sign in, create a project (pick a region near you, e.g.
   `aws-sa-east-1` for Argentina).
2. In the project dashboard, open **Connection Details**. You need two strings:
   - **Pooled** connection — the host contains `-pooler`. This is `DATABASE_URL`.
   - **Direct** connection — same but without `-pooler`. This is `DIRECT_URL`.
   Both should end with `?sslmode=require`.

Keep these two strings for step 3.

## 2. Set up Resend (login emails)

Sign-in is passwordless: users enter their email and get a one-time **magic link** to
click. Those links are sent with Resend, so Resend is **required in production** — it's
the same account that sends the reminder/notification emails. (The passwordless "dev
login" is disabled in production.)

1. <https://resend.com> → sign up, create an **API key** → `RESEND_API_KEY`.
2. To email anyone other than yourself, **verify a domain** (Resend → Domains) and set
   `EMAIL_FROM` to an address on it, e.g. `Coworking Frens <hola@tudominio.com>`.
   The `onboarding@resend.dev` sandbox sender only delivers to your own verified address —
   fine for a first test, not for inviting friends.

## 3. Deploy to Vercel

### Option A — Git-based (recommended)

1. Push this repo to GitHub (see "Push to GitHub" below).
2. <https://vercel.com/new> → import the repo. Framework auto-detects as Next.js.
3. Before the first deploy, add the **Environment Variables** below.
4. Deploy. The build runs `prisma generate && prisma migrate deploy && next build`, so
   the schema is created on Neon automatically on the first deploy.

### Option B — CLI

```bash
vercel login            # interactive, do this yourself
vercel link             # create/link the project
# add env vars (repeat --prod for production):
vercel env add DATABASE_URL production
# ... etc for each var below ...
vercel --prod           # deploy
```

### Environment variables (set all in Vercel → Settings → Environment Variables)

| Variable             | Value                                                            |
| -------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`       | Neon **pooled** string (from step 1)                            |
| `DIRECT_URL`         | Neon **direct** string (from step 1)                            |
| `AUTH_SECRET`        | run `openssl rand -base64 32`                                   |
| `AUTH_TRUST_HOST`    | `true`                                                          |
| `APP_URL`            | your final URL, e.g. `https://coworking-frens.vercel.app`       |
| `CRON_SECRET`        | run `openssl rand -hex 16` (Vercel Cron sends it automatically) |
| `RESEND_API_KEY`     | from <https://resend.com> — **required** (magic-link login + emails) |
| `EMAIL_FROM`         | an address on a domain you verified in Resend                   |

## 4. The daily job (reminders + auto-open)

`vercel.json` already declares a cron hitting `/api/cron` at **23:00 UTC (20:00 in
Argentina)** every day. It materializes recurring days 3 weeks out and sends the
day-before reminder emails. Vercel authenticates it automatically using `CRON_SECRET`
— no extra setup. (Cron is enabled on Hobby and Pro plans.)

## 5. First run

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
  not `DIRECT_URL`).
- **Build fails on `prisma migrate deploy`**: make sure both `DATABASE_URL` and
  `DIRECT_URL` are set for the environment being built (Production, and Preview if you use
  PR previews).

## Custom domain

Vercel → Settings → Domains → add your domain and follow the DNS steps. Then update
`APP_URL` (used to build the magic-link URLs and invite links).

## Emails: going beyond the sandbox

Resend's `onboarding@resend.dev` sender works immediately but only sends to your own
verified address. To email your friends, verify a domain in Resend and set
`EMAIL_FROM` to an address on it.
