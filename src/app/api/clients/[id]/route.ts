import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";
import { requireTeam, json, failure, readBody, HttpError } from "@/lib/http";
import { clientSchema } from "@/lib/client-desk/model";
import { parse, serialize, validId } from "@/lib/client-desk/server";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await requireTeam(request);
    const { id } = await context.params;
    const doc = await db().collection("clients").doc(validId(id)).get();
    if (!doc.exists) throw new HttpError(404, "Client not found.");
    return json({ client: serialize(doc) });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    const actor = await requireTeam(request);
    const { id } = await context.params;
    const { revision, ...input } = parse(
      clientSchema.extend({ revision: z.number().int().positive() }),
      await readBody(request),
    );
    const ref = db().collection("clients").doc(validId(id));
    await db().runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      if (!doc.exists) throw new HttpError(404, "Client not found.");
      if (doc.get("revision") !== revision)
        throw new HttpError(
          409,
          "Another team member updated this profile. Reload before editing again.",
        );
      tx.update(ref, {
        ...input,
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
