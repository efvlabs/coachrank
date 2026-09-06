import "server-only";
import { cookies } from "next/headers";
import { SITE } from "./config";
import { ASSESSMENT_COOKIE, authorizedAssessment } from "./domain/assessments";

export function sameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin || origin === SITE.url;
}

export async function currentAssessment() {
  return authorizedAssessment((await cookies()).get(ASSESSMENT_COOKIE)?.value);
}

export async function setAssessmentAccess(access: string) {
  (await cookies()).set(ASSESSMENT_COOKIE, access, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 365 * 86_400,
  });
}
