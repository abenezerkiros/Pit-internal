import { emptyJourney, type JourneyInput } from "./model";
export type PdfWord = { str: string; x: number; y: number };
export type PdfPage = PdfWord[];
type Row = { y: number; words: PdfWord[]; text: string };
function rows(words: PdfWord[]): Row[] {
  const result: Row[] = [];
  for (const word of [...words]
    .filter((w) => w.str.trim())
    .sort((a, b) => b.y - a.y || a.x - b.x)) {
    let row = result.find((r) => Math.abs(r.y - word.y) < 2);
    if (!row) {
      row = { y: word.y, words: [], text: "" };
      result.push(row);
    }
    row.words.push(word);
  }
  return result.map((r) => ({
    ...r,
    words: r.words.sort((a, b) => a.x - b.x),
    text: r.words
      .sort((a, b) => a.x - b.x)
      .map((w) => w.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  }));
}
const tripStart =
  /(\d{1,2}\/\d{1,2}\/\d{4})\s*-?\s*Pick Up At:\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
export type ParsedBooking = { booking: JourneyInput; warnings: string[] };
export function parseManifest(pages: PdfPage[]): ParsedBooking {
  const bookings = parseManifests(pages);
  if (bookings.length !== 1)
    throw Error(
      "This PDF contains more than one booking. Use the multiple-booking importer.",
    );
  return bookings[0];
}
export function parseManifests(pages: PdfPage[]): ParsedBooking[] {
  const all = pages.flatMap((page) =>
    rows(page).filter(
      (r) =>
        !/^https?:|^Page\s|Showing \d+ to|^Price Total|^\d{1,2}\/\d{1,2}\/\d{2},|^\d+\s*\/\s*\d+$/.test(
          r.text,
        ),
    ),
  );
  const starts = all
    .map((r, i) => (tripStart.test(r.text) ? i : -1))
    .filter((i) => i >= 0);
  if (!starts.length)
    throw Error(
      "No booking found. Upload the original Reservations Manifest PDF, not a scanned image.",
    );
  const declared = pages
    .flatMap(rows)
    .map((r) => r.text)
    .join(" ")
    .match(/Showing\s+\d+\s+to\s+(\d+)\s+of\s+\d+\s+trips/i);
  if (declared && Number(declared[1]) !== starts.length)
    throw Error(
      "The report lists " +
        declared[1] +
        " trips but " +
        starts.length +
        " were readable. Export the complete text-based report again.",
    );
  return starts.map((start, index) => {
    try {
      return parseTrip(all.slice(start, starts[index + 1]));
    } catch (error) {
      throw Error(
        `Booking ${index + 1}: ${error instanceof Error ? error.message : "Unable to read booking."}`,
      );
    }
  });
}
function parseTrip(trip: Row[]): ParsedBooking {
  const match = trip[0].text.match(tripStart)!;
  const [month, day, year] = match[1].split("/");
  const hours =
    (Number(match[2]) % 12) + (match[4].toUpperCase() === "PM" ? 12 : 0);
  const booking = {
    ...emptyJourney,
    date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time: `${String(hours).padStart(2, "0")}:${match[3]}`,
  };
  booking.reservationId =
    trip[0].text
      .slice((match.index || 0) + match[0].length)
      .trim()
      .match(/[\w-]+$/)?.[0] || "";
  const headerIndex = trip.findIndex(
    (r) =>
      /Passenger/.test(r.text) &&
      /Driver Info/.test(r.text) &&
      /Payment/.test(r.text),
  );
  if (headerIndex < 0)
    throw Error(
      "The report columns could not be recognized. Please use the detailed reservations manifest.",
    );
  const before = trip
    .slice(1, headerIndex)
    .map((r) => r.text)
    .join("\n");
  booking.pickup =
    before
      .match(/(?:^|\n)PU:\s*([\s\S]*?)(?=\nDO:|\nStops\/Waits:|$)/)?.[1]
      ?.replace(/\n/g, " ")
      .trim() || "";
  booking.dropoff =
    before
      .match(
        /(?:^|\n)DO:\s*([\s\S]*?)(?=\n(?:No Notes Provided|Notes:)|$)/,
      )?.[1]
      ?.replace(/\n/g, " ")
      .trim() || "";
  booking.notes = before.match(/(?:^|\n)Notes:\s*([\s\S]*)/)?.[1]?.trim() || "";
  const stops = before
    .match(/(?:^|\n)Stops\/Waits:\s*([\s\S]*?)(?=\nDO:|$)/)?.[1]
    ?.trim();
  const endTime = trip[0].text.match(
    /Drop Off At:\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i,
  )?.[0];
  booking.notes = [
    endTime,
    stops ? "Stops/Waits:\n" + stops : "",
    booking.notes,
  ]
    .filter(Boolean)
    .join("\n");
  const header = trip[headerIndex];
  const labels = [
    "Passenger",
    "Account",
    "Driver Info",
    "Payment",
    "Trip Info",
  ];
  const bounds = labels.map(
    (label) => header.words.find((w) => w.str.trim() === label)?.x,
  );
  if (bounds.some((x) => x === undefined))
    throw Error(
      "The PDF column layout is not supported. Please upload the original detailed manifest.",
    );
  const extraIndex = trip.findIndex(
    (r, i) => i > headerIndex && /^Additional Passengers:/.test(r.text),
  );
  const body = trip.slice(
    headerIndex + 1,
    extraIndex < 0 ? undefined : extraIndex,
  );
  const cols = labels.map((_, i) =>
    body
      .map((r) =>
        r.words
          .filter(
            (w) =>
              w.x >= bounds[i]! - 3 && (i === 4 || w.x < bounds[i + 1]! - 3),
          )
          .map((w) => w.str)
          .join(" ")
          .trim(),
      )
      .filter(Boolean),
  );
  const phonePattern =
    /(?:\+\d[\d\s.-]*|\(\d{3}\)\s*\d{3}[-. ]\d{4}|\d{3}[-. ]\d{3}[-. ]\d{4})/;
  const nameRows: string[] = [];
  for (const row of cols[0]) {
    if (
      phonePattern.test(row) ||
      /\d+ passengers?|Child Seats:|No Pass Phone/i.test(row)
    )
      break;
    nameRows.push(row);
  }
  booking.traveler = nameRows.join(" ");
  booking.phone = cols[0].join(" ").match(phonePattern)?.[0] || "";
  const count = cols[0].join(" ").match(/(\d+) passengers?/i);
  booking.passengers = count ? Number(count[1]) : 1;
  const childIndex = cols[0].findIndex((r) => /Child Seats:/.test(r));
  if (childIndex >= 0)
    booking.notes = [booking.notes, cols[0].slice(childIndex).join(" ")]
      .filter(Boolean)
      .join("\n");
  booking.account = cols[1].join("\n");
  booking.payment = cols[3].join("\n");
  booking.service = cols[4].join(" · ");
  booking.chauffeur = /^No Driver Name$/i.test(cols[2][0] || "")
    ? ""
    : cols[2][0] || "";
  booking.chauffeurPhone = cols[2].join(" ").match(phonePattern)?.[0] || "";
  booking.plate =
    cols[2].find((r) => /^LP:/.test(r))?.replace(/^LP:\s*/, "") || "";
  booking.vehicle = cols[2]
    .slice(1)
    .filter(
      (r) =>
        !phonePattern.test(r) &&
        !/^LP:|^No Driver Phone$|^No Car Selected$/i.test(r),
    )
    .join(" · ");
  if (extraIndex >= 0)
    booking.additionalPassengers = trip
      .slice(extraIndex + 1)
      .map((r) => r.text)
      .join("\n");
  booking.flightNumber = booking.pickup.match(/Flt#\s*([\w-]+)/i)?.[1] || "";
  return {
    booking,
    warnings: [
      ...(!count
        ? ["Passenger count was not found; check the default of 1."]
        : []),
      "Confirm the pickup time zone; the PDF does not specify it.",
      "Check the passenger and linked client before saving.",
    ],
  };
}
