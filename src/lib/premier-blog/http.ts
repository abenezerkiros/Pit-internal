import "server-only";
import { NextResponse } from "next/server";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  console.error(
    "Blog request failed",
    e instanceof Error ? e.name : "Unknown error",
  );
  return json(
    { error: "The request could not be completed. Please try again." },
    500,
  );
}
export function sameOrigin(req: Request) {
  const expected = process.env.BLOG_ORIGIN || new URL(req.url).origin;
  if (req.headers.get("origin") !== expected)
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function bodyJson(req: Request, max = 400000) {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "Article is too large.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

export async function boundedFormData(req: Request, max = 3300000) {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing upload.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "Choose an image smaller than 3 MB.");
    }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "Content-Type": req.headers.get("content-type") || "" },
  }).formData();
}
