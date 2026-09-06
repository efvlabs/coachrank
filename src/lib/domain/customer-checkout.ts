import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { requireDb } from "../firebase/admin";

/** Serialize checkout starts across tabs, devices and Cloud Run instances. */
export async function lockCustomerCheckout(uid: string) {
  const ref = requireDb().collection("assessmentCheckoutLocks").doc(createHash("sha256").update(uid).digest("hex"));
  const token = randomUUID();
  const locked = await requireDb().runTransaction(async tx => {
    const doc = await tx.get(ref);
    if ((doc.data()?.expiresAtMs ?? 0) > Date.now()) return false;
    tx.set(ref, { token, expiresAtMs: Date.now() + 120_000 });
    return true;
  });
  if (!locked) return null;
  return async () => requireDb().runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (doc.data()?.token === token) tx.delete(ref);
  });
}
