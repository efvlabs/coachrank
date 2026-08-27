import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "coachrank-admin";

/**
 * CoachRank can live in a named Firestore database inside a shared Firebase project, so
 * it never touches another app's `(default)` database, rules or indexes.
 */
export const DATABASE_ID = process.env.FIREBASE_DATABASE_ID?.trim() || "(default)";

let cached: { app: App; db: Firestore } | null | undefined;

function readServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      };
    }
    return null;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
  }
  return null;
}

function usingEmulator(): boolean {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

/**
 * On Firebase App Hosting (and any Cloud Run / GCP host) the runtime supplies Application
 * Default Credentials, so no service-account JSON is needed — and none should be stored.
 */
function googleManagedRuntime(): string | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_CLIENT_EMAIL) return null;
  const fromConfig = (() => {
    try {
      const raw = process.env.FIREBASE_CONFIG;
      return raw ? ((JSON.parse(raw) as { projectId?: string }).projectId ?? null) : null;
    } catch {
      return null;
    }
  })();
  const projectId =
    fromConfig ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    null;
  // K_SERVICE is set by Cloud Run, which is what App Hosting deploys onto.
  const onGoogle = Boolean(process.env.K_SERVICE || process.env.FIREBASE_CONFIG || process.env.GOOGLE_CLOUD_PROJECT);
  return onGoogle && projectId ? projectId : null;
}

export function getAdminApp(): App | null {
  if (cached !== undefined) return cached?.app ?? null;

  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) {
    cached = {
      app: existing,
      db: DATABASE_ID === "(default)" ? getFirestore(existing) : getFirestore(existing, DATABASE_ID),
    };
    return existing;
  }

  try {
    const serviceAccount = readServiceAccount();
    const adcProjectId = googleManagedRuntime();
    let app: App;

    if (serviceAccount) {
      app = initializeApp(
        { credential: cert(serviceAccount), projectId: serviceAccount.projectId },
        APP_NAME,
      );
    } else if (adcProjectId) {
      // Credentials come from the runtime's own service account.
      app = initializeApp({ projectId: adcProjectId }, APP_NAME);
    } else if (usingEmulator()) {
      // The emulator does not check credentials; a project id is enough.
      const projectId = process.env.FIREBASE_PROJECT_ID || "coachrank-local";
      app = initializeApp({ projectId }, APP_NAME);
    } else {
      cached = null;
      return null;
    }

    const db =
      DATABASE_ID === "(default)" ? getFirestore(app) : getFirestore(app, DATABASE_ID);
    db.settings({ ignoreUndefinedProperties: true });
    cached = { app, db };
    return app;
  } catch (error) {
    console.error("[firebase-admin] initialisation failed:", error);
    cached = null;
    return null;
  }
}

/**
 * Returns the Firestore handle, or null when Firebase is not configured. Callers render
 * empty states instead of crashing, so the site builds and boots without credentials.
 */
export function getDb(): Firestore | null {
  getAdminApp();
  return cached?.db ?? null;
}

/** For code paths that genuinely cannot proceed — payment processing, admin writes. */
export function requireDb(): Firestore {
  const db = getDb();
  if (!db) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIRESTORE_EMULATOR_HOST for local development).",
    );
  }
  return db;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  try {
    return getAuth(app);
  } catch {
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return getDb() !== null;
}

export { getApp };
