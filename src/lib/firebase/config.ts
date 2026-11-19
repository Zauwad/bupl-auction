/**
 * Firebase client initialization.
 *
 * All values come from NEXT_PUBLIC_* environment variables — never hardcode
 * credentials here. Client config is not secret (it ships to the browser),
 * security is enforced by Realtime Database rules + Firebase Auth.
 *
 * Initialization is lazy so the app can be built/SSR'd without env vars,
 * and so emulator mode can be toggled via NEXT_PUBLIC_USE_FIREBASE_EMULATORS.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  getDatabase,
  connectDatabaseEmulator,
  type Database,
} from "firebase/database";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const useEmulators =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

export function isFirebaseConfigured(): boolean {
  const values = Object.values(firebaseConfig);
  const hasAll = Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.databaseURL &&
      firebaseConfig.appId,
  );
  // Treat untouched .env.local.example placeholders ("your-...") as unconfigured.
  const looksLikePlaceholder = values.some(
    (v) => typeof v === "string" && /^(your-|000000000000)/.test(v),
  );
  return hasAll && !looksLikePlaceholder;
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and fill in your Firebase web app values.",
    );
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;
let databaseInstance: Database | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
    if (useEmulators && typeof window !== "undefined") {
      // Auth emulator default port: 9099
      connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    }
  }
  return authInstance;
}

export function getFirebaseDatabase(): Database {
  if (!databaseInstance) {
    databaseInstance = getDatabase(getFirebaseApp());
    if (useEmulators && typeof window !== "undefined") {
      // RTDB emulator default port: 9000
      connectDatabaseEmulator(databaseInstance, "127.0.0.1", 9000);
    }
  }
  return databaseInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
    if (useEmulators && typeof window !== "undefined") {
      // Storage emulator default port: 9199
      connectStorageEmulator(storageInstance, "127.0.0.1", 9199);
    }
  }
  return storageInstance;
}
