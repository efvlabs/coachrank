"use client";

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Emulator hosts have to be public: the server-side FIREBASE_*_EMULATOR_HOST variables are
 * invisible to the browser, so local development needs its own pair.
 */
const AUTH_EMULATOR = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
const FIRESTORE_EMULATOR = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;

/** Must match the server's FIREBASE_DATABASE_ID, or the live feed reads the wrong database. */
const DATABASE_ID = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() || "(default)";

export function isClientFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let appPromise: Promise<FirebaseApp | null> | null = null;
let dbPromise: Promise<Firestore | null> | null = null;
let authPromise: Promise<Auth | null> | null = null;

/**
 * The Firebase web SDK is ~180 KiB and only two surfaces need it - the live activity feed
 * and admin sign-in. Everything here is dynamically imported so it never lands in the
 * initial bundle for a visitor who is just reading the board.
 */
function getClientApp(): Promise<FirebaseApp | null> {
  if (!isClientFirebaseConfigured()) return Promise.resolve(null);
  appPromise ??= (async () => {
    const { getApp, getApps, initializeApp } = await import("firebase/app");
    return getApps().length ? getApp() : initializeApp(config as Required<typeof config>);
  })();
  return appPromise;
}

function parseHostPort(value: string): { host: string; port: number } {
  const cleaned = value.replace(/^https?:\/\//, "");
  const [host, port] = cleaned.split(":");
  return { host: host || "127.0.0.1", port: Number(port) || 8080 };
}

/** Read-only Firestore handle for the browser. Null when the public config is absent. */
export function getClientDb(): Promise<Firestore | null> {
  dbPromise ??= (async () => {
    const app = await getClientApp();
    if (!app) return null;
    try {
      const { connectFirestoreEmulator, getFirestore } = await import("firebase/firestore");
      const db = DATABASE_ID === "(default)" ? getFirestore(app) : getFirestore(app, DATABASE_ID);
      if (FIRESTORE_EMULATOR) {
        const { host, port } = parseHostPort(FIRESTORE_EMULATOR);
        connectFirestoreEmulator(db, host, port);
      }
      return db;
    } catch {
      return null;
    }
  })();
  return dbPromise;
}

export function getClientAuth(): Promise<Auth | null> {
  authPromise ??= (async () => {
    const app = await getClientApp();
    if (!app) return null;
    try {
      const { connectAuthEmulator, getAuth } = await import("firebase/auth");
      const auth = getAuth(app);
      if (AUTH_EMULATOR) {
        const url = AUTH_EMULATOR.startsWith("http") ? AUTH_EMULATOR : `http://${AUTH_EMULATOR}`;
        connectAuthEmulator(auth, url, { disableWarnings: true });
      }
      return auth;
    } catch {
      return null;
    }
  })();
  return authPromise;
}
