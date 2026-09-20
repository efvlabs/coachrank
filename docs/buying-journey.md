# Buying journey measurement

The Studio Buying journey page at `/admin/journey` shows the last 30 days of journeys and orders. Measurement starts when this release is deployed. Existing traffic cannot be reconstructed.

## Events and authority

| Step | Evidence |
| --- | --- |
| Article view | Browser navigation to a currently published article |
| Product view | Browser navigation to `/tools/brand-clarity` |
| Sample view | Browser navigation to the public sample |
| Sign-in opened | Browser navigation to `/sign-in`, with all query parameters excluded |
| Sign-in completed | Server successfully verifies identity and creates the customer session |
| Checkout started | An order has a Dodo checkout session ID |
| Payment confirmed | Verified webhook or authenticated Dodo reconciliation records payment |
| Report completed | Server saves the first valid completed report on a paid order |

Page measurements are approximate. They are not proof of unique people and can be missed or automated. No browser endpoint accepts purchase or report-completion events. Repeat page views, webhook retries and retakes do not multiply the journey's reach count. The financial tiles count paid orders and exclude previews and reversals. The step tables retain a historical payment confirmation after a reversal. Unattributed paid orders remain in the financial tiles.

This is a reach report for a start-date cohort, not a strict sequential funnel. People can skip the article or sign-in screens. Orders started before the selected period are excluded even if payment arrives in it. Journeys and orders are independently capped at 5,000, with an explicit partial-results warning. Source and article counts are descriptive attribution, not proof that a channel caused the purchase.

## Attribution and privacy

The first recorded source is fixed for a 30-day cookie lifetime. An order stores the existing journey ID at checkout creation. Returning on a second device still credits that original journey because payment and report evidence comes from the order. Devices without the cookie, earlier orders and blocked measurement remain unattributed. Creating a new checkout after the cookie expires starts a new attribution opportunity.

Only known public page paths and published article slugs are accepted. Sources are broad categories. Campaign and content values are allowlisted in `src/lib/buying-journey.ts`. Unknown values are dropped. Never put email, customer ID, auth codes or other personal data in campaign links. No full referrer URL, query string, IP, email, user ID, answer or payment token is written to a journey record. Orders retain their separate required ownership and delivery data.

Admin sessions, explicit previews, Global Privacy Control, Do Not Track and the privacy-page opt-out suppress page tracking. The opt-out persists for one year. Existing paid-order and delivery records remain available. `buyingJourneys` is server-only under the existing default-deny Firestore rules. Its `expiresAt` timestamp sets retention to 90 days. The production TTL policy was enabled on September 20, 2026 and verified ACTIVE on `corporate-gupshup / coachrank / buyingJourneys`. Deletion is asynchronous.

## Campaign links

The first campaign is `first-sale-2026-09`. Approved post values: `x-positioning`, `x-audit`, `x-priorities`, `x-demo`, `reddit-positioning`, `reddit-audit`, `medium-brand-clarity`. Add reviewed campaign values to the allowlist when preparing a new campaign.

Example: `/blog/brand-audit-checklist-small-business?utm_source=reddit&utm_medium=social&utm_campaign=first-sale-2026-09&utm_content=reddit-audit`.

A visit remains credited to its first source for 30 days. Opening several campaign links in one browser will not simulate several independent acquisitions. Use isolated local browser sessions for attribution QA. Keep synthetic purchases in emulators or Dodo test mode, never in the live revenue ledger.

## Verification record

September 20, 2026:

- 238 automated tests passed, including browser-event rejection, publication checks, privacy exclusions, source preservation, order attribution, duplicate payment notifications, unpaid access, refunds and report retakes. Lint, type checking and production build passed.
- `scripts/verify-buyer-delivery.mjs` exercised real local Auth and Firestore emulators through the running application: email-link sign-in, unauthorized access rejection, signature rejection, a signed fixture notification, duplicate delivery, saved report, a 79,359-byte PDF and account recovery. All passed. The script refuses production projects and non-loopback targets. This is a simulated payment, not a real Dodo purchase.
- Local Studio was inspected at desktop width and 390px mobile width. Tables scroll within their container; the page did not overflow horizontally. A Chrome product visit and client-side sample navigation recorded the approved X campaign independently of the local Reddit delivery fixture.
- Live Dodo read-only checks confirmed a USD 900-cent one-time assessment, tax excluded, no discount, and an enabled webhook at the CoachRank endpoint. The required success, failure, cancellation, refund and dispute event types were present, and its signing key matched the configured Secret Manager secret. There were zero successful payments for this product at the check.
- Live Chrome successfully requested an email sign-in link to the user-designated `contact@coachrank.lol`. The in-app browser initially showed a network error. Inbox placement and visible sender still require the recipient's observation.
- A completed real Dodo transaction has not been performed. No production payment or entitlement has been manufactured.

For a repeat local exercise, start the app with `FIREBASE_DATABASE_ID=coachrank`, `DODO_PAYMENTS_API_KEY=local-test-no-remote`, `DODO_BRAND_CLARITY_PRODUCT_ID=brand-product`, and `PAYMENTS_ENABLED=false`, alongside Auth and Firestore emulators. Use a local webhook secret in `.env.local`, then run `node --env-file=.env.local scripts/verify-buyer-delivery.mjs`.

Production rollout and live measurement checks are recorded after deployment.
