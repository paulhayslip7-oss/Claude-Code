# Ironman Race Recap

Digital storefront for Ironman participants:

1. **Public search** by last name / bib across imported races
2. **$5 Stripe Checkout** unlocks a personalized recap (splits, ranks, division percentile)
3. **Strava OAuth** (optional, after purchase) overlays the participant's last 3 months of training onto the recap
4. **Admin portal** to upload race-result PDFs — the rows are parsed and imported automatically

Built with Next.js 14 (App Router) + TypeScript + Prisma/SQLite + Stripe + Tailwind.

---

## Local setup

```bash
npm install
cp .env.example .env        # fill in Stripe + Strava keys, ADMIN_PASSWORD, SESSION_SECRET
npx prisma db push          # create SQLite schema at prisma/dev.db
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
│       └── admin/upload/route.ts         # Parses PDF, creates Race + Participants
├── lib/
│   ├── prisma.ts        # Singleton client
│   ├── stripe.ts        # Stripe SDK + price
│   ├── strava.ts        # OAuth, activities fetch, insight aggregation
│   ├── pdf-parser.ts    # Best-effort row scanner for Ironman result PDFs
│   ├── auth.ts          # iron-session for admin
│   └── format.ts        # H:MM:SS helpers
└── components/          # Client components for search, upload, checkout, Strava
prisma/schema.prisma     # Race · Participant · Purchase
```

### PDF parsing notes

`src/lib/pdf-parser.ts` is a heuristic line-scanner tuned for the standard
Ironman finisher PDF layout:

```
BIB  FIRST LAST  COUNTRY  AGE-GROUP/GENDER  SWIM  T1  BIKE  T2  RUN  FINISH  RANK  DIV-RANK  GENDER-RANK
```

PDF layouts vary by event and year; extend the regexes in `parseRacePdf` (or
add per-event adapters) when an import drops rows. The admin upload route
returns the imported count so you can sanity-check against the PDF.

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

## Deploying

- **Vercel** is the path of least resistance. Set the env vars from
  `.env.example`, swap `DATABASE_URL` to a managed Postgres (Neon, Supabase,
  RDS) and change the Prisma `provider` to `postgresql`.
- Register the deployed `/api/stripe/webhook` endpoint in the Stripe
  dashboard (live mode) and update `STRIPE_WEBHOOK_SECRET`.
- Update the Strava app's Authorization Callback Domain to the prod host.

## Safety / TODO

- PDF parser is intentionally simple; verify import counts before going live
  for each new race.
- Strava tokens are stored unencrypted in SQLite — encrypt them
  (e.g. `@aws-sdk/client-kms` or `node:crypto` with a key in env) before prod.
- Add rate limiting on `/api/checkout` and `/api/admin/login` (e.g. Upstash).
- Email delivery of the report link after payment (Resend / Postmark) is not
  implemented; today the user is redirected to the report URL after checkout.
