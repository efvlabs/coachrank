import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth } from "./firebase/admin";

export const CUSTOMER_COOKIE = "cr_customer";
export const CUSTOMER_SESSION_MS = 14 * 24 * 60 * 60 * 1000;
export type CustomerUser = { uid: string; email: string; name: string | null };

/** Customer identity always comes from a verified Firebase session, never request JSON. */
export async function getCustomerUser(): Promise<CustomerUser | null> {
  const cookie = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  const auth = getAdminAuth();
  if (!cookie || !auth) return null;
  try {
    const decoded = await auth.verifySessionCookie(cookie, true);
    if (!decoded.email_verified || !decoded.email) return null;
    return { uid: decoded.uid, email: decoded.email, name: typeof decoded.name === "string" ? decoded.name : null };
  } catch {
    return null;
  }
}
