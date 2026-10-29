# Tester: closed testing by handshake

A web app where Android developers swap closed testing 1:1 ("I test your app, you test mine") to meet Google Play's
**12 testers × 14 days** requirement. Built from [Testerplatform.prd](docs/Testerplatform.prd).

**Stack:** Next.js 16 (App Router, Server Actions) · Tailwind CSS 4 · Drizzle ORM · Postgres (Supabase in production,
embedded PGlite locally) · Supabase Auth (Google) + Storage · deployed on Vercel.

## Run it locally (no setup needed)

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables set, the app runs in **demo mode**:

- An embedded Postgres (PGlite) database is created in `.data/pglite` and seeded with 16 developers, their apps, and
  handshakes in every state.
- `/login` shows demo accounts instead of Google Sign-In. **Allison Lipshutz** is an admin.
- **Admin → "+1 day ▶"** moves a demo clock forward one day and runs the daily job. Use it to see warnings, broken
  handshakes, blocks and completions without waiting 16 days.

To start over, stop the server and delete `.data/`.

```bash
npm test             # rules engine tests (in-memory Postgres)
npm run lint         # TypeScript check
npm run build        # production build
```

## Going live: Vercel + Supabase

The app runs on **Vercel** (hosting, daily cron) with **Supabase** (Postgres, Google Sign-In, screenshot storage).
Both have free plans; Vercel's free Hobby plan is for non-commercial use.

1. **Create a Supabase project.**
2. **Database.** In Vercel, open the project's **Storage** tab (or Integrations) and connect your Supabase project.
   That sets `POSTGRES_URL` and friends automatically, and every deploy runs `npm run drizzle:migrate` (drizzle-kit, configured in [drizzle.config.ts](drizzle.config.ts))
   before building, which creates and updates the tables (including the levels and Row Level Security, so
   Supabase's public REST API can't read the data). No connection strings to copy. Outside Vercel, set
   `DATABASE_URL` to the *Transaction pooler* string instead; `npm run drizzle:migrate` also applies migrations by hand.
3. **Google Sign-In.**
   1. In Google Cloud, create an OAuth client with redirect URI `https://<project>.supabase.co/auth/v1/callback`.
   2. In Supabase, open Auth → Providers → Google and paste the client ID and secret.
   3. In Auth → URL Configuration, set the Site URL to your site and add `https://<your-site>/auth/callback`
      (and `http://localhost:3000/auth/callback` for local testing) to the redirect URLs.
   4. **Email sign-in** (one-time code). Supabase's built-in sender only mails your own team, 2 per hour, so connect
      an email service under Auth → Emails → SMTP Settings (e.g. Resend or Brevo, both with free plans). Then in
      Auth → Email Templates, add `{{ .Token }}` to the **Magic Link** and **Confirm signup** templates so the email
      shows the code (the link in it also works). Email users confirm their Google Play account during onboarding.
4. **Storage.** Create a **public** bucket named `proofs`, which holds opt-in and check-in screenshots.
5. **Google Group.** Create one Google Group, set it to "Anyone can join" (or "Ask to join").
6. **Vercel.** Add New → Project → import the GitHub repo. The defaults (Next.js, `npm run build`) are right. Before
   deploying, add these under **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `POSTGRES_URL` … | Set by the Supabase integration (step 2) |
   | `SUPABASE_PROOF_BUCKET` | Optional; defaults to `proofs` |
   | `CRON_SECRET` | Any long random string (`openssl rand -hex 32`); protects the daily job |
   | `NEXT_PUBLIC_GOOGLE_GROUP_URL`, `NEXT_PUBLIC_GOOGLE_GROUP_EMAIL` | The shared tester group |
   | `ADMIN_EMAILS` | Comma-separated emails that get the Admin screen |

   `NEXT_PUBLIC_*` values are baked into the build, so after changing them, redeploy.
7. **Region.** [vercel.json](vercel.json) runs the functions in `fra1` (Frankfurt), next to the Supabase database.
   If your Supabase project is elsewhere (Supabase → Project Settings → General), change `regions` to the closest
   Vercel region: every page makes database queries, and each one crosses that distance.
8. **Daily job.** [vercel.json](vercel.json) calls `/api/cron` at 00:05 UTC and sends `Authorization: Bearer
   $CRON_SECRET` automatically. The job catches up on missed days and is safe to run more than once a day.

Once a database is configured, demo mode turns off: no demo accounts, no clock controls, and screenshots need
Supabase Storage.

### Alternative: Cloudflare Workers

The repo also builds for Cloudflare Workers via OpenNext ([wrangler.jsonc](wrangler.jsonc), [worker.ts](worker.ts)
for the cron trigger). Set the Cloudflare build command to `npm run build:cf`, add the same variables (the
`NEXT_PUBLIC_*` ones under both Build → Variables and Variables and Secrets), and use the Transaction pooler
`DATABASE_URL`. `npm run preview:cf` runs the Workers build locally with values from `.dev.vars`.

## How the PRD maps to code

| PRD | Where |
|---|---|
| Database structure (users, apps, handshakes, handshake_sides, daily_checkins, feedback, levels, blocks) | [src/db/schema.ts](src/db/schema.ts) (plus notifications, disputes, settings) |
| Levels 1–5 (12 → 20 slots) | `LEVELS` in [src/lib/config.ts](src/lib/config.ts), seeded into `levels` |
| Slot check before request/accept | `assertFreeSlot` in [src/api/core.ts](src/api/core.ts) |
| Discover filter + sort (owner ≠ me, open, min Android ≤ my device, no existing handshake, owner not blocked; priority → reliability → fewest testers) | `getDiscover` in [src/api/queries.ts](src/api/queries.ts) |
| Request rules (offered app open, not tested by target before, runs on their device) | `requestHandshake` in [src/api/handshakes.ts](src/api/handshakes.ts) |
| Accept in one transaction (both users' slots + both apps' tester slots, row locks) | `acceptHandshake` |
| Opt-in screenshot within 48h, 16-day clock starts when both joined | `submitOptinProof` |
| Daily "opened today" check-in | `checkIn` |
| Daily cron: expire requests after 48h, missed opt-ins, missed_streak (warn at 2, skip at 3), block + reliability penalty, partner keeps credit + app priority, completion + level-up | [src/api/cron.ts](src/api/cron.ts), `breakHandshake`, `penalize`, `rewardCompletion` |
| 4-step submission checklist, link regex + package extraction, logo preview, min Android dropdown | [src/components/AppForm.tsx](src/components/AppForm.tsx), [src/lib/playLinks.ts](src/lib/playLinks.ts) |
| Screens: Landing, Login, Onboarding, Dashboard, My Apps, Discover, Requests, Active Handshakes, Profile, Admin | [src/app/](src/app/) |
| Friend testing (beyond the PRD): owners share `/invite/<code>`; friends test one-way, with no app in return, no slots, no penalties and no level credit | `joinAsFriend`, `leaveFriendTest` in [src/api/handshakes.ts](src/api/handshakes.ts), [src/app/invite/[code]/page.tsx](src/app/invite/[code]/page.tsx) |

Penalty values (block days, reliability changes, deadlines) are in `RULES` in [src/lib/config.ts](src/lib/config.ts).
