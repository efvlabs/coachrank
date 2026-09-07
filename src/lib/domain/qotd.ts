import "server-only";
import { requireDb } from "../firebase/admin";
import type { QotdInput, QotdRecord } from "../qotd";

export const QOTD_COLLECTION = "socialQuotes";
export class QotdConflict extends Error {}

export async function listQotds(): Promise<QotdRecord[]> {
  const snapshot = await requireDb().collection(QOTD_COLLECTION).orderBy("updatedAtMs", "desc").limit(1000).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as QotdRecord);
}

export async function saveQotd(input: QotdInput): Promise<QotdRecord> {
  const db = requireDb();
  const ref = db.collection(QOTD_COLLECTION).doc(input.id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    const previous = snapshot.exists ? snapshot.data() as QotdRecord : null;
    if ((previous?.revision ?? 0) !== input.revision) throw new QotdConflict("This quote changed in another tab. Your text is still here. Copy it before reloading the desk.");
    const now = Date.now();
    const record = { ...input, revision: input.revision + 1, createdAtMs: previous?.createdAtMs ?? now, updatedAtMs: now };
    tx.set(ref, record);
    return record;
  });
}
