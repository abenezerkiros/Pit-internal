import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { requireEditor } from "@/lib/premier-blog/auth";
import { collections } from "@/lib/premier-blog/firebase-admin";
import {
  boundedFormData,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/premier-blog/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireEditor(req);
    const length = Number(req.headers.get("content-length"));
    if (length > 3_300_000)
      throw new HttpError(413, "Choose an image smaller than 3 MB.");
    const file = (await boundedFormData(req)).get("file");
    if (!(file instanceof File) || file.size > 3_000_000 || file.size === 0)
      throw new HttpError(400, "Choose an image smaller than 3 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new HttpError(400, "Use JPEG, PNG or WebP.");
    let bytes: Buffer;
    try {
      const source = Buffer.from(await file.arrayBuffer());
      bytes = await sharp(source, { limitInputPixels: 40000000 })
        .rotate()
        .resize({
          width: 1800,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toBuffer();
      if (bytes.length > 350000)
        bytes = await sharp(source, { limitInputPixels: 40000000 })
          .rotate()
          .resize({
            width: 1400,
            height: 1400,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 65 })
          .toBuffer();
    } catch {
      throw new HttpError(400, "That image could not be processed.");
    }
    if (bytes.length > 350000)
      throw new HttpError(
        413,
        "This image is too detailed. Resize it or choose a simpler image; the optimized limit is 350 KB.",
      );
    const id = randomBytes(16).toString("hex");
    await collections()
      .media.doc(id)
      .create({
        bytes,
        contentType: "image/webp",
        createdAt: new Date().toISOString(),
        createdBy: user.email,
      });
    return json({ url: `/api/blog/media/${id}` });
  } catch (e) {
    return failure(e);
  }
}
