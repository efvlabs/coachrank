/** Publish the reviewed launch collection without replacing existing articles.
 * Local: node --env-file=.env.local scripts/publish-editorial-launch.mjs --publish
 * Production: node scripts/publish-editorial-launch.mjs --project corporate-gupshup --database coachrank --account <authorized-gcloud-account> --publish
 * Omitting --publish creates drafts. Only blogPosts in the selected database are written.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const option = (name) => { const index=args.indexOf(`--${name}`); return index<0 ? undefined : args[index+1]; };
const emulator=Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId=option("project") || (emulator ? process.env.FIREBASE_PROJECT_ID || "coachrank-local" : undefined);
const databaseId=option("database") || (emulator ? process.env.FIREBASE_DATABASE_ID || "(default)" : undefined);
if (!projectId || !databaseId) throw new Error("Specify the project and database explicitly for production.");
if (!emulator && (projectId!=="corporate-gupshup" || databaseId!=="coachrank")) throw new Error("This launch script targets only CoachRank's production database.");
const account=option("account");
const credential=account ? { getAccessToken:async()=>({access_token:execFileSync("gcloud",["auth","print-access-token",`--account=${account}`],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim(),expires_in:3000}) } : applicationDefault();
const app=initializeApp(emulator ? {projectId} : {projectId,credential});
const db=databaseId==="(default)" ? getFirestore(app) : getFirestore(app,databaseId);
const entries=JSON.parse(readFileSync(new URL("../content/editorial-launch/manifest.json",import.meta.url),"utf8"));
const publish=args.includes("--publish");

for (const entry of entries) {
  const body=readFileSync(new URL(`../content/editorial-launch/${entry.slug}.md`,import.meta.url),"utf8").trim();
  if (body.split(/\s+/).length<600 || !/^## /m.test(body) || !entry.keyAnswer || !entry.coverAlt || !entry.sources.length || !entry.faqs.length) throw new Error(`Incomplete launch article: ${entry.slug}`);
  const existing=await db.collection("blogPosts").where("slug","==",entry.slug).limit(1).get();
  if (!existing.empty) { console.log(`Preserved existing article: ${entry.slug}`); continue; }
  const now=Timestamp.now();
  await db.collection("blogPosts").doc(`launch-${entry.slug}`).create({
    ...entry, markdownBody:body, authorName:"CoachRank Editorial", authorBio:"An independent editorial for ambitious people. Celebrating greatness and understanding what builds it.", authorUrl:"/about", coverCredit:"Original illustration created for CoachRank with AI assistance.", featured:entry.featured || false, noindex:false, ctaCategory:null,
    status:publish ? "published" : "draft", publishedAt:publish ? now : null, createdAt:now, updatedAt:now,
  });
  console.log(`${publish?"Published":"Drafted"}: ${entry.slug}`);
}
console.log(`Finished ${emulator?"local":"production"} editorial import (${projectId}/${databaseId}). Existing articles were preserved.`);
await app.delete();
