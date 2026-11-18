import { createHash } from "node:crypto";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { requireTeam, json, failure, readBody, HttpError } from "@/lib/http";
import {
  journeySchema,
  monthBounds,
  monthSchema,
} from "@/lib/client-desk/model";
import { parse, serialize, validId } from "@/lib/client-desk/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireTeam(request);
    const params = new URL(request.url).searchParams;
    const clientId = params.get("clientId"),
      cursor = params.get("cursor");
    let query: FirebaseFirestore.Query = db().collection("bookings");
    if (clientId) {
      query = query
        .where("clientId", "==", validId(clientId))
        .orderBy(FieldPath.documentId());
      if (cursor) query = query.startAfter(validId(cursor));
    } else {
      const { start, end } = monthBounds(
        parse(monthSchema, params.get("month")),
      );
      query = query
        .where("date", ">=", start)
        .where("date", "<", end)
        .orderBy("date")
        .orderBy(FieldPath.documentId());
      if (cursor) {
        const doc = await db()
          .collection("bookings")
          .doc(validId(cursor))
          .get();
        if (!doc.exists) throw new HttpError(400, "Invalid cursor.");
        query = query.startAfter(doc);
      }
    }
    const docs = await query.limit(200).get();
    return json({
      journeys: docs.docs.map(serialize),
      nextCursor: docs.size === 200 ? docs.docs[199].id : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireTeam(request);
    const input = parse(journeySchema, await readBody(request));
    const id =
      "manifest-" +
      createHash("sha256")
        .update(input.reservationId.toUpperCase())
        .digest("hex");
    const ref = db().collection("bookings").doc(id);
    const payloadHash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const duplicate = await db().runTransaction(async (tx) => {
      const [client, existing] = await Promise.all([
        input.clientId
          ? tx.get(db().collection("clients").doc(input.clientId))
          : Promise.resolve(null),
        tx.get(ref),
      ]);
      if (input.clientId && !client?.exists)
        throw new HttpError(
          404,
          "Client not found. Refresh the import to match profiles again.",
        );
      if (existing.exists) {
        if (existing.get("payloadHash") !== payloadHash)
          throw new HttpError(
            409,
            "This reservation already exists with different details. Open it from the calendar to edit it.",
          );
        return true;
      }
      tx.create(ref, {
        ...input,
        payloadHash,
        reference: input.reservationId,
        source: "internal-manifest",
        status: "scheduled",
        revision: 1,
        timeBasis: "pickup-local",
        createdBy: actor,
        updatedBy: actor,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return false;
    });
    return json({ id, duplicate }, duplicate ? 200 : 201);
  } catch (e) {
    return failure(e);
  }
}
