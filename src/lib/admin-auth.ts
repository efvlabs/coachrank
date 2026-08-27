import "server-only";

import { cookies } from "next/headers";

import { isAdminEmail } from "./config";
import { getAdminAuth } from "./firebase/admin";

export const ADMIN_COOKIE = "cr_admin";
export const ADMIN_SESSION_MS = 60 * 60 * 24 * 5 * 1000;

export type AdminUser = { uid: string; email: string };

/**
 * Resolves the signed-in admin from the httpOnly session cookie, or null.
 * Membership is decided by the ADMIN_EMAILS allow-list - a valid Firebase account that
 * is not on the list is not an admin.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  const cookie = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await auth.verifySessionCookie(cookie, true);
    const email = decoded.email ?? null;
    if (!isAdminEmail(email)) return null;
    return { uid: decoded.uid, email: email as string };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) throw new Error("Not authorised.");
  return user;
}
