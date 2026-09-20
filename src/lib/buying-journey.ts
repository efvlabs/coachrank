/** Public measurement vocabulary. Never accept arbitrary event names or URL queries. */
export const JOURNEY_COOKIE = "cr_journey";
export const JOURNEY_DAYS = 30;
export const JOURNEY_STAGES = ["article_view", "product_view", "sample_view", "sign_in_view", "sign_in_completed", "checkout_started", "purchase_confirmed", "report_completed"] as const;
export type JourneyStage = typeof JOURNEY_STAGES[number];
export type BrowserStage = "article_view" | "product_view" | "sample_view" | "sign_in_view";
export const CAMPAIGNS = ["first-sale-2026-09"] as const;
export const CAMPAIGN_CONTENT = ["x-positioning", "x-audit", "x-priorities", "x-demo", "reddit-positioning", "reddit-audit", "medium-brand-clarity"] as const;
export type Journey = {
 id: string; startedAtMs: number; expiresAtMs: number; entryPath: string; firstArticle: string | null;
 source: string; medium: string; campaign: string; content: string;
 stages: Partial<Record<JourneyStage, number>>;
};
export function publicJourneyPage(value: unknown): { path: string; stage: BrowserStage | null } | null {
 if (typeof value !== "string" || value.length > 150 || /[?#%\\]/.test(value)) return null;
 if (/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return {path:value,stage:"article_view"};
 const pages: Record<string, BrowserStage | null> = {"/":null,"/tools":null,"/tools/brand-clarity":"product_view","/tools/brand-clarity/sample":"sample_view","/sign-in":"sign_in_view"};
 return Object.hasOwn(pages,value) ? {path:value,stage:pages[value]} : null;
}
export function referralSource(host: unknown) {
 if (typeof host !== "string" || host.length > 200) return "direct";
 const h=host.toLowerCase().replace(/^www\./, "");
 if (["x.com","twitter.com","t.co"].includes(h)) return "x";
 if (h === "reddit.com" || h.endsWith(".reddit.com") || h === "redd.it") return "reddit";
 if (h === "medium.com" || h.endsWith(".medium.com")) return "medium";
 if (/^(?:[a-z]+\.)?google\.(?:com|co\.[a-z]{2}|[a-z]{2})$/.test(h)) return "google";
 if (["bing.com","duckduckgo.com","linkedin.com"].includes(h)) return h.split(".")[0];
 return !h || ["coachrank.lol","localhost","127.0.0.1"].includes(h) ? "direct" : "referral";
}
export function journeyAttribution(input: Record<string,unknown>) {
 const sources=["direct","referral","x","reddit","medium","google","bing","duckduckgo","linkedin","newsletter"];
 const source=typeof input.source === "string" && sources.includes(input.source) ? input.source : referralSource(input.referrerHost);
 const medium=typeof input.medium === "string" && ["social","organic","referral","email"].includes(input.medium) ? input.medium : ["google","bing","duckduckgo"].includes(source) ? "organic" : ["x","reddit","linkedin"].includes(source) ? "social" : source === "direct" ? "none" : "referral";
 return {source,medium,campaign:CAMPAIGNS.includes(input.campaign as typeof CAMPAIGNS[number]) ? String(input.campaign) : "",content:CAMPAIGN_CONTENT.includes(input.content as typeof CAMPAIGN_CONTENT[number]) ? String(input.content) : ""};
}
export type JourneyOrder = { journeyId?: string; preview: boolean; status: string; dodoSessionId: string | null; createdAtMs: number; paidAtMs: number | null; priceCents: number; completedCount?: number; completed: unknown[]; firstCompletedAtMs?: number };
/** Purchases and completions are projected from authoritative orders, never browser events. */
export function summarizeJourneys(journeys: Journey[], orders: JourneyOrder[]) {
 const byId=new Map(journeys.map(j=>[j.id,{...j,stages:{...j.stages}}]));
 let paid=0, reversed=0, revenueCents=0, completed=0, unattributedPaid=0;
 for(const order of orders) {
  if(order.preview) continue;
  const journey=order.journeyId ? byId.get(order.journeyId) : undefined;
  if(order.status === "reversed") reversed++;
  if(order.status === "paid") {paid++;revenueCents+=order.priceCents;if(!journey)unattributedPaid++;if((order.completedCount ?? order.completed.length)>0)completed++;}
  if(!journey)continue;
  if(order.dodoSessionId)journey.stages.checkout_started ??= order.createdAtMs;
  if(order.paidAtMs && ["paid","reversed"].includes(order.status))journey.stages.purchase_confirmed ??= order.paidAtMs;
  if(order.firstCompletedAtMs)journey.stages.report_completed ??= order.firstCompletedAtMs;
 }
 const rows=[...byId.values()];
 const stages=Object.fromEntries(JOURNEY_STAGES.map(stage=>[stage,rows.filter(row=>row.stages[stage] !== undefined).length])) as Record<JourneyStage,number>;
 const group=(key:(j:Journey)=>string)=>{
  const groups=new Map<string,{label:string;journeys:number;product:number;checkout:number;purchase:number;report:number}>();
  for(const row of rows){const label=key(row);const g=groups.get(label)??{label,journeys:0,product:0,checkout:0,purchase:0,report:0};g.journeys++;for(const [field,stage] of [["product","product_view"],["checkout","checkout_started"],["purchase","purchase_confirmed"],["report","report_completed"]] as const)if(row.stages[stage]!==undefined)g[field]++;groups.set(label,g);}
  return [...groups.values()].sort((a,b)=>b.journeys-a.journeys||a.label.localeCompare(b.label));
 };
 return {stages,paid,reversed,revenueCents,completed,unattributedPaid,sources:group(j=>[j.source,j.campaign,j.content].filter(Boolean).join(" / ")),articles:group(j=>j.firstArticle || "No recorded article")};
}
