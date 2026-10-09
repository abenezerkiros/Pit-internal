"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { isTeamEmail } from "@/lib/policy";
export type TeamUser = { uid: string; email: string; name: string };
export async function teamFetch(path: string, init: RequestInit = {}) {
  const user = clientAuth().currentUser;
  if (!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      await signOut(clientAuth());
    throw new Error(data.error || "The request could not be completed.");
  }
  return data;
}
const AuthContext = createContext<{
  user: TeamUser | null;
  loading: boolean;
  error: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  error: "",
  login: async () => {},
  logout: async () => {},
});
export const useTeam = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TeamUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let generation = 0;
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(clientAuth(), async (firebaseUser) => {
        const thisGeneration = ++generation;
        setUser(null);
        if (!firebaseUser) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          if (!firebaseUser.emailVerified || !isTeamEmail(firebaseUser.email)) {
            setError("Please use your @pitdrives.com Google account.");
            await signOut(clientAuth());
            return;
          }
          const data = await teamFetch("/api/me");
          if (thisGeneration === generation) {
            setUser(data.user);
            setError("");
          }
        } catch (error) {
          if (thisGeneration === generation)
            setError(
              error instanceof Error ? error.message : "Sign-in failed.",
            );
        } finally {
          if (thisGeneration === generation) setLoading(false);
        }
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Firebase is not configured.",
      );
      setLoading(false);
    }
    return () => {
      ++generation;
      unsubscribe();
    };
  }, []);
  async function login() {
    setError("");
    try {
      const auth = clientAuth();
      await setPersistence(auth, browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        hd: "pitdrives.com",
        prompt: "select_account",
      });
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      setError(
        code === "auth/popup-closed-by-user"
          ? "Sign-in was cancelled. Try again when ready."
          : code === "auth/popup-blocked"
            ? "Allow pop-ups for this site, then try again."
            : error instanceof Error
              ? error.message
              : "Unable to sign in.",
      );
    }
  }
  async function logout() {
    await signOut(clientAuth());
    setUser(null);
    setError("");
  }
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
