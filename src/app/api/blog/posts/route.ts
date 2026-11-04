import { requireEditor } from "@/lib/premier-blog/auth";
import {
  bodyJson,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/premier-blog/http";
import { changePost, getPost, listPosts } from "@/lib/premier-blog/posts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    await requireEditor(req);
    const id = new URL(req.url).searchParams.get("id");
    if (id && !/^[A-Za-z0-9]{20}$/.test(id))
      throw new HttpError(400, "Invalid post ID.");
    return json(
      id
        ? { post: await getPost(id) }
        : await listPosts(
            new URL(req.url).searchParams.get("after") || undefined,
          ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await requireEditor(req);
    return json(await changePost(await bodyJson(req), user.email));
  } catch (e) {
    return failure(e);
  }
}
