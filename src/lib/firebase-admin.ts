import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
function adminApp() {
  const existing = getApps().find((app) => app.name === "premier-team");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error(
      "Firebase server/client project configuration is missing or mismatched.",
    );
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (Boolean(clientEmail) !== Boolean(privateKey))
    throw new Error("Incomplete Firebase Admin credentials.");
  return initializeApp(
    {
      projectId,
      credential:
        clientEmail && privateKey
          ? cert({ projectId, clientEmail, privateKey })
          : applicationDefault(),
    },
    "premier-team",
  );
}
export const adminAuth = () => getAuth(adminApp());
export const db = () => getFirestore(adminApp());
