import test from "node:test";
import assert from "node:assert/strict";
import {
  parseManifest,
  parseManifests,
  type PdfPage,
} from "../src/lib/client-desk/manifest";
import {
  clientSchema,
  journeySchema,
  emptyClient,
  emptyJourney,
  monthBounds,
} from "../src/lib/client-desk/model";
function manifest(): PdfPage {
  return [
    { str: "11/06/2026 - Pick Up At: 12:30 PM", x: 40, y: 700 },
    { str: "TEST-123", x: 550, y: 700 },
    { str: "PU: Example Airport, Flt# 123", x: 40, y: 670 },
    { str: "DO: Example Hotel", x: 40, y: 650 },
    { str: "Notes:", x: 40, y: 630 },
    { str: "Meet in lobby.", x: 40, y: 610 },
    ...["Passenger", "Account", "Driver Info", "Payment", "Trip Info"].map(
      (str, i) => ({ str, x: 40 + i * 110, y: 580 }),
    ),
    { str: "Alex Example", x: 40, y: 560 },
    { str: "Example company", x: 150, y: 560 },
    { str: "Jordan Driver", x: 260, y: 560 },
    { str: "Credit Card", x: 370, y: 560 },
    { str: "Airport Arrival", x: 480, y: 560 },
    { str: "(202) 555-0100", x: 40, y: 540 },
    { str: "C: (202) 555-0101", x: 260, y: 540 },
    { str: "2 passengers", x: 40, y: 520 },
    { str: "SUV", x: 260, y: 520 },
    { str: "UNPAID", x: 370, y: 520 },
    { str: "Cadillac Escalade", x: 260, y: 500 },
    { str: "LP: TEST", x: 260, y: 480 },
  ];
}
test("single report separates columns and extracts booking fields", () => {
  const { booking: b } = parseManifest([manifest()]);
  assert.equal(b.reservationId, "TEST-123");
  assert.equal(b.traveler, "Alex Example");
  assert.equal(b.account, "Example company");
  assert.equal(b.chauffeur, "Jordan Driver");
  assert.equal(b.payment, "Credit Card\nUNPAID");
  assert.equal(b.phone, "(202) 555-0100");
  assert.equal(b.chauffeurPhone, "(202) 555-0101");
  assert.equal(b.passengers, 2);
  assert.equal(b.date, "2026-11-06");
  assert.equal(b.time, "12:30");
  assert.equal(b.notes, "Meet in lobby.");
  assert.equal(b.flightNumber, "123");
  assert.equal(b.plate, "TEST");
  assert.equal(
    journeySchema.safeParse({ ...b, clientId: "test-client" }).success,
    true,
  );
});
test("midnight, noon and afternoon parse correctly", () => {
  for (const [time, result] of [
    ["12:30 AM", "00:30"],
    ["12:30 PM", "12:30"],
    ["01:30 PM", "13:30"],
  ]) {
    const words = manifest();
    words[0].str = "11/06/2026 - Pick Up At: " + time;
    assert.equal(parseManifest([words]).booking.time, result);
  }
});
test("multiple bookings are rejected on one or several pages", () => {
  assert.throws(() => parseManifest([manifest(), manifest()]), /more than one/);
  assert.throws(
    () =>
      parseManifest([
        manifest().concat(manifest().map((w) => ({ ...w, y: w.y - 400 }))),
      ]),
    /more than one/,
  );
});
test("scanned, empty and unknown-layout PDFs fail explicitly", () => {
  assert.throws(() => parseManifest([[]]), /No booking/);
  assert.throws(
    () => parseManifest([manifest().filter((w) => w.y !== 580)]),
    /columns/,
  );
});
test("wrapped names do not pick up neighboring account fields", () => {
  const w = manifest();
  w.find((w) => w.str === "Alex Example")!.str = "Alex";
  w.push({ str: "Example", x: 40, y: 550 });
  assert.equal(parseManifest([w]).booking.traveler, "Alex Example");
});
test("missing passenger count is flagged", () => {
  assert.ok(
    parseManifest([
      manifest().filter((w) => w.str !== "2 passengers"),
    ]).warnings.some((w) => w.includes("Passenger count")),
  );
});
test("profile validates required fields and rejects forged metadata", () => {
  const v = {
    ...emptyClient,
    fullName: "Alex",
    clientSince: "2026-11",
    compiledBy: "CX Lead",
  };
  assert.equal(clientSchema.safeParse(v).success, true);
  for (const change of [
    { clientSince: "2026-13" },
    { fullName: "" },
    { updatedAt: "forged" },
    { addresses: "a".repeat(5001) },
  ])
    assert.equal(clientSchema.safeParse({ ...v, ...change }).success, false);
});
test("journey validates dates, times, identity, timezone and counts", () => {
  const v = {
    ...emptyJourney,
    clientId: "c1",
    reservationId: "123",
    traveler: "Alex",
    pickup: "A",
    dropoff: "B",
    date: "2028-02-29",
    time: "12:00",
  };
  assert.equal(journeySchema.safeParse(v).success, true);
  for (const change of [
    { date: "2027-02-29" },
    { time: "24:00" },
    { timeZone: "not-a-zone" },
    { passengers: 0 },
    { passengers: 1.5 },
    { clientId: "../private" },
    { createdBy: "fake" },
    { reservationId: "" },
  ])
    assert.equal(journeySchema.safeParse({ ...v, ...change }).success, false);
});
test("calendar range handles year boundaries", () => {
  assert.deepEqual(monthBounds("2026-12"), {
    start: "2026-12-01",
    end: "2027-01-01",
  });
  assert.throws(() => monthBounds("2026-13"));
});

