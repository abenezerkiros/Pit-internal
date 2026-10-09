import { z } from "zod";
export const purposes = [
  "Airport transfer",
  "Business meeting",
  "Entertainment Detail",
  "Security detail",
  "Family travel",
  "Event",
  "Other",
] as const;
export const vehicles = [
  "Not assigned",
  "Mercedes E-Class",
  "Mercedes S-Class",
  "Chevrolet Suburban",
  "Cadillac Escalade",
  "Sprinter van",
  "24-passenger minibus",
  "28-passenger minibus",
  "40-passenger coach",
  "55-passenger coach",
] as const;
const requiredText = (max: number) =>
  z.string().trim().min(1, "This field is required.").max(max);
const optionalText = (max: number) => z.string().trim().max(max);
export const bookingSchema = z
  .object({
    traveler: requiredText(150),
    contactName: requiredText(150),
    email: z.string().trim().email().max(254),
    phone: requiredText(40),
    pickup: requiredText(500),
    dropoff: requiredText(500),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(value + "T00:00:00Z");
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, "Enter a valid date."),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    timeZone: requiredText(80).refine((value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Use an IANA time zone, e.g. America/New_York."),
    purpose: z.enum(purposes),
    vehicle: z.enum(vehicles),
    passengers: z.number().int().min(1).max(55),
    flightNumber: optionalText(40),
    preferences: optionalText(3000),
    notes: optionalText(3000),
    success: optionalText(3000),
  })
  .strict();
export type BookingInput = z.infer<typeof bookingSchema>;
export const emptyBooking: BookingInput = {
  traveler: "",
  contactName: "",
  email: "",
  phone: "",
  pickup: "",
  dropoff: "",
  date: "",
  time: "",
  timeZone: "America/New_York",
  purpose: "Airport transfer",
  vehicle: "Not assigned",
  passengers: 1,
  flightNumber: "",
  preferences: "",
  notes: "",
  success: "",
};
