/**
 * Authentication service module.
 * UI components must call these functions — never import firebase/auth directly in components.
 *
 * Authorization model: a signed-in user is an admin only if /admins/{uid} exists
 * (checked here) — RTDB security rules enforce the same check server-side.
 */
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { ref, get } from "firebase/database";
import { getFirebaseAuth, getFirebaseDatabase } from "./config";
import { DB_PATHS } from "@/lib/constants";

export interface AuthState {
  user: User | null;
  /** True when the user is signed in AND present in /admins. */
  isAdmin: boolean;
  /** True once the first auth state check has completed. */
  loading: boolean;
}

export async function signInAdminWithEmail(
  email: string,
  password: string,
): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInAdminWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return credential.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Check whether a uid is present in the /admins allow-list. */
export async function checkIsAdmin(uid: string): Promise<boolean> {
  const snapshot = await get(ref(getFirebaseDatabase(), `${DB_PATHS.admins}/${uid}`));
  return snapshot.exists();
}

/** Fetch the allow-listed admin entry for a uid (role display only — not authz). */
export async function getAdminRole(
  uid: string,
): Promise<"superadmin" | "admin" | null> {
  const snapshot = await get(ref(getFirebaseDatabase(), `${DB_PATHS.admins}/${uid}`));
  const role = snapshot.exists() ? (snapshot.val() as { role?: string }).role : undefined;
  return role === "superadmin" || role === "admin" ? role : null;
}

/** Subscribe to auth state. Returns the unsubscribe function. */
export function subscribeToAuthState(
  callback: (state: AuthState) => void,
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ user: null, isAdmin: false, loading: false });
      return;
    }
    try {
      const isAdmin = await checkIsAdmin(user.uid);
      callback({ user, isAdmin, loading: false });
    } catch {
      callback({ user, isAdmin: false, loading: false });
    }
  });
}
