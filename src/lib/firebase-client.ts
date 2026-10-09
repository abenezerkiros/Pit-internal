import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
export function clientAuth() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (Object.values(config).some((value) => !value))
    throw new Error(
      "Add your Firebase web configuration to .env.local, then restart the app.",
    );
  return getAuth(getApps().length ? getApp() : initializeApp(config));
}
