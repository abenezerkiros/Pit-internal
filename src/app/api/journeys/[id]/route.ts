import { createHash } from "node:crypto";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { requireTeam, json, failure, readBody, HttpError } from "@/lib/http";
import { journeySchema } from "@/lib/client-desk/model";
import { parse, serialize, validId } from "@/lib/client-desk/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await requireTeam(request);
    const { id } = await context.params;
    const doc = await db().collection("bookings").doc(validId(id)).get();
    if (!doc.exists) throw new HttpError(404, "Booking not found.");
    const clientId = doc.get("clientId");
    const client = clientId
      ? await db().collection("clients").doc(validId(clientId)).get()
      : null;
    return json({
      journey: serialize(doc),
      client: client?.exists ? serialize(client) : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireTeam(request);
    const { id } = await context.params;
    const { revision, status, ...input } = parse(
      journeySchema.extend({
        revision: z.number().int().positive(),
        status: z.enum(["scheduled", "cancelled", "completed"]),
      }),
      await readBody(request),
    );
    const ref = db().collection("bookings").doc(validId(id));
    await db().runTransaction(async (tx) => {
      const old = await tx.get(ref);
      if (!old.exists) throw new HttpError(404, "Booking not found.");
      if (old.get("source") !== "internal-manifest")
        throw new HttpError(400, "Only imported bookings can be edited here.");
      if (old.get("revision") !== revision)
        throw new HttpError(
          409,
          "This booking changed. Close and reopen it before editing.",
        );
      if (
        old.get("reservationId") !== input.reservationId ||
        old.get("clientId") !== input.clientId
      )
        throw new HttpError(
          400,
          "The reservation number and linked client cannot be changed.",
        );
      tx.update(ref, {
        ...input,
        status,
        payloadHash: createHash("sha256")
          .update(JSON.stringify(input))
          .digest("hex"),
        revision: revision + 1,
        updatedBy: actor,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return json({ id });
  } catch (e) {
    return failure(e);
  }
}
