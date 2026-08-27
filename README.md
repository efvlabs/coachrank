# CoachRank.lol

**The global paid leaderboard for coaches.** Coaches bid for ranking positions. The more money
behind a name, the higher it ranks.

> **Rank = bid. Nothing else.**

Rankings on CoachRank are not reviews, ratings, editorial recommendations, endorsements,
qualifications, popularity or verified outcomes. That disclosure is repeated in the footer, on
`/rules`, on `/about`, on every rank page and in the ranking copy itself, and the moderation layer
actively rejects bios that claim otherwise.

---

## Contents

1. [Architecture](#1-architecture)
2. [The business rules, precisely](#2-the-business-rules-precisely)
3. [Local development](#3-local-development)
4. [Environment variables](#4-environment-variables)
5. [Firebase setup](#5-firebase-setup)
6. [Firestore schema](#6-firestore-schema)
7. [Indexes](#7-indexes)
8. [Security rules](#8-security-rules)
9. [Dodo Payments setup](#9-dodo-payments-setup)
10. [Webhooks](#10-webhooks)
11. [Admin](#11-admin)
12. [Editing pricing](#12-editing-pricing)
13. [Blog publishing](#13-blog-publishing)
14. [Tests](#14-tests)
15. [Production deployment](#15-production-deployment)
16. [Operational notes](#16-operational-notes)

---

## 1. Architecture

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4, CSS custom properties for the light/dark palette. Bricolage Grotesque (display) + Inter (UI) |
| Data | Cloud Firestore via `firebase-admin` (server) + `firebase` web SDK (read-only, live feed + admin sign-in) |
| Payments | Dodo Payments (`dodopayments` official Node SDK), one-time pay-what-you-want products |
| Auth | Firebase Authentication — **admin only**. Coaches never get an account. |
| Rendering | Server Components by default; client components only where there is real interactivity |

### Design

Indigo `#2C4BF0` on warm paper, with one saturated moment: **#1 is the inverse of the page** —
a near-black card in light mode, bone in dark. Everything else is quiet so that block reads as a
trophy and a screenshot of it is worth posting.

A listing is **three fields — name, website, category.** No bio, no photos, no rates, no accounts.

Brand assets live in `public/brand/`:

| File | Use |
| --- | --- |
| `avatar-1024.png` | X / LinkedIn / Instagram profile picture |
| `avatar-512.png` | smaller social slots, Discord, Slack |
| `avatar-dark-1024.png` | dark variant for light backgrounds |
| `mark.svg` | the mark alone, inherits `currentColor` |
| `wordmark.svg` | mark plus wordmark, for docs and decks |
| `src/app/icon.svg`, `src/app/apple-icon.png` | favicon and iOS icon, wired up by Next.js |

The mark is three ascending bars — a leaderboard where the tallest one was paid for. It stays
legible at 16px, which is what a favicon and a social avatar actually need.

### Directory map

```
src/
  app/
    page.tsx                     All-time leaderboard (home)
    today/page.tsx               Today board (rolling 24h)
    coaches/[category]/          Category boards + /today variant
    categories/                  Category index
    r/[slug]/                    Shareable rank + detail page, with dynamic OG image
    blog/, blog/[slug]/          Blog — built and editable in /admin, hidden from the
                                 public site until NEXT_PUBLIC_ENABLE_BLOG=true
    rules/ about/ terms/ privacy/
    success/                     Post-payment screen (waits for verified webhook)
    admin/                       Firebase-auth admin: coaches, payments, spotlights, blog, settings
    go/[listingId]/route.ts      Outbound click tracker → 302 to the coach's site
    api/
      bid/lookup                 Recognise an existing listing by website
      bid/checkout               Validate → reserve → create Dodo checkout session
      spotlight/lookup           Resolve a listing for a Spotlight rental
      spotlight/checkout         Hold the slot → create Dodo checkout session
      webhooks/dodo              THE ONLY WRITE PATH FOR MONEY
      payment-status             Read-only status for the success screen
      icon                       Server-side favicon resolution + initials fallback
      visit / presence           Real visitor and online counters
      admin/session              ID token → httpOnly session cookie
    sitemap.ts, robots.ts, opengraph-image.tsx
  components/                    UI, split server/client at the smallest possible boundary
  lib/
    money.ts        Integer-cent arithmetic. No floating point ever touches a charge.
    ranking.ts      Pure ordering + bid validation (fully unit tested)
    today.ts        Pure rolling-window aggregation
    url.ts          Website normalisation — the identity of a listing
    bio.ts          30-word enforcement, shared verbatim by client and server
    moderation.ts   Abuse screening
    dodo.ts         Dodo client, checkout creation, webhook verification
    firebase/       Admin + web SDK initialisation, both degrading gracefully
    domain/         Firestore access: listings, payments, spotlight, blog, stats, activity
scripts/seed-demo.mjs            Local demo data. Refuses to run against production.
firestore.rules                  Production security rules
firestore.indexes.json           Every composite index the app needs
```

### Design principle: nothing is credited without proof

A browser redirect proves nothing. `POST /api/webhooks/dodo` is the only code path that can
publish a listing, move a standing bid or activate a Spotlight, and it:

- **verifies** the Standard Webhooks signature with the Dodo SDK (`client.webhooks.unwrap`) — an
  unsigned or badly-signed request gets a `401` and changes nothing;
- is **idempotent** on the Dodo payment id, so eight retry deliveries credit exactly once;
- runs the listing update, the payment record, the stats counters and the idempotency key in a
  **single Firestore transaction**;
- applies bids as **increments, never assignments**, so two checkouts completing out of order both
  count and neither overwrites the other;
- writes the activity event with a **deterministic id derived from the payment**, so a retried
  webhook heals a partially-finished payment instead of duplicating it.

### Graceful degradation

`getDb()` returns `null` when Firebase is not configured, and every read path renders an empty
state rather than throwing. The site builds, boots and renders with no credentials at all — useful
for CI and for a first deploy before the database exists. Write paths (`requireDb`) fail loudly.

---

## 2. The business rules, precisely

### Bids are cumulative

The number beside a coach is the **total of every successful leaderboard payment** made for that
listing. Raising a standing bid charges only the difference.

```
Sarah's standing bid          $500
Sarah wants                   $510
Dodo charges                   $10   ← never $510
Sarah's new standing bid      $510
```

Because payments are applied additively, a payment that lands after another payment for the same
coach still counts. Two racing $10 and $20 top-ups against a $500 snapshot produce $530, not $520.

### Thresholds

| Rule | Default | Configurable at |
| --- | --- | --- |
| Minimum new listing | `$5` | `/admin/settings` → `minNewBidCents` |
| To take #1 | current #1 `+ $5` | `topPositionIncrementCents` |
| To take any other position | occupant `+ $1` | `standardIncrementCents` |

There is a deliberate **dead zone**: an amount above the current #1 but below `#1 + $5` is rejected
with an explanation. Any amount at or below the current #1 is accepted and simply lands wherever it
lands. A coach raising their own bid is compared against the top *excluding themselves*, so they
never have to out-bid themselves by $5.

### Ties

Identical standing bids are ordered by `standingBidReachedAt` ascending — whoever got there first
stays higher. The field is re-stamped on every successful payment.

### All-time vs Today

- **All-time** is permanent. Standing bids never expire and are never reset.
- **Today** is a rolling 24-hour window recomputed from immutable `bidPayments` on every read. A
  payment contributes for exactly 24 hours from `paidAt`, then drops off Today and *only* Today.

Payment history is never mutated to produce Today.

### Global and category rank

One bid, both ranks. Category rank is the position among active listings in the same category, from
the same ordering. There is no separate category payment.

---

## 3. Local development

```bash
npm install
cp .env.example .env.local          # fill in as much as you have

# Terminal 1 — Firestore + Auth emulators (needs Java 11+)
npm run emulators

# Terminal 2 — seed clearly-labelled demo data, then run the app
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
npm run dev
```

Add these to `.env.local` for the emulator path (no service account needed):

```
FIREBASE_PROJECT_ID=coachrank-local
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099

# The two above are server-side only. The browser SDK needs its own pair so that admin
# sign-in and the live activity feed also reach the emulators. Unset both in production.
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080

# Any non-empty values work against the emulators.
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=coachrank-local
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:demo
```

Create your local admin account in the Auth emulator, then put that address in `ADMIN_EMAILS`:

```bash
curl -s -X POST \
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key" \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"local-dev-password","returnSecureToken":true}'
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on :3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript + React 19 rules) |
| `npm run typecheck` | `next typegen` then `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run check` | lint → typecheck → test → build |
| `npm run emulators` | Firestore + Auth emulators |
| `npm run seed` | Demo data (emulator only unless `--force`) |
| `npm run seed:reset` | Wipe, then re-seed |
| `node scripts/dev-webhook.mjs` | Send a signed test webhook locally (see [Webhooks](#10-webhooks)) |

The seed script **refuses to run** unless `FIRESTORE_EMULATOR_HOST` is set, and refuses outright
when `DODO_PAYMENTS_ENVIRONMENT=live_mode`. Every demo website is a `*.example.com` host so demo
rows are unmistakable. No demo data ever reaches production automatically.

---

## 4. Environment variables

Full annotated list in [`.env.example`](./.env.example). Summary:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes | Absolute origin, no trailing slash. Canonicals, OG, sitemap, Dodo `return_url`. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | local only | Raw or base64 service-account JSON. **Not needed on Firebase App Hosting** — the runtime supplies Application Default Credentials. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | alt | Use instead of the JSON blob. `\n` accepted in the key. |
| `FIRESTORE_EMULATOR_HOST` | dev | When set, no credentials are needed. |
| `NEXT_PUBLIC_FIREBASE_*` | recommended | Web SDK config. Powers the live activity feed and admin sign-in only. Safe to expose. |
| `DODO_PAYMENTS_API_KEY` | yes | Checkout is disabled without it; the rest of the site still works. |
| `DODO_PAYMENTS_ENVIRONMENT` | yes | `test_mode` or `live_mode`. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | yes | Without it **every webhook is rejected** and nothing is ever credited. |
| `DODO_BID_PRODUCT_ID` | yes | One-time product with pay-what-you-want enabled. |
| `DODO_SPOTLIGHT_PRODUCT_ID` | no | Falls back to `DODO_BID_PRODUCT_ID`. |
| `ADMIN_EMAILS` | yes | Comma-separated allow-list for `/admin`. |
| `FIREBASE_DATABASE_ID` / `NEXT_PUBLIC_FIREBASE_DATABASE_ID` | when sharing a project | `coachrank`. Both must match, or the browser reads a different database than the server. |
| `DEFAULT_*_USD` | no | Build-time pricing fallbacks; Firestore settings win once written. |
| `NEXT_PUBLIC_ENABLE_PRESENCE` | no | `false` disables the "N online" counter and its heartbeats. |
| `DISABLE_REMOTE_FAVICONS` | no | `true` skips public favicon services; every listing then uses a generated initials avatar. |

---

## 5. Firebase setup

**What you need to do in the Firebase console:**

1. Create a project (or reuse one).
2. **Firestore Database → Create database** in production mode, in a region near your users.
3. **Project settings → Service accounts → Generate new private key.** Put the JSON into
   `FIREBASE_SERVICE_ACCOUNT_JSON` (base64 it if your host dislikes multi-line values).
4. **Project settings → Your apps → Web app.** Copy the config into the `NEXT_PUBLIC_FIREBASE_*`
   variables.
5. **Authentication → Sign-in method → Email/Password → Enable.** Then **Users → Add user** to
   create your admin account, and put that email in `ADMIN_EMAILS`.
6. Deploy rules and indexes (below).

```bash
firebase login
firebase use corporate-gupshup
firebase deploy --only firestore:coachrank
```

### Sharing a Firebase project with another app

A Firebase project can hold several Firestore databases. Giving CoachRank its own means the
other app's `(default)` database, rules, indexes and Cloud Functions are never touched, and
the arrangement stays reversible.

```bash
# 1. Create the database. The location is PERMANENT — pick the region closest to where the
#    Next.js server will run, not to you. Vercel deploys to US East by default.
firebase firestore:databases:create coachrank --location=nam5   # US multi-region
# firebase firestore:databases:create coachrank --location=asia-south1   # Mumbai
# firebase firestore:locations                                  # see every option

# 2. Point the app at it (.env.local and your host's env)
#    FIREBASE_DATABASE_ID=coachrank
#    NEXT_PUBLIC_FIREBASE_DATABASE_ID=coachrank

# 3. Deploy rules and indexes to that database ONLY
firebase deploy --only firestore:coachrank
```

`firebase.json` names the `coachrank` database explicitly, so a deploy from this repo cannot
reach another database in the same project. Multiple databases per project generally requires
the Blaze plan; Blaze keeps a free tier that traffic at this scale sits well inside.

---

## 6. Firestore schema

### `listings/{listingId}`

The document id is `sha256(normalizedWebsite)` truncated to 24 hex characters, so **Firestore
itself makes duplicate listings impossible** — one website is one listing, forever.

```ts
{
  name: string
  slug: string                      // "sarah-chen-k4m2" → /r/sarah-chen-k4m2
  normalizedWebsite: string         // "sarahchen.com/coaching"
  displayWebsite: string            // "https://sarahchen.com/coaching"
  category: "business" | "startup-founder" | "executive-leadership" | "life" | "sports"
  bio: string                       // ≤ 30 words, plain text, no markup

  standingBidCents: number          // cumulative total of paid increments
  standingBidReachedAt: Timestamp   // tie-break: earlier wins

  totalClicks: number
  clicksBySource: { [source]: number }

  status: "pending" | "active" | "hidden"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

`pending` = created at checkout, never publicly visible. `hidden` = moderated off the board;
payments still record but the listing does not rank and generates no activity.

### `bidPayments/{paymentId}` — immutable

```ts
{
  listingId: string
  incrementCents: number            // what Dodo actually charged
  previousStandingBidCents: number
  intendedStandingBidCents: number  // the target shown at checkout (informational)
  resultingStandingBidCents: number | null
  resultingOverallRank?: number
  resultingCategoryRank?: number
  dodoPaymentId: string | null      // the idempotency key
  dodoSessionId: string | null
  status: "pending" | "paid" | "failed"
  publishedListing: boolean         // true when this payment first published the listing
  createdAt: Timestamp
  paidAt: Timestamp | null
}
```

### `activityEvents/{paymentId}`

Deterministic id = the payment id, which is what makes "exactly one event per payment" a database
guarantee rather than a hope. Created **only** after verified payment processing.

```ts
{
  type: "bid"
  listingId, listingSlug, coachName, category, displayWebsite
  paymentIncrementCents: number
  resultingStandingBidCents: number
  resultingOverallRank: number
  resultingCategoryRank: number
  createdAt: Timestamp
}
```

### `spotlightBookings/{bookingId}` and `spotlightSlots/{slot}`

```ts
// spotlightBookings
{
  listingId, slot: "premium" | "standard", priceCents,
  startsAt: Timestamp | null, endsAt: Timestamp | null,   // exactly 24h apart
  totalClicks, dodoPaymentId, dodoSessionId,
  status: "pending" | "active" | "expired" | "failed",
  refundRequired?: boolean,
  createdAt
}

// spotlightSlots — the reservation record, one document per slot
{ activeBookingId, endsAt, holdBookingId, holdExpiresAt }
```

Starting checkout takes a 15-minute exclusive **hold** on the slot in a transaction. A second buyer
cannot reach checkout while a hold or an active booking exists. If a payment somehow arrives after
its hold lapsed and the slot was taken, the booking is marked `failed` with `refundRequired: true`
rather than double-booking a paying advertiser.

### `blogPosts/{postId}`

```ts
{
  title, slug, excerpt, markdownBody,
  seoTitle, metaDescription,
  ctaCategory: CategorySlug | null,     // picks the end-of-article leaderboard CTA
  status: "draft" | "published",
  publishedAt: Timestamp | null, updatedAt, createdAt
}
```

### `stats/site`

```ts
{ visitors, outboundClicks, listedCoaches, leaderboardRevenueCents, spotlightRevenueCents }
```

All updated with atomic `FieldValue.increment` from the server. The client cannot write them.

### `settings/pricing`, `presence/{visitorId}`, `processedWebhooks/{dodoPaymentId}`

Pricing knobs; presence heartbeats (auto-swept); webhook idempotency keys.

---

## 7. Indexes

Every composite index the application needs is committed in
[`firestore.indexes.json`](./firestore.indexes.json) — nothing depends on an index someone created
by hand in the console. Deploy with:

```bash
firebase deploy --only firestore:indexes
```

Covering, in short: `listings` by `status` + `standingBidCents` (both directions, with and without
`category` and `standingBidReachedAt`, for ordering *and* for the count aggregations that resolve a
single listing's rank); `bidPayments` by `status` + `paidAt` and by `listingId` + `status` +
`paidAt`; `spotlightBookings` by `slot` + `status` + `endsAt`; `blogPosts` by `status` +
`publishedAt` and by `slug` + `status`.

---

## 8. Security rules

[`firestore.rules`](./firestore.rules) makes the browser **read-only, and only for two
collections**: `active` listings and `activityEvents` (which powers the live feed). Everything else
— payments, financial totals, spotlight state, settings, blog, presence, webhook keys — is denied
to clients entirely.

There is deliberately **no client-side admin write path**. `/admin` calls server actions, which
check the session cookie against `ADMIN_EMAILS` and then write with the Admin SDK, which bypasses
rules. That keeps the browser incapable of writing anything at all, admin or not.

---

## 9. Dodo Payments setup

Everything below is done once, in the Dodo dashboard at
[app.dodopayments.com](https://app.dodopayments.com). Do it all in **test mode** first; the
dashboard has a test/live toggle and the two modes have separate keys, products and webhooks.

### 1. Account and business details

Sign up, then complete **Business verification**. Dodo is a merchant of record, so it needs your
legal entity, address and payout bank details before it will release live mode. Test mode works
immediately, so you can build and verify the whole flow while verification is pending.

### 2. Create the bid product

**Products → Add product.**

| Field | Value |
| --- | --- |
| Type | **One-time payment** |
| Name | `CoachRank leaderboard bid` (this is what buyers see on the receipt) |
| Pricing | enable **Pay what you want** |
| Minimum | `1.00` USD — the app enforces the real minimum and passes the exact amount |
| Currency | USD |
| Tax category | SaaS / digital services |

Save, then copy the product id (`pdt_…`) into `DODO_BID_PRODUCT_ID`.

> **Why pay-what-you-want.** Every charge here is a different number — $5, $99, $515 — so rather
> than a product per price, the app sends one product with `product_cart[0].amount` set in cents
> per checkout. Without PWYW enabled, Dodo ignores that amount and charges the list price.

### 3. Create the spotlight product (optional)

Repeat step 2 with the name `CoachRank spotlight` and put its id in `DODO_SPOTLIGHT_PRODUCT_ID`.
Skip it and spotlights reuse the bid product — the only difference is the receipt wording.

### 4. API key

**Developer → API keys → Create.** Copy it into `DODO_PAYMENTS_API_KEY` and set
`DODO_PAYMENTS_ENVIRONMENT=test_mode`. Never commit this value; it is server-only and is not
prefixed `NEXT_PUBLIC_`.

### 5. Webhook

See [Webhooks](#10-webhooks) below — this is the step that actually makes payments count.

### 6. Go live

1. Finish business verification.
2. Flip the dashboard to **live mode** and recreate the products and the webhook there — test-mode
   ids do not work in live mode.
3. Update `DODO_PAYMENTS_API_KEY`, `DODO_BID_PRODUCT_ID`, `DODO_PAYMENTS_WEBHOOK_KEY` and set
   `DODO_PAYMENTS_ENVIRONMENT=live_mode`.
4. Redeploy, then make one real low-value payment and confirm it appears on the board.

### What the app sends

```ts
await client.checkoutSessions.create({
  product_cart: [{ product_id, quantity: 1, amount: incrementCents }],
  metadata: { cr_payment_id, cr_kind: "bid" | "spotlight", cr_listing_id, cr_amount_cents },
  return_url: `${SITE_URL}/success?p=${paymentId}`,
  cancel_url: `${SITE_URL}/#claim`,
});
```

`metadata.cr_payment_id` is our own pending-payment document id. It comes back inside the
signature-verified webhook payload, which is how a payment is reconciled to a listing. It is set
server-side and cannot be tampered with.

## 10. Webhooks

**In the Dodo dashboard → Developer → Webhooks → Add endpoint:**

| Field | Value |
| --- | --- |
| URL | `https://YOUR-DOMAIN/api/webhooks/dodo` |
| Events | `payment.succeeded`, `payment.failed`, `payment.cancelled` |
| Secret | copy into `DODO_PAYMENTS_WEBHOOK_KEY` |

Local testing has two options.

**Against a tunnel:** expose your dev server (`cloudflared tunnel --url http://localhost:3000`,
`ngrok http 3000`, or the Dodo CLI) and point a **test-mode** endpoint at the tunnel URL.

**Without a tunnel:** `scripts/dev-webhook.mjs` creates a pending payment exactly as the checkout
route would, signs a `payment.succeeded` body with your `DODO_PAYMENTS_WEBHOOK_KEY` using the same
Standard Webhooks algorithm Dodo uses, and POSTs it to your local app. It refuses to run outside the
Firestore emulator.

```bash
# Publish the most recent pending listing with a $600 payment
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/dev-webhook.mjs --amount 600

# Raise an existing coach's standing bid by $25 — proves the delta model
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/dev-webhook.mjs \
  --website sarahchen.example.com --amount 25

# Prove idempotency: three identical deliveries
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/dev-webhook.mjs --amount 10 --deliveries 3

# Prove a forged webhook is rejected
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/dev-webhook.mjs --amount 10 --tampered
```

Handling guarantees, all covered by tests in `src/test/webhook.test.ts`:

| Situation | Result |
| --- | --- |
| Missing signature headers | `400`, nothing credited |
| Bad signature | `401`, nothing credited |
| Valid `payment.succeeded` | listing published, standing bid raised, one activity event, stats updated |
| Same payment delivered N times | credited exactly once, one activity event |
| `payment.failed` / `payment.cancelled` | payment marked failed, listing stays unpublished, **no** activity event |
| Verified event with no CoachRank metadata | `200`, ignored |
| Processing throws | `500`, so Dodo retries — every handler is safe to re-run |

Dodo retries up to 8 times with backoff (immediate, 5s, 5m, 30m, 2h, 5h, 10h, 10h).

---

## 11. Admin

`/admin`, Firebase Email/Password sign-in, restricted to `ADMIN_EMAILS`. The ID token is exchanged
for a 5-day httpOnly session cookie; an account not on the allow-list is refused even with valid
Firebase credentials.

| Screen | Capability |
| --- | --- |
| Overview | Real counters, plus a configuration health check (Firebase / Dodo / webhook key) |
| Coaches | Fix a typo, re-file a category, hide, restore. **Cannot** edit bids, payments or clicks. |
| Payments | Read-only audit log |
| Spotlights | Current and past rentals, including any flagged `refundRequired` |
| Blog | Full CRUD — create, edit, Markdown preview, save draft, publish, unpublish, delete |
| Settings | The five pricing knobs |

Restoring a listing that has never had a verified payment is refused: publication comes from
payment, not from an administrator.

### Creating the first admin

```bash
# Firebase console → Authentication → Users → Add user (email + password)
# then add that address to ADMIN_EMAILS and redeploy
```

---

## 12. Editing pricing

`/admin/settings` writes `settings/pricing` and takes effect immediately for new checkouts (there
is a 15-second read cache). Changing a price never alters a standing bid already paid for.

| Field | Meaning |
| --- | --- |
| `minNewBidCents` | Floor for a brand-new listing |
| `topPositionIncrementCents` | How far above #1 a challenger must go |
| `standardIncrementCents` | Step to pass any other position |
| `maxBidCents` | Ceiling on any standing bid, so one typo cannot break the board |
| `premiumSpotlightCents` | Spotlight I (left of the board), 24 hours |
| `standardSpotlightCents` | Spotlight II (right of the board), 24 hours |

Before the document exists, the `DEFAULT_*_USD` environment variables apply, then the code defaults
($5 minimum, $999,999 maximum, $5 to take #1, $1 elsewhere, $99 per spotlight).

---

## 13. Blog publishing

`/admin/blog` → **New post**. Write Markdown, toggle **Preview**, then **Save draft** or
**Publish**. Choosing a *Leaderboard CTA category* puts a targeted "Explore {Category} coaches →"
and "Are you a {category} coach? Claim your rank →" block at the end of the article — the loop that
turns search traffic into listings.

Articles render as server-side HTML and are fully readable with JavaScript disabled. Markdown is
converted server-side and sanitised to a strict tag allow-list; external links get
`rel="nofollow noopener noreferrer"`.

**Content policy:** nothing auto-publishes. Write and review each article by hand. The seed script
includes three complete articles as a starting point and as a format reference; they are dev seed
data, not something to push to production unreviewed.

---

## 14. Tests

```bash
npm test
```

100 tests across 12 files. Firestore-dependent logic runs against an in-memory Firestore fake
(`src/test/fake-firestore.ts`) that implements documents, transactions, batches, queries, ordering,
limits, count aggregations and the `FieldValue`/`Timestamp` sentinels — so the money paths are
tested through the real application code, with no emulator required in CI.

| File | Covers |
| --- | --- |
| `ranking.test.ts` | Maximum bid enforced · highest bid wins · ties keep the older bid higher · hidden and pending excluded · category rank · #1 needs +$5 · the dead zone · $500→$510 charges $10 · racing raises |
| `payments.test.ts` | Duplicate websites never create two listings · pending until paid · duplicated webhook credits once · cumulative out-of-order increments · `standingBidReachedAt` re-stamped · hidden listings stay hidden · exactly one activity event · failed payment creates none · stats |
| `webhook.test.ts` | Missing headers → 400 · bad signature → 401 and nothing credited · valid event credits · repeated delivery is idempotent · failed payment publishes nothing · unknown metadata ignored |
| `spotlight.test.ts` | Hold blocks a second buyer · slots independent · hold released on failure · exactly 24 hours · idempotent activation · overlapping ownership refused and flagged for refund · re-rentable after expiry |
| `today.test.ts` | Recent payment counted · dropped at exactly 24h · summed within the window · All-time unaffected · history never mutated · ordering |
| `clicks.test.ts` | Click recorded and redirect still succeeds · per-source counters · invalid source falls back · hidden and unknown listings redirect home without counting |
| `url.test.ts` | Tracking/`www`/scheme/trailing-slash variants collapse to one identity · distinct paths stay distinct · `javascript:`/`data:` rejected · shorteners rejected |
| `bio.test.ts` | The optional bio: 30 words accepted · 31 rejected · whitespace collapsed · markup rejected |
| `money.test.ts` | Integer-cent parsing · no floating-point drift · malformed input rejected · round-trips |
| `moderation.test.ts` | Blocked hosts · social profiles rejected · spam and superlative bios rejected · ordinary bios pass |
| `pagination.test.ts` | 50 per page with nobody dropped or repeated · out-of-range pages clamped · empty board is one page |
| `format.test.ts` | Never "1 minutes ago" · relative time across the scale · 24-hour countdown formatting · initials · "an executive coach" not "a executive coach" |

---

## 15. Production deployment

Deployed with **Firebase App Hosting**, in the same `corporate-gupshup` project as the
`coachrank` Firestore database.

```bash
npm run check                                   # lint + typecheck + 100 tests + build
firebase deploy --only firestore:coachrank      # rules + indexes, coachrank database only
```

### One-time App Hosting setup

**1. Push the repo to GitHub.** App Hosting deploys from a branch, not from your laptop.

**2. Create the backend.**

```bash
firebase use corporate-gupshup
firebase apphosting:backends:create --project corporate-gupshup
```

Answer the prompts: pick a region (**match the Firestore database — `nam5` means a US
region such as `us-central1`**, or every request pays a cross-continent round trip), connect
your GitHub repo, choose the branch to deploy from, and set the root directory to `/`.
Rollouts then happen automatically on every push to that branch.

**3. Create the three secrets.** `apphosting.yaml` references them by name; the values never
enter the repo.

```bash
firebase apphosting:secrets:set DODO_PAYMENTS_API_KEY
firebase apphosting:secrets:set DODO_PAYMENTS_WEBHOOK_KEY
firebase apphosting:secrets:set DODO_BID_PRODUCT_ID
firebase apphosting:secrets:set ADMIN_EMAILS       # e.g. you@example.com
```

**4. Check `apphosting.yaml`** — it is committed and already carries the public Firebase web
config, `FIREBASE_DATABASE_ID=coachrank`, `ADMIN_EMAILS` and `DODO_PAYMENTS_ENVIRONMENT`.
Two things in it matter more than they look:

- `NEXT_PUBLIC_*` are `availability: [BUILD, RUNTIME]`. Next.js inlines them into the browser
  bundle at build time — runtime-only would ship an empty client Firebase config and silently
  break the live activity feed and admin sign-in.
- **No service-account JSON anywhere.** App Hosting runs on Cloud Run and supplies
  Application Default Credentials; `src/lib/firebase/admin.ts` detects that and uses them.
  Storing a key would be both unnecessary and a liability.

**5. Push, and watch the first rollout.**

```bash
git push origin main
firebase apphosting:backends:list           # find the live URL
```

You get a URL like `https://coachrank--corporate-gupshup.<region>.hosted.app`. Open it and
confirm the board renders.

**6. Grant the backend access to the named database.** The App Hosting service account needs
Firestore access to the `coachrank` database. It usually inherits this from the project's
default Firebase permissions; if reads fail with `PERMISSION_DENIED`, grant
`roles/datastore.user` to the backend's service account in the Google Cloud console under
IAM.

### Rollbacks and logs

```bash
firebase apphosting:rollouts:list --backend coachrank
firebase apphosting:backends:get coachrank
```

Logs live in the Firebase console under App Hosting → your backend → Logs, and the webhook
prints one line per delivery (`[dodo-webhook] bid <id> -> credited`), which is the fastest way
to confirm payments are landing.

### Connecting coachrank.lol (bought at GoDaddy)

**1. Add the domain in Firebase.** Console → **App Hosting** → **Settings → Domains → Add
custom domain**, then enter `coachrank.lol`. Firebase will offer `www.coachrank.lol` too —
take it, with `www` redirecting to the apex.

> **Check the backend selector first.** A Firebase project can host several App Hosting
> backends, and the Settings page shows whichever one is selected in the dropdown beside
> **Backend** at the top. If the project also runs another site, adding the domain while the
> wrong backend is selected points coachrank.lol at that other app. Confirm the dropdown
> reads `coachrank` before clicking Add.

**2. Firebase shows you the records to create.** There are usually two rounds: first a `TXT`
record to prove you own the domain, then the `A` records that point traffic at Firebase. Read
the values off your own screen — they are per-project and change.

| Round | Type | Name | Value |
| --- | --- | --- | --- |
| Verify | `TXT` | `@` | the `google-site-verification=…` string Firebase shows |
| Serve | `A` | `@` | the two IPs Firebase lists (usually `199.36.158.100` and one more) |
| Serve | `CNAME` | `www` | the target Firebase gives for the `www` host |

**3. Enter them at GoDaddy.** Sign in → **My Products → Domains → coachrank.lol → DNS →
Manage DNS**.

- Delete GoDaddy's parking records first: the `A` on `@` pointing at a `Parked` /
  `WebsiteBuilder` IP, and any `CNAME` on `www` pointing at `_domainconnect`. **Leave `MX`
  and mail-related `TXT` records alone.**
- Add the `TXT` record, save, and click **Verify** in Firebase. This can take a few minutes.
- Once verified, add the `A` records (and the `www` `CNAME`), TTL 1 hour.

**4. Wait for the certificate.** Firebase provisions TLS automatically once DNS resolves —
usually under an hour, occasionally up to 24. The console shows the status. Check from a
terminal:

```bash
dig +short coachrank.lol
dig +short www.coachrank.lol
curl -sI https://coachrank.lol | head -1
```

**5. Point the app at the live origin.** In `apphosting.yaml` set

```yaml
  - variable: NEXT_PUBLIC_SITE_URL
    value: https://coachrank.lol
    availability: [BUILD, RUNTIME]
```

then commit and push. This drives canonical URLs, the sitemap, OG images and the `return_url`
sent to Dodo — a stale value quietly returns buyers to the wrong host after checkout.

**6. Update the two places that hard-code the origin:**

- **Dodo** → Developer → Webhooks → set the endpoint to
  `https://coachrank.lol/api/webhooks/dodo`.
- **Firebase** → Authentication → Settings → **Authorized domains** → add `coachrank.lol`,
  or admin sign-in is rejected on the live site.

**Checklist before the first real payment:**

- [ ] `NEXT_PUBLIC_SITE_URL` is the real HTTPS origin
- [ ] Firestore rules and indexes deployed
- [ ] `DODO_PAYMENTS_ENVIRONMENT=live_mode` and a live API key
- [ ] Webhook endpoint registered at the production URL, secret in `DODO_PAYMENTS_WEBHOOK_KEY`
- [ ] `ADMIN_EMAILS` set and the Firebase Auth user created
- [ ] A test-mode payment completed end to end (listing published, rank correct, activity event
      appeared, Today updated)
- [ ] No demo data present — `listings` should be empty at launch

---

## 16. Operational notes

**Rate limiting is per-process.** `src/lib/api.ts` uses an in-memory fixed-window limiter. It blunts
casual abuse of the public write endpoints; it does **not** coordinate across instances. On a
multi-instance deployment, put a shared limiter (Upstash, Cloudflare) in front, or run the write
routes on a single region.

**Ranking reads.** `getRankedBoard()` pulls up to 1,000 active listings in one ordered query and
ranks them in memory — one read instead of N aggregations, correct at launch scale. Individual
ranks (rank pages, webhook processing) always use Firestore count aggregations, so they stay exact
beyond that window. If the board ever passes ~1,000 listings, paginate `getRankedBoard` with cursors
rather than raising the limit.

**Presence** writes one Firestore document per visitor per 45 seconds and counts documents seen in
the last 75 seconds. It is a real measurement, not an estimate. If it becomes expensive, set
`NEXT_PUBLIC_ENABLE_PRESENCE=false` — the stats pill simply omits that segment rather than showing
a made-up number.

**Favicons** are fetched server-side by `/api/icon` from public favicon services, validated by
content type and size, and cached for a week; on any failure it returns a generated initials SVG at
the same dimensions. The visitor's browser never contacts a third party, and a broken image can
never appear.

**`/r/[slug]` is both the share page and the detail page.** Keeping them as one URL avoids
duplicate content and gives every share a single canonical destination.

**No fake anything.** There is no code path that fabricates a coach, a visitor, a bid, an activity
event, revenue, a click or a Spotlight booking. Every number on the site is a counter, and where a
figure is genuinely unavailable the UI omits that segment instead of inventing one.
