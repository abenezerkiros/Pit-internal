import "server-only";
import { NextResponse } from "next/server";
import { adminAuth } from "./firebase-admin";
import { isTeamIdentity } from "./policy";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireTeam(request: Request) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ") || bearer.length > 8192)
    throw new HttpError(
      401,
      "Please sign in with your company Google account.",
    );
  const auth = adminAuth();
  let token;
  try {
    token = await auth.verifyIdToken(bearer.slice(7), true);
  } catch {
    throw new HttpError(
      401,
      "Your session has expired or access was revoked. Please sign in again.",
    );
  }
  if (!isTeamIdentity(token))
    throw new HttpError(
      403,
      "Access is restricted to verified @pitdrives.com Google accounts.",
    );
  return {
    uid: token.uid,
    email: token.email!,
    name: typeof token.name === "string" ? token.name : token.email!,
  };
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  // Avoid logging requests, tokens, passenger details, or credentials.
  console.error("Team API request failed.");
  return json(
    {
      error:
        "The service is unavailable. Please try again or ask your administrator to check the server configuration.",
    },
    500,
  );
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "JSON is required.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 20000) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
