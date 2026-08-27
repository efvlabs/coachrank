#!/usr/bin/env node
/**
 * LOCAL DEMO SEED - never for production.
 *
 * Creates clearly-labelled demo coaches, payments, activity events, a Spotlight booking
 * and blog articles so the whole product can be exercised offline. Every demo website is
 * a *.example.com host so demo rows can never be mistaken for real listings.
 *
 * It refuses to run unless it is pointed at the Firestore emulator, or you pass --force
 * with a non-production DODO_PAYMENTS_ENVIRONMENT.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed-demo.mjs
 *   node scripts/seed-demo.mjs --clear     # wipe demo data first
 */

import { createHash } from "node:crypto";
import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const CLEAR = args.has("--clear");

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const isLive = process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode";

if (!usingEmulator && !FORCE) {
  console.error(
    "\nRefusing to seed: FIRESTORE_EMULATOR_HOST is not set.\n" +
      "Run the emulator (npm run emulators) or pass --force if you really mean a real project.\n",
  );
  process.exit(1);
}
if (isLive) {
  console.error("\nRefusing to seed: DODO_PAYMENTS_ENVIRONMENT is live_mode.\n");
  process.exit(1);
}

// --- Firebase ---------------------------------------------------------------
function credentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json);
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
  };
}

const serviceAccount = credentials();
const projectId = serviceAccount?.projectId || process.env.FIREBASE_PROJECT_ID || "coachrank-local";
const app = serviceAccount
  ? initializeApp({ credential: cert(serviceAccount), projectId })
  : initializeApp({ projectId });
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const HOUR = 60 * 60 * 1000;
const DOLLAR = 100;
const now = Date.now();

const listingId = (website) => createHash("sha256").update(website).digest("hex").slice(0, 24);

/** name, host, category, bio, and the payment history that produced their standing bid. */
const COACHES = [
  {
    name: "Sarah Chen",
    host: "sarahchen.example.com",
    category: "business",
    bio: "I help founder-led companies install predictable sales systems without building bloated teams.",
    payments: [
      { cents: 500 * DOLLAR, hoursAgo: 96 },
      { cents: 10 * DOLLAR, hoursAgo: 2 },
    ],
    clicks: 1482,
  },
  {
    name: "Alex Moore",
    host: "alexmoore.example.com",
    category: "sports",
    bio: "Endurance coach. I rebuild training weeks around recovery so athletes stop plateauing in season three.",
    payments: [
      { cents: 300 * DOLLAR, hoursAgo: 70 },
      { cents: 120 * DOLLAR, hoursAgo: 5 },
    ],
    clicks: 640,
  },
  {
    name: "Priya Shah",
    host: "priyashah.example.com",
    category: "life",
    bio: "Twenty years of practice, one question: what would you do if the next decision were reversible?",
    payments: [
      { cents: 200 * DOLLAR, hoursAgo: 60 },
      { cents: 41 * DOLLAR, hoursAgo: 9 },
    ],
    clicks: 388,
  },
  {
    name: "Daniel Okafor",
    host: "danielokafor.example.com",
    category: "executive",
    bio: "I coach first-time VPs through the year where managing managers stops resembling anything they did before.",
    payments: [{ cents: 175 * DOLLAR, hoursAgo: 40 }],
    clicks: 212,
  },
  {
    name: "Mia Lindqvist",
    host: "mialindqvist.example.com",
    category: "startup-founder",
    bio: "Pre-seed to Series A. Mostly I help founders decide what not to build this quarter.",
    payments: [
      { cents: 90 * DOLLAR, hoursAgo: 30 },
      { cents: 30 * DOLLAR, hoursAgo: 18 },
    ],
    clicks: 428,
  },
  {
    name: "Tom Reyes",
    host: "tomreyes.example.com",
    category: "health-wellness",
    bio: "Operations coach for agencies between ten and fifty people, where the founder is still the bottleneck.",
    payments: [{ cents: 75 * DOLLAR, hoursAgo: 26 }],
    clicks: 156,
  },
  {
    name: "Hannah Boateng",
    host: "hannahboateng.example.com",
    category: "career",
    bio: "Career changes in your forties. Practical, unsentimental, and mostly about money and time.",
    payments: [{ cents: 51 * DOLLAR, hoursAgo: 22 }],
    clicks: 97,
  },
  {
    name: "Yuki Tanaka",
    host: "yukitanaka.example.com",
    category: "sports",
    bio: "Youth tennis. Technique first, tournaments second, and nobody burns out before eighteen.",
    payments: [{ cents: 33 * DOLLAR, hoursAgo: 14 }],
    clicks: 64,
  },
  {
    name: "Marcus Bell",
    host: "marcusbell.example.com",
    category: "leadership",
    bio: "I run difficult conversations rehearsals for leadership teams that keep avoiding the same decision.",
    payments: [{ cents: 20 * DOLLAR, hoursAgo: 11 }],
    clicks: 41,
  },
  {
    name: "Ines Duarte",
    host: "inesduarte.example.com",
    category: "startup-founder",
    bio: "Solo founders only. Two calls a month, one page of notes, no frameworks with acronyms.",
    payments: [{ cents: 5 * DOLLAR, hoursAgo: 6 }],
    clicks: 12,
  },
];

