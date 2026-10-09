export type AirportRecord = {
  id: string;
  code: string;
  icao: string;
  local: string;
  name: string;
  city: string;
  country: string;
  type: string;
  scheduled: boolean;
  keywords: string;
};

export type AirportSuggestion = {
  place_id: string;
  formatted: string;
  address_line1: string;
  address_line2: string;
  name: string;
  categories: string[];
  airportCode: string;
  exactAirportCode: boolean;
};

export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Prepare once per server process, not once per keystroke.
export function buildAirportIndex(records: AirportRecord[]) {
  return records.map((airport) => ({
    airport,
    codes: [airport.code, airport.icao, airport.local]
      .filter(Boolean)
      .map(normalize),
    name: normalize(airport.name),
    city: normalize(airport.city),
    search: normalize(
      `${airport.name} ${airport.city} ${airport.country} ${airport.keywords} ${airport.code} ${airport.icao} ${airport.local}`,
    ),
  }));
}

export function searchAirportIndex(
  index: ReturnType<typeof buildAirportIndex>,
  text: string,
  limit = 6,
): AirportSuggestion[] {
  const query = normalize(text);
  if (query.length < 2 || query.length > 150) return [];
  const words = query.split(/\s+/);
  const matches = index.flatMap((entry) => {
    const exact = entry.codes.includes(query);
    // "JFK airport" should match JFK even if "airport" isn't part of its name.
    const usefulWords = words.filter(
      (word) => word !== "airport" && word !== "airports",
    );
    const allWords =
      usefulWords.length > 0 &&
      usefulWords.every((word) => entry.search.includes(word));
    if (
      !exact &&
      !allWords &&
      !(usefulWords.length === 0 && entry.airport.scheduled)
    )
      return [];
    const score =
      (exact ? 10000 : 0) +
      (entry.codes.some((code) => usefulWords.includes(code)) ? 4000 : 0) +
      (entry.codes.some((code) => code.startsWith(query)) ? 1500 : 0) +
      (entry.name === query ? 1000 : entry.name.startsWith(query) ? 700 : 0) +
      (entry.city === query ? 600 : entry.city.startsWith(query) ? 300 : 0) +
      (entry.airport.scheduled ? 100 : 0) +
      (entry.airport.type === "large_airport"
        ? 60
        : entry.airport.type === "medium_airport"
          ? 30
          : 0);
    return [{ ...entry, score, exact }];
  });
  return matches
    .sort(
      (a, b) =>
        b.score - a.score || a.airport.name.localeCompare(b.airport.name),
    )
    .slice(0, Math.max(1, Math.min(limit, 10)))
    .map(({ airport, exact }) => {
      const code = airport.code || airport.icao || airport.local;
      const title = `${airport.name}${code ? ` (${code})` : ""}`;
      const area = [airport.city, airport.country].filter(Boolean).join(", ");
      return {
        place_id: `ourairports-${airport.id}`,
        formatted: [title, area].filter(Boolean).join(", "),
        address_line1: title,
        address_line2: area,
        name: airport.name,
        categories: ["airport"],
        airportCode: code,
        exactAirportCode: exact,
      };
    });
}
