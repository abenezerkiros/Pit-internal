import "server-only";
import { z } from "zod";
import { HttpError } from "@/lib/http";

export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(
      400,
      result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  }

  return result.data;
}

export function validId(id: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    throw new HttpError(400, "Invalid record ID.");
  }

  return id;
}

export function serialize(doc: FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() || {};

  return {
    ...data,
    id: doc.id,
    createdAt: data.createdAt?.toDate?.().toISOString() || "",
    updatedAt: data.updatedAt?.toDate?.().toISOString() || "",
  };
}