const POSTS = [
  {
    slug: "how-much-does-a-business-coach-cost",
    title: "How Much Does a Business Coach Cost?",
    excerpt:
      "Real ranges for one-to-one business coaching, what changes the price, and how to tell whether a quote is reasonable for what you actually need.",
    ctaCategory: "business",
    seoTitle: "How Much Does a Business Coach Cost? (Real Ranges)",
    metaDescription:
      "What business coaching actually costs per session, per month and per engagement - plus the five factors that move the price.",
    markdownBody: `Most people asking this question have already had one number quoted at them and no idea whether it was sane. So here are ranges, then the things that move them.

## The ranges

Business coaching is usually sold in one of three shapes.

**Per session.** Typically $150-$500 an hour for an independent coach working with small businesses, and $500-$1,500 for coaches who work mainly with companies past a few million in revenue. Below about $100 you are usually buying group content with a call attached.

**Monthly retainer.** $500-$2,500 a month is the common band for two calls a month plus messaging between them. Retainers at $3,000+ normally include something structural - sitting in on your leadership meeting, reviewing numbers, talking to your team.

**Fixed engagement.** A three- or six-month programme with a defined outcome, usually $3,000-$15,000. This is where most of the "install a sales system" or "get out of the day-to-day" work sits.

## What actually moves the price

1. **Who they normally work with.** A coach whose clients are $20m businesses charges accordingly, and will not be cheaper for you just because you are smaller.
2. **Whether they do the work or only ask the questions.** Pure coaching is cheaper than coaching plus consulting. Be clear which you are buying.
3. **Access between calls.** Unlimited messaging is a real cost to them and is priced in.
4. **Group versus one-to-one.** Group programmes run 60-80% cheaper and are a genuinely good fit for common problems.
5. **Their alternative.** Coaches who still run an operating business price their time against it.

## How to sanity-check a quote

Ask what a specific outcome would look like in ninety days, and what they would do in the first three sessions. A coach who cannot answer that concretely is charging for their calendar, not their judgement.

Then work out what the outcome is worth. If the honest answer is "one more retained client pays for the quarter", the price question mostly resolves itself. If you cannot connect the engagement to anything measurable, the price is not the problem - the brief is.

## What coaching does not cost

It does not cost you a percentage of your business. Be wary of equity or revenue-share arrangements with anyone whose contribution is advice you could stop taking at any time.`,
  },
  {
    slug: "business-coach-vs-consultant",
    title: "Business Coach vs Consultant: Which One Do You Actually Need?",
    excerpt:
      "The difference is not seniority or price. It is who is holding the pen - and getting that wrong is the most common way this money gets wasted.",
    ctaCategory: "business",
    seoTitle: "Business Coach vs Consultant - The Practical Difference",
    metaDescription:
      "Coaches build your capability; consultants deliver a result. How to tell which one your problem needs, and what to do when you need both.",
    markdownBody: `The distinction gets muddled because plenty of good practitioners do both. But the underlying difference is simple, and it decides which one you should hire.

## Who holds the pen

**A consultant holds the pen.** You have a problem, they produce the answer - the pricing model, the org design, the go-to-market plan. You are buying a deliverable and the expertise behind it.

**A coach hands you the pen.** You have a problem, and they improve your ability to solve this one and the next four like it. You are buying capability.

Everything else follows from that.

## Which your problem needs

Hire a **consultant** when:

- the problem is technical and you lack the expertise in-house
- it is one-off, and building the skill internally has no residual value
- you need it done by a date and cannot be the constraint
- the answer is knowable and someone has the answer

Hire a **coach** when:

- the problem is recurring and the pattern is yours
- you know roughly what to do and are not doing it
- the bottleneck is a decision only you can make
- the same issue keeps returning under different names

## The tell

If you can describe the deliverable, you want a consultant. If you can only describe the frustration, you probably want a coach.

## When you need both

Often you do, sequentially. A consultant builds the compensation plan; a coach works on why you avoid the conversations it requires. Buying them in the wrong order is the usual failure: people hire a consultant to produce a strategy they were never going to execute, or hire a coach to talk them through a problem that needed a specialist for a fortnight.

## A note on mentors

A mentor is a third thing: someone further along the same path who gives you their opinion, usually informally and usually for free. Mentors are excellent and unaccountable. Do not expect a mentor to hold you to anything - that is what you are paying a coach for.`,
  },
  {
    slug: "how-to-choose-a-startup-coach",
    title: "How to Choose a Startup Coach",
    excerpt:
      "Six questions worth asking, two answers that should end the conversation, and why the first ninety days matter more than the credentials.",
    ctaCategory: "startup-founder",
    seoTitle: "How to Choose a Startup Coach - A Founder's Checklist",
    metaDescription:
      "How to evaluate a startup or founder coach: the questions to ask, the red flags, and how to structure a trial that tells you something.",
    markdownBody: `Founder coaching is unregulated, which means the label tells you nothing. Here is how to evaluate one in a single conversation.

## Six questions

**1. Who are your last three clients, at what stage, and what were we working on?**
Vagueness here is the strongest negative signal there is. You are not asking for names - you are asking whether the work is real.

**2. What do you do when a founder does not do the thing they said they would?**
Everyone has an answer. You want one that involves changing the plan rather than repeating it more firmly.

**3. What are you not good at?**
A coach who has been doing this a while knows exactly which founders they are wrong for. One who says "I work with everyone" has not paid attention.

**4. What does the first ninety days look like?**
You want specifics - what happens in session one, what you will have by session six. Not a methodology diagram.

**5. Have you run a company?**
Not required, and not sufficient. But it changes the kind of coach they are, and you should know which kind you are hiring.

**6. How do we end this?**
Good coaches have an exit in mind. Indefinite retainers with no defined outcome tend to drift.

## Two answers that should end it

- **A guaranteed outcome.** Nobody can guarantee your fundraise, your hire or your revenue. A guarantee means either fine print or dishonesty.
- **Equity in exchange for coaching.** Advice you can stop taking at will should not carry a permanent claim on your company.

## Structure a trial

Buy three sessions, not six months. Agree in advance what would make you continue. Notice whether you leave sessions with a decision or with a feeling - both are legitimate, but you should know which one you are paying for.

## On credentials

ICF and similar accreditations tell you someone completed a training programme and has logged hours. That is a real floor and a weak ceiling. Plenty of excellent founder coaches have no accreditation, and plenty of accredited coaches have never sat with someone deciding whether to shut down. Weigh it as one input.`,
  },
];