test("batch import isolates bookings on one page and across pages", () => {
  const second = manifest().map((w) => ({
    ...w,
    str:
      w.str === "TEST-123"
        ? "TEST-456"
        : w.str === "Alex Example"
          ? "Another Passenger"
          : w.str,
  }));
  for (const pages of [
    [manifest(), second],
    [manifest().concat(second.map((w) => ({ ...w, y: w.y - 400 })))],
  ]) {
    const parsed = parseManifests(pages);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].booking.reservationId, "TEST-123");
    assert.equal(parsed[1].booking.reservationId, "TEST-456");
    assert.equal(parsed[0].booking.traveler, "Alex Example");
    assert.equal(parsed[1].booking.traveler, "Another Passenger");
    assert.equal(parsed[0].booking.vehicle, "SUV · Cadillac Escalade");
    assert.equal(parsed[1].booking.payment, "Credit Card\nUNPAID");
  }
});
test("a malformed later trip blocks parsing instead of silently dropping it", () => {
  assert.throws(
    () => parseManifests([manifest(), manifest().filter((w) => w.y !== 580)]),
    /Booking 2:.*columns/,
  );
});
test("a booking continued onto the next page retains its fields", () => {
  const words = manifest();
  const parsed = parseManifests([
    words.filter((w) => w.y >= 540),
    words.filter((w) => w.y < 540),
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].booking.plate, "TEST");
  assert.equal(parsed[0].booking.passengers, 2);
});

test("report with a missing phone keeps the passenger name clean", () => {
  const words = manifest();
  words.find((w) => w.str === "(202) 555-0100")!.str = "No Pass Phone";
  assert.equal(parseManifests([words])[0].booking.traveler, "Alex Example");
  assert.equal(parseManifests([words])[0].booking.phone, "");
});
test("report count mismatch blocks an incomplete import", () => {
  assert.throws(() => parseManifests([[
    {str:"Showing 1 to 40 of 40 trips",x:40,y:750}, ...manifest()
  ]]), /40 trips but 1/);
});
test("stops and end time are preserved in notes", () => {
  const words = manifest();
  words[0].str += " Drop Off At: 05:00 PM";
  words.push({str:"Stops/Waits:",x:40,y:665},{str:"1. ST: Example Venue",x:40,y:660});
  const { booking } = parseManifests([words])[0];
  assert.equal(booking.pickup, "Example Airport, Flt# 123");
  assert.match(booking.notes, /Drop Off At: 05:00 PM/);
  assert.match(booking.notes, /Example Venue/);
  assert.match(booking.notes, /Meet in lobby/);
});
test("bookings without a linked profile validate normally", () => {
  const {booking}=parseManifests([manifest()])[0];
  assert.equal(journeySchema.safeParse({...booking, clientId:""}).success,true);
  assert.equal(journeySchema.safeParse({...booking, clientId:"../bad"}).success,false);
});
