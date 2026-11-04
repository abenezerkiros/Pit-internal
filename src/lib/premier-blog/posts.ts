import "server-only";
import { FieldPath } from "firebase-admin/firestore";
import { collections } from "./firebase-admin";
import { assetIds, postInput, publishReady, type Post } from "./model";
import { HttpError } from "./http";
function cursor(value: string | undefined) {
  if (!value) return null;
  try {
    const [date, id] = JSON.parse(Buffer.from(value, "base64url").toString());
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T/.test(date) ||
      typeof id !== "string" ||
      !/^[A-Za-z0-9]{20}$/.test(id)
    )
      throw Error();
    return [date, id];
  } catch {
    throw new HttpError(400, "Invalid page cursor.");
  }
}
function nextCursor(last: Post, field: "updatedAt" | "publishedAt") {
  return Buffer.from(JSON.stringify([last[field], last.id])).toString(
    "base64url",
  );
}
export async function listPosts(after?: string) {
  let q = collections()
    .posts.orderBy("updatedAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");
  const c = cursor(after);
  if (c) q = q.startAfter(...c);
  const s = await q.limit(51).get();
  const rows = s.docs.slice(0, 50).map((d) => d.data() as Post);
  return {
    posts: rows.map(({ content, ...summary }) => summary),
    next: s.size > 50 ? nextCursor(rows[49], "updatedAt") : null,
  };
}
export async function getPost(id: string) {
  const d = await collections().posts.doc(id).get();
  if (!d.exists) throw new HttpError(404, "Post not found.");
  return d.data() as Post;
}
export async function changePost(input: unknown, email: string) {
  const b = input as {
    action?: string;
    id?: string;
    version?: number;
    post?: unknown;
  };
  if (
    !b ||
    !["save", "publish", "unpublish", "delete"].includes(b.action || "")
  )
    throw new HttpError(400, "Unknown action.");
  if (b.id && !/^[A-Za-z0-9]{20}$/.test(b.id))
    throw new HttpError(400, "Invalid post ID.");
  if (b.id && (!Number.isInteger(b.version) || b.version! < 1))
    throw new HttpError(400, "Missing post version.");
  if (!b.id && b.action !== "save" && b.action !== "publish")
    throw new HttpError(400, "Save the post first.");
  const c = collections(),
    ref = b.id ? c.posts.doc(b.id) : c.posts.doc();
  let parsed: ReturnType<typeof postInput.parse> | undefined;
  if (b.action === "save" || b.action === "publish") {
    const p = postInput.safeParse(b.post);
    if (!p.success)
      throw new HttpError(
        400,
        p.error.issues[0]?.message || "Check the post fields.",
      );
    parsed = p.data;
    if (b.action === "publish")
      try {
        publishReady(parsed);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
  }
  return c.db.runTransaction(async (tx) => {
    const current = await tx.get(ref);
    const old = current.exists ? (current.data() as Post) : null;
    if (b.id && !old) throw new HttpError(404, "Post not found.");
    if (old && old.version !== b.version)
      throw new HttpError(
        409,
        "This post changed in another tab or account. Reload it before saving.",
      );
    if (old && parsed && old.slug !== parsed.slug)
      throw new HttpError(
        400,
        "The URL is locked after the first save. Create a new post to use another URL.",
      );
    const slug = parsed?.slug || old!.slug;
    const slugRef = c.slugs.doc(slug),
      reserved = await tx.get(slugRef);
    if (reserved.exists && reserved.data()!.postId !== ref.id)
      throw new HttpError(
        409,
        "That URL is already in use. Choose another slug.",
      );
    let assets: string[] = [];
    try {
      assets = parsed ? assetIds(parsed.content, parsed.cover) : [];
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    for (const id of assets) {
      if (!(await tx.get(c.media.doc(id))).exists)
        throw new HttpError(400, "An image is missing. Upload it again.");
    }
    if (b.action === "delete") {
      tx.delete(ref);
      tx.delete(c.publicPosts.doc(ref.id));
      tx.delete(slugRef);
      return { deleted: true };
    }
    const now = new Date().toISOString(),
      version = (old?.version || 0) + 1;
    const post: Post = {
      ...(parsed || old!),
      id: ref.id,
      version,
      createdAt: old?.createdAt || now,
      updatedAt: now,
      updatedBy: email,
      publishedAt: old?.publishedAt || null,
      publishedVersion: old?.publishedVersion || null,
    };
    if (b.action === "publish") {
      post.publishedAt = old?.publishedAt || now;
      post.publishedVersion = version;
      tx.set(c.publicPosts.doc(ref.id), { ...post, assets });
    } else if (b.action === "unpublish") {
      post.publishedAt = null;
      post.publishedVersion = null;
      tx.delete(c.publicPosts.doc(ref.id));
    }
    tx.set(ref, post);
    tx.set(slugRef, { postId: ref.id });
    return { post };
  });
}
export async function publicPosts(after?: string) {
  let q = collections()
    .publicPosts.orderBy("publishedAt", "desc")
    .orderBy(FieldPath.documentId(), "desc");
  const c = cursor(after);
  if (c) q = q.startAfter(...c);
  const s = await q.limit(13).get();
  const posts = s.docs.slice(0, 12).map((d) => d.data() as Post);
  return {
    posts,
    next: s.size > 12 ? nextCursor(posts[11], "publishedAt") : null,
  };
}
export async function publicPost(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
    return null;
  const s = await collections()
    .publicPosts.where("slug", "==", slug)
    .limit(1)
    .get();
  return s.empty ? null : (s.docs[0].data() as Post);
}
