import "server-only";
import { z } from "zod";
import { HttpError } from "@/lib/http";
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    throw new HttpError(
      400,
      r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  return r.data;
}
export function validId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    throw new HttpError(400, "Invalid record ID.");
  return id;
}
export function serialize(doc: FirebaseFirestore.DocumentSnapshot) {
  const d = doc.data() || {};
  return {
    ...d,
    id: doc.id,
    createdAt: d.createdAt?.toDate?.().toISOString() || "",
    updatedAt: d.updatedAt?.toDate?.().toISOString() || "",
  };
}
