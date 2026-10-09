import test from "node:test";
import assert from "node:assert/strict";
import { isTeamEmail, isTeamIdentity } from "../src/lib/policy";
import { bookingSchema, emptyBooking } from "../src/lib/booking";
test("exact company domain only", () => {
  assert.equal(isTeamEmail("abe@pitdrives.com"), true);
  assert.equal(isTeamEmail("ABE@PITDRIVES.COM"), true);
  for (const email of [
    "abe@gmail.com",
    "abe@pitdrives.com.attacker.com",
    "abe@fakepitdrives.com",
    "a@staff.pitdrives.com",
    "a@@pitdrives.com",
    " a@pitdrives.com",
    null,
  ])
    assert.equal(isTeamEmail(email), false);
});
test("must use verified Google identity", () => {
  const valid = {
    email: "abe@pitdrives.com",
    email_verified: true,
    firebase: { sign_in_provider: "google.com" },
  };
  assert.equal(isTeamIdentity(valid), true);
  assert.equal(isTeamIdentity({ ...valid, email_verified: false }), false);
  assert.equal(
    isTeamIdentity({ ...valid, firebase: { sign_in_provider: "password" } }),
    false,
  );
  assert.equal(isTeamIdentity({ ...valid, email: "person@gmail.com" }), false);
});
const booking = {
  ...emptyBooking,
  traveler: "Client",
  contactName: "Assistant",
  email: "client@example.com",
  phone: "+1 202 555 0100",
  pickup: "DCA",
  dropoff: "Washington DC",
  date: "2027-01-20",
  time: "14:30",
};
test("valid booking and leap date handling", () => {
  assert.equal(bookingSchema.safeParse(booking).success, true);
  assert.equal(
    bookingSchema.safeParse({ ...booking, date: "2027-02-30" }).success,
    false,
  );
  assert.equal(
    bookingSchema.safeParse({ ...booking, date: "2028-02-29" }).success,
    true,
  );
});
test("reject forged server fields and invalid data", () => {
  for (const changes of [
    { createdBy: "fake" },
    { status: "Confirmed" },
    { passengers: 0 },
    { passengers: 56 },
    { time: "25:30" },
    { timeZone: "not/a-zone" },
    { pickup: "" },
    { notes: "a".repeat(3001) },
  ])
    assert.equal(
      bookingSchema.safeParse({ ...booking, ...changes }).success,
      false,
    );
});

test("internal booking route is submission-only and does not send email", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const route = readFileSync(
    new URL("../src/app/api/bookings/route.ts", import.meta.url),
    "utf8",
  );
  assert.ok(route.includes("requireTeam(request)"));
  assert.ok(route.includes('.collection("bookings")'));
  assert.ok(!route.includes("export async function GET"));
  assert.ok(!route.includes("notifyBooking") && !route.includes("resend"));
  assert.equal(
    existsSync(
      new URL("../src/app/api/bookings/[id]/route.ts", import.meta.url),
    ),
    false,
  );
});
