#!/usr/bin/env node
/**
 * LOCAL WEBHOOK SENDER — for development against the Firestore emulator.
 *
 * Dodo only calls a public URL, so this reproduces a signed delivery locally: it creates a
 * pending payment exactly as /api/bid/checkout would, signs a `payment.succeeded` body with
 * the Standard Webhooks algorithm using DODO_PAYMENTS_WEBHOOK_KEY, and POSTs it to the app.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/dev-webhook.mjs --website sarahchen.example.com --amount 25
 *   ... --tampered          send a bad signature and confirm it is rejected
 *   ... --deliveries 5      prove idempotency
 *   ... --base http://localhost:3001
 */

import { readFileSync } from "node:fs";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Webhook } from "standardwebhooks";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("\nRefusing to run: this tool is for the Firestore emulator only.\n");
  process.exit(1);
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}
const flag = (name) => process.argv.includes(`--${name}`);

// Read DODO_PAYMENTS_WEBHOOK_KEY from the environment or .env.local.
function webhookKey() {
  if (process.env.DODO_PAYMENTS_WEBHOOK_KEY) return process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DODO_PAYMENTS_WEBHOOK_KEY="));
    return line?.slice("DODO_PAYMENTS_WEBHOOK_KEY=".length).trim() ?? "";
  } catch {
    return "";
  }
}

const SECRET = webhookKey();
if (!SECRET) {
  console.error("\nDODO_PAYMENTS_WEBHOOK_KEY is not set (env or .env.local).\n");
  process.exit(1);
}

const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const WEBSITE = arg("website", null);
const AMOUNT_CENTS = Math.round(Number(arg("amount", "25")) * 100);
const DELIVERIES = Number(arg("deliveries", "1"));
const TAMPERED = flag("tampered");

const app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "coachrank-local" });
const db = getFirestore(app);

async function findListing() {
  if (WEBSITE) {
    const snap = await db.collection("listings").where("normalizedWebsite", "==", WEBSITE).limit(1).get();
    if (!snap.empty) return snap.docs[0];
    console.error(`No listing with normalizedWebsite "${WEBSITE}".`);
    process.exit(1);
  }
  const pending = await db.collection("listings").where("status", "==", "pending").limit(1).get();
  if (!pending.empty) return pending.docs[0];
  const any = await db.collection("listings").limit(1).get();
  if (any.empty) {
    console.error("No listings at all. Run `npm run seed` or submit one through the form first.");
    process.exit(1);
  }
  return any.docs[0];
}

const listingDoc = await findListing();
const listing = listingDoc.data();

const paymentRef = db.collection("bidPayments").doc();
await paymentRef.set({
  listingId: listingDoc.id,
  incrementCents: AMOUNT_CENTS,
  previousStandingBidCents: listing.standingBidCents ?? 0,
  intendedStandingBidCents: (listing.standingBidCents ?? 0) + AMOUNT_CENTS,
  resultingStandingBidCents: null,
  dodoPaymentId: null,
  dodoSessionId: "cks_dev_local",
  status: "pending",
  publishedListing: false,
  createdAt: Timestamp.now(),
  paidAt: null,
});

const dodoPaymentId = `pay_dev_${paymentRef.id}`;
const body = JSON.stringify({
  business_id: "biz_dev_local",
  type: "payment.succeeded",
  timestamp: new Date().toISOString(),
  data: {
    payload_type: "Payment",
    payment_id: dodoPaymentId,
    total_amount: AMOUNT_CENTS,
    currency: "USD",
    status: "succeeded",
    created_at: new Date().toISOString(),
    metadata: {
      cr_payment_id: paymentRef.id,
      cr_kind: "bid",
      cr_listing_id: listingDoc.id,
      cr_amount_cents: AMOUNT_CENTS,
    },
  },
});

const webhookId = `msg_dev_${paymentRef.id}`;
const timestamp = new Date();
const signature = new Webhook(SECRET.replace(/^whsec_/, "")).sign(webhookId, timestamp, body);

const headers = {
  "Content-Type": "application/json",
  "webhook-id": webhookId,
  "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  "webhook-signature": TAMPERED ? "v1,ZGVmaW5pdGVseW5vdHRoZXNpZ25hdHVyZQ==" : signature,
};

console.log(
  `\n${listing.name} · standing bid $${(listing.standingBidCents ?? 0) / 100} · charging $${AMOUNT_CENTS / 100}` +
    `${TAMPERED ? " · TAMPERED SIGNATURE" : ""}`,
);

for (let i = 1; i <= DELIVERIES; i += 1) {
  const response = await fetch(`${BASE}/api/webhooks/dodo`, { method: "POST", headers, body });
  console.log(`  delivery ${i}: HTTP ${response.status} ${await response.text()}`);
}

const after = (await listingDoc.ref.get()).data();
const payment = (await paymentRef.get()).data();
const events = await db.collection("activityEvents").where("listingId", "==", listingDoc.id).get();

console.log(`\n  listing   ${after.name} · ${after.status} · $${after.standingBidCents / 100}`);
console.log(
  `  payment   ${payment.status} · charged $${payment.incrementCents / 100} · resulting $${
    payment.resultingStandingBidCents === null ? "—" : payment.resultingStandingBidCents / 100
  } · rank #${payment.resultingOverallRank ?? "—"}`,
);
console.log(`  activity  ${events.size} event(s) for this listing\n`);
process.exit(0);
