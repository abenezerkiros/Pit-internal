import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { requireTeam, json, failure, readBody } from "@/lib/http";
import { clientSchema } from "@/lib/client-desk/model";
import { parse, serialize, validId } from "@/lib/client-desk/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireTeam(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    let query = db()
      .collection("clients")
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (cursor) query = query.startAfter(validId(cursor));
    const docs = await query.get();
    return json({
      clients: docs.docs.map(serialize),
      nextCursor: docs.size === 100 ? docs.docs[99].id : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireTeam(request);
    const input = parse(clientSchema, await readBody(request));
    const ref = db().collection("clients").doc();
    await ref.create({
      ...input,
      revision: 1,
      createdBy: actor,
      updatedBy: actor,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return json({ id: ref.id }, 201);
  } catch (e) {
    return failure(e);
  }
}