async function clearDemoData() {
  const collections = [
    "listings",
    "bidPayments",
    "activityEvents",
    "spotlightBookings",
    "spotlightSlots",
    "blogPosts",
    "stats",
    "processedWebhooks",
    "presence",
  ];
  for (const name of collections) {
    const snap = await db.collection(name).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  cleared ${snap.size} from ${name}`);
  }
}

async function seed() {
  console.log(`\nSeeding DEMO data into project "${projectId}"${usingEmulator ? " (emulator)" : ""}.`);

  if (CLEAR) {
    console.log("\nClearing existing data…");
    await clearDemoData();
  }

  let leaderboardRevenueCents = 0;
  let outboundClicks = 0;

  for (const coach of COACHES) {
    const normalizedWebsite = coach.host;
    const id = listingId(normalizedWebsite);
    const slug = `${coach.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-demo`;

    const ordered = [...coach.payments].sort((a, b) => b.hoursAgo - a.hoursAgo);
    const standingBidCents = ordered.reduce((sum, p) => sum + p.cents, 0);
    const lastPaidAt = now - ordered[ordered.length - 1].hoursAgo * HOUR;

    await db.collection("listings").doc(id).set({
      name: coach.name,
      slug,
      normalizedWebsite,
      displayWebsite: `https://${coach.host}`,
      category: coach.category,
      bio: coach.bio,
      standingBidCents,
      standingBidReachedAt: Timestamp.fromMillis(lastPaidAt),
      totalClicks: coach.clicks,
      clicksBySource: { leaderboard: coach.clicks },
      status: "active",
      createdAt: Timestamp.fromMillis(now - ordered[0].hoursAgo * HOUR),
      updatedAt: Timestamp.fromMillis(lastPaidAt),
    });

    let running = 0;
    for (const [index, payment] of ordered.entries()) {
      const paidAt = now - payment.hoursAgo * HOUR;
      const previous = running;
      running += payment.cents;
      leaderboardRevenueCents += payment.cents;

      const paymentId = `demo_${id.slice(0, 8)}_${index}`;
      await db.collection("bidPayments").doc(paymentId).set({
        listingId: id,
        incrementCents: payment.cents,
        previousStandingBidCents: previous,
        intendedStandingBidCents: running,
        resultingStandingBidCents: running,
        dodoPaymentId: `demo_pay_${paymentId}`,
        dodoSessionId: null,
        status: "paid",
        publishedListing: index === 0,
        createdAt: Timestamp.fromMillis(paidAt - 60_000),
        paidAt: Timestamp.fromMillis(paidAt),
      });
    }

    outboundClicks += coach.clicks;
    console.log(`  ${coach.name.padEnd(18)} $${(standingBidCents / 100).toString().padStart(6)}`);
  }

  // Activity events, ranked against the final board.
  const boardSnap = await db
    .collection("listings")
    .where("status", "==", "active")
    .orderBy("standingBidCents", "desc")
    .orderBy("standingBidReachedAt", "asc")
    .get();
  const board = boardSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rankOf = (id) => board.findIndex((l) => l.id === id) + 1;
  const categoryRankOf = (id, category) =>
    board.filter((l) => l.category === category).findIndex((l) => l.id === id) + 1;

  const paymentsSnap = await db
    .collection("bidPayments")
    .where("status", "==", "paid")
    .orderBy("paidAt", "desc")
    .limit(20)
    .get();

  for (const doc of paymentsSnap.docs) {
    const payment = doc.data();
    const listing = board.find((l) => l.id === payment.listingId);
    if (!listing) continue;
    await db.collection("activityEvents").doc(doc.id).set({
      type: "bid",
      listingId: listing.id,
      listingSlug: listing.slug,
      coachName: listing.name,
      category: listing.category,
      displayWebsite: listing.displayWebsite,
      paymentIncrementCents: payment.incrementCents,
      resultingStandingBidCents: payment.resultingStandingBidCents,
      resultingOverallRank: rankOf(listing.id),
      resultingCategoryRank: categoryRankOf(listing.id, listing.category),
      createdAt: payment.paidAt,
    });
  }
  console.log(`  ${paymentsSnap.size} activity events`);

  // One occupied Premium Spotlight with hours left on the clock.
  const spotlightListing = board[1] ?? board[0];
  const startsAt = now - 17 * HOUR;
  const endsAt = startsAt + 24 * HOUR;
  await db.collection("spotlightBookings").doc("demo_spotlight_premium").set({
    listingId: spotlightListing.id,
    slot: "premium",
    priceCents: 9900,
    startsAt: Timestamp.fromMillis(startsAt),
    endsAt: Timestamp.fromMillis(endsAt),
    totalClicks: 183,
    dodoPaymentId: "demo_pay_spotlight",
    dodoSessionId: null,
    status: "active",
    createdAt: Timestamp.fromMillis(startsAt),
  });
  await db.collection("spotlightSlots").doc("premium").set({
    activeBookingId: "demo_spotlight_premium",
    endsAt: Timestamp.fromMillis(endsAt),
    holdBookingId: null,
    holdExpiresAt: null,
  });
  console.log(`  premium spotlight: ${spotlightListing.name}`);

  for (const [index, post] of POSTS.entries()) {
    await db.collection("blogPosts").doc(`demo_post_${index}`).set({
      ...post,
      status: "published",
      publishedAt: Timestamp.fromMillis(now - (index + 1) * 3 * 24 * HOUR),
      updatedAt: Timestamp.fromMillis(now - (index + 1) * 3 * 24 * HOUR),
      createdAt: Timestamp.fromMillis(now - (index + 1) * 3 * 24 * HOUR),
    });
  }
  console.log(`  ${POSTS.length} blog posts`);

  await db.collection("stats").doc("site").set({
    visitors: 12_431,
    outboundClicks,
    listedCoaches: COACHES.length,
    leaderboardRevenueCents,
    spotlightRevenueCents: 9900,
  });

  await db.collection("settings").doc("pricing").set({
    minNewBidCents: 500,
    topPositionIncrementCents: 500,
    standardIncrementCents: 500,
    premiumSpotlightCents: 9900,
    standardSpotlightCents: 9900,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(
    `\nDone. ${COACHES.length} demo coaches, $${(leaderboardRevenueCents / 100).toLocaleString()} on the board.\n`,
  );
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nSeed failed:", error);
    process.exit(1);
  });
