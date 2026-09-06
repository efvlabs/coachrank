import "server-only";
import { requireDb } from "../firebase/admin";
import { type SocialInput, type SocialRecord } from "../social";

export const SOCIAL_COLLECTION = "socialRecords";
export class SocialConflict extends Error {}

export async function listSocialRecords(): Promise<SocialRecord[]> {
  const snapshot = await requireDb().collection(SOCIAL_COLLECTION).orderBy("updatedAtMs", "desc").limit(1000).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SocialRecord);
}

export async function saveSocialRecord(input: SocialInput): Promise<SocialRecord> {
  const db = requireDb();
  const ref = db.collection(SOCIAL_COLLECTION).doc(input.id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const existing = snapshot.exists ? snapshot.data() as SocialRecord : null;
    if ((existing?.revision ?? 0) !== input.revision || existing && existing.kind !== input.kind) throw new SocialConflict("This record changed in another tab. Reload the workspace before saving.");
    const record = { ...input, revision: input.revision + 1, createdAtMs: existing?.createdAtMs ?? Date.now(), updatedAtMs: Date.now() };
    tx.set(ref, record);
    return record;
  });
}
