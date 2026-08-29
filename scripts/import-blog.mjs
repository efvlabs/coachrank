/**
 * Loads content/blog/*.md into Firestore as DRAFT posts, so they can be edited and
 * published from /admin rather than written there.
 *
 * Re-running is safe: a post is matched on its slug and updated in place, never
 * duplicated, and a post you have already published is left alone.
 *
 *   Emulator:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/import-blog.mjs
 *   Production: gcloud auth application-default login
 *               node scripts/import-blog.mjs --project corporate-gupshup --database coachrank
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = flag("project", emulator ? "coachrank-local" : process.env.FIREBASE_PROJECT_ID);
const databaseId = flag("database", emulator ? "(default)" : "coachrank");

if (!projectId) {
  console.error("Pass --project, or set FIRESTORE_EMULATOR_HOST for the emulator.");
  process.exit(1);
}

const app = initializeApp(
  emulator ? { projectId } : { credential: applicationDefault(), projectId },
);
const db = databaseId === "(default)" ? getFirestore(app) : getFirestore(app, databaseId);

/** Minimal front-matter: `key: value` lines between two `---` fences. */
function parse(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("missing front matter");
  const meta = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    if (at > 0) meta[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return { meta, body: match[2].trim() };
}

const dir = join(process.cwd(), "content", "blog");
const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
console.log(`Importing ${files.length} posts into ${projectId}/${databaseId}\n`);

let created = 0;
let updated = 0;
let skipped = 0;

for (const file of files) {
  const { meta, body } = parse(readFileSync(join(dir, file), "utf8"));
  const slug = meta.slug;
  if (!slug) throw new Error(`${file}: no slug`);

  const existing = await db.collection("blogPosts").where("slug", "==", slug).limit(1).get();
  const now = Timestamp.now();

  const doc = {
    title: meta.title,
    slug,
    excerpt: meta.excerpt ?? "",
    markdownBody: body,
    seoTitle: meta.seoTitle ?? meta.title,
    metaDescription: meta.metaDescription ?? meta.excerpt ?? "",
    ctaCategory: meta.ctaCategory || null,
    updatedAt: now,
  };

  if (existing.empty) {
    await db.collection("blogPosts").add({
      ...doc,
      status: "draft",
      publishedAt: null,
      createdAt: now,
    });
    created += 1;
    console.log(`  + ${slug}`);
    continue;
  }

  const ref = existing.docs[0];
  if (ref.data().status === "published") {
    skipped += 1;
    console.log(`  = ${slug} (already published, left alone)`);
    continue;
  }
  await ref.ref.update(doc);
  updated += 1;
  console.log(`  ~ ${slug}`);
}

console.log(`\nDone. ${created} created, ${updated} updated, ${skipped} left alone.`);
console.log("Review and publish them at /admin/blog.");
process.exit(0);
