import dataset from "@/data/airports.json";
import { buildAirportIndex, searchAirportIndex } from "@/lib/airport-search";
import { requireTeam, json, failure, HttpError } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const index = buildAirportIndex(dataset.airports);
export async function GET(request: Request) {
  try {
    await requireTeam(request);
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length > 150) throw new HttpError(400, "Search is too long.");
    return json({
      results: searchAirportIndex(index, query),
      source: "OurAirports",
      updatedAt: dataset.updatedAt,
    });
  } catch (error) {
    return failure(error);
  }
}
