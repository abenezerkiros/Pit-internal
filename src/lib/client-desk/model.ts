import { z } from "zod";
const text = (max = 5000) => z.string().trim().max(max);
const required = (max = 200) => text(max).min(1, "This field is required.");
export const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Enter a valid date.");
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const clientSchema = z
  .object({
    fullName: required(),
    title: text(150),
    company: text(200),
    clientSince: monthSchema,
    compiledBy: required(),
    addresses: text(),
    welcome: text(),
    arrangements: text(),
  })
  .strict();
export type ClientInput = z.infer<typeof clientSchema>;
export type Client = ClientInput & {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export const emptyClient: ClientInput = {
  fullName: "",
  title: "",
  company: "",
  clientSince: "",
  compiledBy: "",
  addresses: "",
  welcome: "",
  arrangements: "",
};
export const journeySchema = z
  .object({
    clientId: z.union([
      z.literal(""),
      z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
    ]),
    reservationId: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9-]{1,60}$/, "Enter the reservation number."),
    traveler: required(),
    phone: text(80),
    date: daySchema,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timeZone: required(80).refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Enter an IANA time zone."),
    pickup: required(1500),
    dropoff: required(1500),
    passengers: z.number().int().min(1).max(1000),
    chauffeur: text(200),
    chauffeurPhone: text(80),
    vehicle: text(250),
    plate: text(80),
    account: text(600),
    payment: text(600),
    service: text(300),
    notes: text(),
    flightNumber: text(100),
    additionalPassengers: text(1500),
  })
  .strict();
export type JourneyInput = z.infer<typeof journeySchema>;
export type Journey = JourneyInput & {
  id: string;
  revision: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
};
export const emptyJourney: JourneyInput = {
  clientId: "",
  reservationId: "",
  traveler: "",
  phone: "",
  date: "",
  time: "",
  timeZone: "America/New_York",
  pickup: "",
  dropoff: "",
  passengers: 1,
  chauffeur: "",
  chauffeurPhone: "",
  vehicle: "",
  plate: "",
  account: "",
  payment: "",
  service: "",
  notes: "",
  flightNumber: "",
  additionalPassengers: "",
};
export function monthBounds(month: string) {
  const parsed = monthSchema.parse(month);
  const [year, m] = parsed.split("-").map(Number);
  return {
    start: parsed + "-01",
    end: `${m === 12 ? year + 1 : year}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`,
  };
}
