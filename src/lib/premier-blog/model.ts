import { z } from "zod";
export const ALLOWED_EMAILS = [
  "wend@pitdrives.com",
  "abenezer@pitdrives.com",
] as const;
export function allowedIdentity(
  email: unknown,
  verified: unknown,
  provider: unknown,
) {
  return (
    typeof email === "string" &&
    (ALLOWED_EMAILS as readonly string[]).includes(email.toLowerCase()) &&
    verified === true &&
    provider === "google.com"
  );
}
export function safeLink(href: unknown): href is string {
  if (typeof href !== "string" || href.length > 2000) return false;
  try {
    return ["https:", "http:", "mailto:", "tel:"].includes(
      new URL(href).protocol,
    );
  } catch {
    return false;
  }
}
export const mediaPattern = /^\/api\/blog\/media\/([a-f0-9]{32})$/;
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export const emptyContent: RichNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
export function validateContent(value: unknown): RichNode {
  let count = 0;
  function visit(input: unknown, depth: number, parent: string): RichNode {
    if (++count > 6000 || depth > 12 || !input || typeof input !== "object")
      throw new Error("Article content is too complex.");
    const n = input as RichNode;
    const children: Record<string, string[]> = {
      root: ["doc"],
      doc: [
        "paragraph",
        "heading",
        "bulletList",
        "orderedList",
        "blockquote",
        "image",
        "horizontalRule",
      ],
      paragraph: ["text", "hardBreak"],
      heading: ["text", "hardBreak"],
      bulletList: ["listItem"],
      orderedList: ["listItem"],
      listItem: ["paragraph", "bulletList", "orderedList"],
      blockquote: ["paragraph", "heading", "bulletList", "orderedList"],
    };
    if (!children[parent]?.includes(n.type))
      throw new Error("Unsupported article formatting.");
    const out: RichNode = { type: n.type };
    if (n.type === "text") {
      if (typeof n.text !== "string" || n.text.length > 50000)
        throw new Error("Invalid article text.");
      out.text = n.text;
      if (n.marks)
        out.marks = n.marks.map((m) => {
          if (["bold", "italic", "strike", "underline"].includes(m.type))
            return { type: m.type };
          if (m.type === "link" && safeLink(m.attrs?.href))
            return { type: "link", attrs: { href: m.attrs!.href } };
          throw new Error("Invalid link or text style.");
        });
    }
    if (n.type === "heading") {
      const level = n.attrs?.level;
      if (level !== 2 && level !== 3)
        throw new Error("Use heading 2 or heading 3 within an article.");
      out.attrs = { level };
    }
    if (n.type === "orderedList") out.attrs = { start: 1 };
    if (n.type === "image") {
      const src = n.attrs?.src,
        alt = n.attrs?.alt;
      if (
        typeof src !== "string" ||
        !mediaPattern.test(src) ||
        typeof alt !== "string" ||
        alt.length > 250
      )
        throw new Error("Use uploaded images with an image description.");
      out.attrs = { src, alt };
    }
    if (n.content !== undefined) {
      if (!Array.isArray(n.content) || !children[n.type])
        throw new Error("Invalid content structure.");
      out.content = n.content.map((c) => visit(c, depth + 1, n.type));
    }
    return out;
  }
  return visit(value, 0, "root");
}
export function plainText(n: RichNode): string {
  return n.text || (n.content || []).map(plainText).join(" ");
}
export function assetIds(content: RichNode, cover: string): string[] {
  const ids = new Set<string>();
  const add = (s: unknown) => {
    if (typeof s === "string") {
      const m = mediaPattern.exec(s);
      if (m) ids.add(m[1]);
    }
  };
  add(cover);
  const walk = (n: RichNode) => {
    if (n.type === "image") add(n.attrs?.src);
    n.content?.forEach(walk);
  };
  walk(content);
  if (ids.size > 20) throw new Error("Use at most 20 images per article.");
  return [...ids];
}
export const postInput = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().max(350),
  author: z.string().trim().min(1).max(100),
  category: z.string().trim().max(60),
  cover: z
    .string()
    .max(200)
    .refine((s) => s === "" || mediaPattern.test(s)),
  coverAlt: z.string().trim().max(250),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(180),
  content: z.unknown().transform((value, ctx) => {
    try {
      return validateContent(value);
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: e instanceof Error ? e.message : "Invalid content",
      });
      return z.NEVER;
    }
  }),
});
export type PostInput = z.infer<typeof postInput>;
export type Post = PostInput & {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  publishedVersion: number | null;
  updatedBy: string;
};
export const blankPost = (): PostInput => ({
  title: "",
  slug: "",
  excerpt: "",
  author: "Premier International Transportation",
  category: "",
  cover: "",
  coverAlt: "",
  seoTitle: "",
  seoDescription: "",
  content: emptyContent,
});
export function publishReady(post: PostInput) {
  if (
    !post.excerpt ||
    !post.cover ||
    !post.coverAlt ||
    plainText(post.content).trim().length < 40
  )
    throw new Error(
      "Add an excerpt, cover image, image description, and article text before publishing.",
    );
}
export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100)
    .replace(/-$/g, "");
}
