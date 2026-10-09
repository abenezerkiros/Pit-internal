import { requireTeam, json, failure } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return json({ user: await requireTeam(request) });
  } catch (error) {
    return failure(error);
  }
}
