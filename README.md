# Ironman Race Recap

Digital storefront for Ironman participants:

1. **Public search** by last name / bib across imported races
2. **$5 Stripe Checkout** unlocks a personalized recap (splits, per-discipline AG ranks, division percentile, Kona/championship qualifier flag)
3. **Strava OAuth** (optional, after purchase) overlays the participant's last 3 months of training onto the recap
4. **Admin portal** to upload [CoachCox](https://www.coachcox.co.uk/) race-result CSVs — rows are parsed and imported automatically

Built with Next.js 14 (App Router) + TypeScript + Prisma/Postgres + Stripe + Tailwind. Deploys to Netlify.

---

## Local setup

You need a Postgres instance. Easiest options: a free [Neon](https://neon.tech)
project (same DB you'll use in prod), `brew install postgresql`, or
`docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 -d postgres:16`.

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, Stripe + Strava keys, ADMIN_PASSWORD, SESSION_SECRET
npx prisma db push          # apply schema to your Postgres
npm run db:seed             # optional: a fake race + 3 participants
npm run dev
```

Open <http://localhost:3000>.

### Stripe (test mode)

Get test keys from <https://dashboard.stripe.com/test/apikeys>, then in another terminal:

```bash
npm run stripe:listen
# copy the printed `whsec_...` into STRIPE_WEBHOOK_SECRET in .env
```

Use Stripe's test card `4242 4242 4242 4242` with any future expiry / CVC.

### Strava OAuth

1. Create an app at <https://www.strava.com/settings/api>.
2. Set the **Authorization Callback Domain** to `localhost` (or your prod host).
3. Copy Client ID / Secret into `.env`.

The redirect URL the app uses is `${APP_URL}/api/strava/callback`.

### Admin

Go to `/admin`, sign in with `ADMIN_PASSWORD`, then upload a race PDF.

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                          # Search by race + name/bib
│   ├── participant/[id]/page.tsx         # Free preview + buy button
│   ├── report/[purchaseId]/page.tsx      # Full recap (gated by Stripe paid status)
│   ├── admin/page.tsx                    # Password login
│   ├── admin/dashboard/page.tsx          # Upload PDF, view race list & revenue
│   └── api/
│       ├── checkout/route.ts             # Creates Stripe Checkout Session
│       ├── stripe/webhook/route.ts       # Marks Purchase as paid
│       ├── strava/connect/route.ts       # Redirects to Strava OAuth
│       ├── strava/callback/route.ts      # Fetches activities, computes insights
│       ├── admin/login/route.ts
│       └── admin/upload/route.ts         # Parses CoachCox CSV, creates Race + Participants
├── lib/
│   ├── prisma.ts          # Singleton client
│   ├── stripe.ts          # Stripe SDK + price
│   ├── strava.ts          # OAuth, activities fetch, insight aggregation
│   ├── results-parser.ts  # CoachCox CSV → ParsedParticipant[]
│   ├── auth.ts            # iron-session for admin
│   └── format.ts          # H:MM:SS helpers
└── components/          # Client components for search, upload, checkout, Strava
prisma/schema.prisma     # Race · Participant · Purchase
```

### CSV format (CoachCox)

`src/lib/results-parser.ts` reads the standard CoachCox export. Required
header row:

```
Bib,Name,Country,Gender,Division,
Overall Time,Overall Rank,Gender Rank,Age Group Rank,
Swim Time,Swim Rank,Gender Swim Rank,Age Group Swim Rank,
Bike Time,Bike Rank,Gender Bike Rank,Age Group Bike Rank,
Run Time,Run Rank,Gender Run Rank,Age Group Run Rank,
Transition 1 Time,Transition 1 Rank,Gender Transition 1 Rank,Age Group Transition 1 Rank,
Transition 2 Time,Transition 2 Rank,Gender Transition 2 Rank,Age Group Transition 2 Rank,
Finish,Qualifier Time,Qualifier Rank,Gender Qualifier Rank,Qualified
```

Notes:
- Times are parsed leniently — both `00:06:24` and `00:6:24` work.
- `Finish` accepts `FIN`, `DNF`, `DNS`; only `FIN` participants are
  included in division-median comparisons.
- `Qualified` accepts `1`/`0` or `true`/`false`; the report shows a
  championship-slot badge when true.
- Rows that lack a Bib or Name are skipped silently. The admin upload route
  returns the imported count so you can sanity-check against the file.

### Payment flow

1. Visitor hits `/participant/[id]`, enters email, clicks **Buy recap — $5**.
2. `/api/checkout` creates a Stripe Checkout Session with `success_url`
   pointing to `/report/{CHECKOUT_SESSION_ID}` (Stripe substitutes the ID).
3. After payment, Stripe fires `checkout.session.completed` →
   `/api/stripe/webhook` flips the `Purchase.status` to `paid`.
4. `/report/[purchaseId]` also reconciles via `stripe.checkout.sessions.retrieve`
   to handle the gap before the webhook fires (handy in local dev).

### Strava flow

Only available after the purchase is `paid`. The `state` query parameter
carries the `purchaseId` round-trip so the callback can attribute the tokens.
The window is `[raceDate - 3 months, raceDate]`, aggregated into
`TrainingInsights` (totals, by-discipline, weekly volume, peak week, longest
sessions, average HR) and persisted as JSON on the `Purchase` row.

---

## Deploying to Netlify

`netlify.toml` is already wired up (`@netlify/plugin-nextjs`, Node 20, the
right Prisma binary target). The build runs `prisma generate && prisma db push`
to apply the schema to your Postgres before `next build`.

**One-time setup:**

1. **Create a Postgres database.**
   [Neon](https://neon.tech) free tier is the smoothest fit (serverless +
   pooler built in). Grab two URLs from the dashboard:
   - **Pooled** connection string → `DATABASE_URL`
   - **Direct** connection string → `DIRECT_DATABASE_URL`

2. **Connect the repo in Netlify.**
   netlify.com → "Add new site" → "Import from Git" → pick this repo and
   the branch you want to deploy. Netlify will detect `netlify.toml`.

3. **Create a Strava API app** at <https://www.strava.com/settings/api>.
   Set the *Authorization Callback Domain* to your Netlify subdomain
   (e.g. `your-site.netlify.app`). Note the Client ID + Secret.

4. **Set environment variables in Netlify** (Site settings → Environment
   variables). Mirror `.env.example`:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon **pooled** URL |
   | `DIRECT_DATABASE_URL` | Neon **direct** URL |
   | `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…` to start) |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
   | `STRIPE_WEBHOOK_SECRET` | Filled in after step 6 |
   | `REPORT_PRICE_CENTS` | `500` |
   | `APP_URL` | `https://<your-site>.netlify.app` |
   | `ADMIN_PASSWORD` | Pick something strong |
   | `SESSION_SECRET` | 32+ random characters (`openssl rand -hex 32`) |
   | `STRAVA_CLIENT_ID` | From step 3 |
   | `STRAVA_CLIENT_SECRET` | From step 3 |

5. **Deploy.** Netlify builds; first build creates all tables in Postgres
   via `prisma db push`.

6. **Wire up the Stripe webhook.** In the Stripe Dashboard →
   Developers → Webhooks → "Add endpoint":
   - URL: `https://<your-site>.netlify.app/api/stripe/webhook`
   - Event: `checkout.session.completed`
   Copy the generated signing secret (`whsec_…`) into the Netlify env var
   `STRIPE_WEBHOOK_SECRET`, then redeploy (Netlify → Deploys → Trigger deploy).

7. **First-time admin flow.** Visit `/admin`, sign in with
   `ADMIN_PASSWORD`, upload a CoachCox CSV. Done — the public search at
   `/` should now return results.

### Notes

- `prisma db push` is used in the build because it's zero-config. Once
  you start iterating on the schema in production, switch to
  `prisma migrate dev` locally + `prisma migrate deploy` in the build to
  get versioned migrations.
- Neon's `directUrl` is required because Prisma's schema-sync commands
  need a non-pooled connection.
- If you outgrow Neon, Supabase / Railway / RDS work the same way — just
  swap the two URLs.

## Safety / TODO

- PDF parser is intentionally simple; verify import counts before going live
  for each new race.
- Strava tokens are stored unencrypted in SQLite — encrypt them
  (e.g. `@aws-sdk/client-kms` or `node:crypto` with a key in env) before prod.
- Add rate limiting on `/api/checkout` and `/api/admin/login` (e.g. Upstash).
- Email delivery of the report link after payment (Resend / Postmark) is not
  implemented; today the user is redirected to the report URL after checkout.
