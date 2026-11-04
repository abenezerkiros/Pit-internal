import "server-only";

import { blogAuth } from "./firebase-admin";
import { allowedIdentity } from "./model";
import { HttpError } from "./http";
export async function identity(token: {
  uid: string;
  email?: string;
  email_verified?: boolean;
  firebase?: { sign_in_provider?: string };
}) {
  if (
    !allowedIdentity(
      token.email,
      token.email_verified,
      token.firebase?.sign_in_provider,
    )
  )
    throw new HttpError(403, "This account does not have blog access.");
  const user = await blogAuth().getUser(token.uid);
  if (
    user.disabled ||
    !user.emailVerified ||
    user.email?.toLowerCase() !== token.email?.toLowerCase()
  )
    throw new HttpError(403, "This account does not have blog access.");
  return {
    uid: token.uid,
    email: token.email!.toLowerCase(),
    name: user.displayName || token.email!,
  };
}
export async function requireEditor(req: Request) {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ") || header.length > 8192)
    throw new HttpError(401, "Please sign in to the team app.");
  let token;
  try {
    token = await blogAuth().verifyIdToken(header.slice(7), true);
  } catch {
    throw new HttpError(401, "Your session expired. Please sign in again.");
  }
  return identity(token);
}
