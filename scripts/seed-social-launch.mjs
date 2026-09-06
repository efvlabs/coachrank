/** Create the reviewed private launch drafts and research notebook. Never posts externally.
 * Local: node --env-file=.env.local scripts/seed-social-launch.mjs
 * Production: node scripts/seed-social-launch.mjs --project corporate-gupshup --database coachrank --account <authorized-account>
 * Existing IDs are preserved, including edited and archived records.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(`--${name}`); return index < 0 ? undefined : args[index + 1]; };
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const project = emulator ? process.env.FIREBASE_PROJECT_ID : option("project");
const database = emulator ? process.env.FIREBASE_DATABASE_ID || "(default)" : option("database");
if (emulator ? project !== "coachrank-local" : project !== "corporate-gupshup" || database !== "coachrank" || !option("account")) throw new Error("Select CoachRank's database and account explicitly.");
const app = emulator ? initializeApp({ projectId: project }) : null;
const db = app ? getFirestore(app, database) : null;
const token = emulator ? null : execFileSync("gcloud", ["auth", "print-access-token", `--account=${option("account")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 }).trim();
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents/socialRecords`;
const records = JSON.parse(readFileSync(new URL("../content/social-launch.json", import.meta.url), "utf8"));
let created = 0, preserved = 0;
for (const input of records) {
  if (!["draft", "research"].includes(input.status) || input.completedDate || !input.id.startsWith("launch-2026-09-")) throw new Error("The launch pack must contain only drafts and research.");
  const record = { ...input, revision: 1, createdAtMs: Date.now(), updatedAtMs: Date.now() };
  if (db) {
    try { await db.collection("socialRecords").doc(record.id).create(record); created++; }
    catch (error) { if (error.code === 6) preserved++; else throw error; }
  } else {
    const fields = Object.fromEntries(Object.entries(record).map(([key, value]) => [key, typeof value === "number" ? { integerValue: String(value) } : { stringValue: value }]));
    const response = await fetch(`${root}?documentId=${encodeURIComponent(record.id)}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }), signal: AbortSignal.timeout(20000) });
    if (response.status === 409) preserved++;
    else if (response.ok) created++;
    else throw new Error(`Could not create launch record (${response.status}).`);
  }
}
console.log(JSON.stringify({ project, database, created, preserved, externalPostsSent: 0, accountsFollowed: 0 }));
if (app) await app.delete();
