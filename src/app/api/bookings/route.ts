import { createHash, randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { bookingSchema } from "@/lib/booking";
import { requireTeam, json, failure, HttpError, readBody } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const actor = await requireTeam(request);
    const parsed = bookingSchema.safeParse(await readBody(request));
    if (!parsed.success)
      throw new HttpError(
        400,
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
    const key = request.headers.get("idempotency-key") || "";
    if (!/^[0-9a-f-]{36}$/i.test(key))
      throw new HttpError(400, "A valid request key is required.");
    const id = createHash("sha256").update(`${actor.uid}:${key}`).digest("hex");
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(parsed.data))
      .digest("hex");
    const ref = db().collection("bookings").doc(id);
    const result = await db().runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        if (existing.get("payloadHash") !== payloadHash)
          throw new HttpError(
            409,
            "This request key already saved different details. Restore the submitted details before retrying.",
          );
        return {
          id,
          reference: existing.get("reference"),
          duplicate: true,
        };
      }
      const reference = `PIT-${randomUUID().slice(0, 8).toUpperCase()}`;
      tx.create(ref, {
        ...parsed.data,
        payloadHash,
        reference,
        status: "new",
        source: "internal-team",
        timeBasis: "pickup-local",
        revision: 1,
        createdBy: actor,
        updatedBy: actor,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.create(ref.collection("events").doc(), {
        action: "created",
        actor,
        at: FieldValue.serverTimestamp(),
      });
      return { id, reference, duplicate: false };
    });
    return json(result, result.duplicate ? 200 : 201);
  } catch (error) {
    return failure(error);
  }
}
