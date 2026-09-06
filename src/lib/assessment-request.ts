import "server-only";
import { cookies } from "next/headers";
import { getAdminUser } from "./admin-auth";
import { SITE } from "./config";
import { ASSESSMENT_COOKIE, authorizedAssessment } from "./domain/assessments";

export const ASSESSMENT_PREVIEW_COOKIE = "cr_brand_preview";
export type AssessmentMode = "purchase" | "preview";
export const assessmentMode = (request?: Request): AssessmentMode => request && new URL(request.url).searchParams.get("preview") === "true" ? "preview" : "purchase";

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin || origin === SITE.url;
}

/** A preview is available only in explicit preview mode with an active admin session. */
export async function assessmentSession(mode: AssessmentMode = "purchase") {
  const jar = await cookies();
  if (mode === "preview" && !await getAdminUser()) return null;
  // Older previews used the purchase cookie. Read them only in preview mode until
  // the next checkout or preview launch moves that token into its own cookie.
  const names = mode === "preview" ? [ASSESSMENT_PREVIEW_COOKIE, ASSESSMENT_COOKIE] : [ASSESSMENT_COOKIE];
  for (const name of names) {
    const access = jar.get(name)?.value;
    const order = await authorizedAssessment(access);
    if (order && Boolean(order.preview) === (mode === "preview")) return { order, access: access! };
  }
  return null;
}

export async function currentAssessment(request?: Request) {
  return (await assessmentSession(assessmentMode(request)))?.order ?? null;
}

export async function setAssessmentAccess(access: string, mode: AssessmentMode = "purchase") {
  (await cookies()).set(mode === "preview" ? ASSESSMENT_PREVIEW_COOKIE : ASSESSMENT_COOKIE, access, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 365 * 86_400,
  });
}

/** Preserve the old preview before a checkout replaces the purchase cookie. */
export async function preserveLegacyAssessmentPreview() {
  const jar = await cookies();
  const access = jar.get(ASSESSMENT_COOKIE)?.value;
  if (!access) return;
  const order = await authorizedAssessment(access);
  if (!order?.preview) return;
  const savedPreview = await authorizedAssessment(jar.get(ASSESSMENT_PREVIEW_COOKIE)?.value);
  if (!savedPreview?.preview) await setAssessmentAccess(access, "preview");
  // Do not clear the old cookie here: another tab may be opening a real checkout.
  // Purchase reads ignore preview orders, and checkout safely replaces this cookie.
}
