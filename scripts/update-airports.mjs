import { mkdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE = "https://davidmegginson.github.io/ourairports-data/airports.csv";

// CSV parser supports escaped quotes, embedded commas/newlines, CRLF and BOM.
export function parseCSV(input) {
  const text = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field); field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("Airport CSV has an unterminated quoted field");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() ?? [];
  for (const key of ["id", "ident", "type", "name", "iata_code", "municipality", "iso_country"]) {
    if (!headers.includes(key)) throw new Error(`Airport CSV is missing ${key}`);
  }
  return rows.map((values) => Object.fromEntries(headers.map((key, i) => [key, values[i] ?? ""])));
}

export function compactAirports(rows) {
  const allowedTypes = new Set(["large_airport", "medium_airport", "small_airport", "seaplane_base", "heliport"]);
  const seen = new Set();
  return rows.filter((row) => {
    if (!allowedTypes.has(row.type) || !row.id || !row.name || seen.has(row.id)) return false;
    // Include active coded airports, including private/general aviation airports.
    if (!(row.iata_code || row.icao_code || row.gps_code || row.local_code)) return false;
    seen.add(row.id);
    return true;
  }).map((row) => ({
    id: row.id,
    code: row.iata_code.trim().toUpperCase(),
    icao: (row.icao_code || row.gps_code || "").trim().toUpperCase(),
    local: (row.local_code || "").trim().toUpperCase(),
    name: row.name,
    city: row.municipality,
    country: row.iso_country,
    type: row.type,
    scheduled: row.scheduled_service === "yes",
    keywords: row.keywords || "",
  }));
}

async function download() {
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Airport download failed (${response.status})`);
  return response.text();
}

export async function updateAirports() {
  // The script lives in <project>/scripts, independently of the caller's cwd.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const output = resolve(root, "src/data/airports.json");
  let previous;
  try {
    const existing = JSON.parse(await readFile(output, "utf8"));
    if (Array.isArray(existing.airports) && existing.airports.length > 1000) previous = existing;
  } catch { /* A first run has no cached dataset. */ }
  try {
    const airports = compactAirports(parseCSV(await download()));
    if (airports.length < 1000) throw new Error("Downloaded dataset is unexpectedly small; not replacing airport data");
    const dataset = { source: SOURCE, license: "Public Domain", updatedAt: new Date().toISOString(), airports };
    await mkdir(dirname(output), { recursive: true });
    const temporary = `${output}.${process.pid}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(dataset), "utf8");
      await rename(temporary, output);
    } finally { await unlink(temporary).catch(() => {}); }
    console.log(`Prepared ${airports.length.toLocaleString()} airports in src/data/airports.json`);
  } catch (error) {
    if (previous) {
      console.warn(`Airport refresh failed; using saved data from ${previous.updatedAt}. ${error.message}`);
      return;
    }
    throw new Error(`No airport data is available. Check your internet connection and rerun node scripts/update-airports.mjs. ${error.message}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  updateAirports().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
