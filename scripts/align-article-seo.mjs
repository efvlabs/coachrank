/** Align reviewed article copy. Dry-run by default; --apply writes only changed fields.
 * node scripts/align-article-seo.mjs --account hi.towerrush@gmail.com [--apply]
 * Only corporate-gupshup/coachrank/blogPosts is accessible through this script.
 * Backups and the reviewed plan are saved locally before any writes. Writes use
 * updateTime preconditions so concurrent Editorial Desk edits cannot be lost.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const args = process.argv.slice(2);
const accountIndex = args.indexOf("--account");
const account = accountIndex >= 0 ? args[accountIndex + 1] : undefined;
if (!account || account.startsWith("--")) throw new Error("Provide an authorized gcloud --account.");
if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Run without emulator variables for this explicit production migration.");
const token = execFileSync("gcloud", ["auth", "print-access-token", `--account=${account}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const root = "projects/corporate-gupshup/databases/coachrank/documents";
const base = `https://firestore.googleapis.com/v1/${root}`;
const headers = { Authorization: `Bearer ${token}`, "content-type": "application/json" };
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const legacy = read("../content/blog/editorial-metadata.json");
const entries = [...read("../content/editorial-launch/manifest.json"), ...read("../content/editorial-edition-02/manifest.json"), ...legacy];
const reviewed = new Map(entries.map(entry => [entry.slug, entry]));
const legacySlugs = new Set(legacy.map(entry => entry.slug));
let page = "", docs = [];
do {
  const response = await fetch(`${base}/blogPosts?pageSize=300${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`, { headers });
  if (!response.ok) throw new Error(`Article read failed (${response.status}).`);
  const data = await response.json(); docs.push(...(data.documents || [])); page = data.nextPageToken || "";
} while (page);
function field(value) {
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)])) } };
}
const plan = [];
for (const doc of docs) {
  const current = doc.fields;
  const slug = current.slug.stringValue;
  const entry = reviewed.get(slug);
  const title = entry?.title || current.title.stringValue;
  const patch = { title, seoTitle: title };
  if (entry) patch.metaDescription = entry.metaDescription;
  if (legacySlugs.has(slug)) {
    for (const key of ["excerpt", "keyAnswer", "sources", "faqs"]) if (entry[key]) patch[key] = entry[key];
    patch.topic = "coaching";
    patch.authorName = current.authorName?.stringValue || "CoachRank Editorial";
    patch.authorUrl = current.authorUrl?.stringValue || "/about";
    patch.authorBio = current.authorBio?.stringValue || "An independent editorial for ambitious people. Celebrating greatness and understanding what builds it.";
  }
  const fields = Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, field(value)]).filter(([key, value]) => JSON.stringify(current[key]) !== JSON.stringify(value)));
  if (!Object.keys(fields).length) continue;
  fields.updatedAt = { timestampValue: new Date().toISOString() };
  plan.push({ name: doc.name, updateTime: doc.updateTime, slug, fields });
}
const folder = `tmp/seo-audit/${new Date().toISOString().replace(/[:.]/g, "-")}`;
mkdirSync(folder, { recursive: true });
writeFileSync(`${folder}/backup.json`, JSON.stringify(docs, null, 2), { mode: 0o600 });
writeFileSync(`${folder}/plan.json`, JSON.stringify(plan, null, 2), { mode: 0o600 });
console.log(`Audited ${docs.length} articles; ${plan.length} changes. Backup: ${folder}`);
for (const item of plan) console.log(`${item.slug}: ${Object.keys(item.fields).join(", ")}`);
if (args.includes("--apply") && plan.length) {
  // One atomic commit: either all unchanged revisions are updated or none are.
  if (plan.length > 450) throw new Error("Review a smaller migration before applying more than 450 changes.");
  const writes = plan.map(item => ({ update: { name: item.name, fields: item.fields }, updateMask: { fieldPaths: Object.keys(item.fields) }, currentDocument: { updateTime: item.updateTime } }));
  const response = await fetch(`${base}:commit`, { method: "POST", headers, body: JSON.stringify({ writes }) });
  if (!response.ok) throw new Error(`Article update failed (${response.status}). No changes committed. Refresh the audit before retrying.`);
  const result = await response.json();
  console.log(`Updated ${result.writeResults.length} articles. URLs and original publication dates preserved.`);
} else console.log("Dry run only. Add --apply to commit this reviewed migration.");
