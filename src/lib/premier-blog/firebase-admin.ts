import "server-only";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
function app() {
  const existing = getApps().find((a) => a.name === "premier-blog");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    throw new Error("Blog Firebase server/client projects must match.");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL,
    privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
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
    "premier-blog",
  );
}
export const blogAuth = () => getAuth(app());
export const blogDb = () => getFirestore(app());
export function collections() {
  const db = blogDb();
  return {
    db,
    posts: db.collection("premierBlogPosts"),
    publicPosts: db.collection("premierBlogPublic"),
    slugs: db.collection("premierBlogSlugs"),
    media: db.collection("premierBlogMedia"),
  };
}
