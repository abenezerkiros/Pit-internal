import { requireEditor } from "@/lib/premier-blog/auth";
import { collections } from "@/lib/premier-blog/firebase-admin";
import { failure, HttpError } from "@/lib/premier-blog/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[a-f0-9]{32}$/.test(id))
      throw new HttpError(404, "Image not found.");
    await requireEditor(_req);
    const c = collections();
    const media = await c.media.doc(id).get();
    if (!media.exists) throw new HttpError(404, "Image not found.");
    const bytes = media.data()!.bytes as Buffer;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
