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
const app=emulator ? initializeApp({projectId}) : null;
const db=app ? (databaseId==="(default)" ? getFirestore(app) : getFirestore(app,databaseId)) : null;
// Use an explicit account's short-lived access token without changing global ADC or
// exporting a service-account key. Firebase Admin's Firestore adapter does not accept
// arbitrary credential objects, so production publishing uses the Firestore REST API.
const accessToken=emulator ? null : account
  ? execFileSync("gcloud",["auth","print-access-token",`--account=${account}`],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim()
  : (await applicationDefault().getAccessToken()).access_token;
const documentsUrl=`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;
async function firestoreRequest(path,body) {
  const response=await fetch(documentsUrl+path,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
  if (!response.ok) throw new Error(`Firestore publication failed (${response.status}): ${await response.text()}`);
  return response.json();
}
function field(value) {
  if (value===null) return {nullValue:null};
  if (typeof value==="string") return {stringValue:value};
  if (typeof value==="boolean") return {booleanValue:value};
  if (typeof value==="number") return Number.isInteger(value) ? {integerValue:String(value)} : {doubleValue:value};
  if (value instanceof Timestamp) return {timestampValue:value.toDate().toISOString()};
  if (Array.isArray(value)) return {arrayValue:{values:value.map(field)}};
  return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,field(item)]))}};
}
const entries=JSON.parse(readFileSync(new URL("../content/editorial-launch/manifest.json",import.meta.url),"utf8"));
const publish=args.includes("--publish");

for (const entry of entries) {
  const body=readFileSync(new URL(`../content/editorial-launch/${entry.slug}.md`,import.meta.url),"utf8").trim();
  if (body.split(/\s+/).length<600 || !/^## /m.test(body) || !entry.keyAnswer || !entry.coverAlt || !entry.sources.length || !entry.faqs.length) throw new Error(`Incomplete launch article: ${entry.slug}`);
  const exists=db
    ? !(await db.collection("blogPosts").where("slug","==",entry.slug).limit(1).get()).empty
    : (await firestoreRequest(":runQuery",{structuredQuery:{from:[{collectionId:"blogPosts"}],where:{fieldFilter:{field:{fieldPath:"slug"},op:"EQUAL",value:{stringValue:entry.slug}}},limit:1}})).some(result=>result.document);
  if (exists) { console.log(`Preserved existing article: ${entry.slug}`); continue; }
  const now=Timestamp.now();
  const document={
    ...entry, markdownBody:body, authorName:"CoachRank Editorial", authorBio:"An independent editorial for ambitious people. Celebrating greatness and understanding what builds it.", authorUrl:"/about", coverCredit:"Original illustration created for CoachRank with AI assistance.", featured:entry.featured || false, noindex:false, ctaCategory:null,
    status:publish ? "published" : "draft", publishedAt:publish ? now : null, createdAt:now, updatedAt:now,
  };
  if (db) await db.collection("blogPosts").doc(`launch-${entry.slug}`).create(document);
  else await firestoreRequest(`/blogPosts?documentId=${encodeURIComponent(`launch-${entry.slug}`)}`,{fields:field(document).mapValue.fields});
  console.log(`${publish?"Published":"Drafted"}: ${entry.slug}`);
}
console.log(`Finished ${emulator?"local":"production"} editorial import (${projectId}/${databaseId}). Existing articles were preserved.`);
if (app) await app.delete();
