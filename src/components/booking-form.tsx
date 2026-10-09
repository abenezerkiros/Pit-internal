"use client";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  MapPin,
  UserRound,
  CarFront,
  NotebookPen,
} from "lucide-react";
import {
  bookingSchema,
  emptyBooking,
  purposes,
  vehicles,
  type BookingInput,
} from "@/lib/booking";
import { teamFetch } from "./auth";
import LocationAutocomplete from "./location-autocomplete";
export default function BookingForm({
  onSaved,
}: {
  onSaved: (reference: string) => void;
}) {
  const [values, setValues] = useState<BookingInput>({ ...emptyBooking });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const key = useRef<string | null>(null);
  const attempt = useRef<string | null>(null);
  function update<K extends keyof BookingInput>(
    name: K,
    value: BookingInput[K],
  ) {
    setValues((old) => ({ ...old, [name]: value }));
  }
  function field(
    name: keyof BookingInput,
    label: string,
    type = "text",
    required = true,
    placeholder = "",
    maxLength = 150,
  ) {
    return (
      <label className="field">
        <span>
          {label}
          {!required && <small> Optional</small>}
        </span>
        <input
          name={name}
          type={type}
          required={required}
          value={values[name]}
          disabled={busy}
          placeholder={placeholder}
          maxLength={maxLength}
          onChange={(event) => update(name, event.target.value)}
        />
      </label>
    );
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const parsed = bookingSchema.safeParse(values);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      );
      return;
    }
    const payload = JSON.stringify(parsed.data);
    // Keep the same key after network failures, preventing duplicate records on retry.
    if (!key.current) {
      key.current = crypto.randomUUID();
      attempt.current = payload;
    }
    if (attempt.current !== payload) {
      setError(
        "A previous save may have reached the server. Restore the submitted details and retry to confirm the original save.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await teamFetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key.current,
        },
        body: payload,
      });
      key.current = null;
      attempt.current = null;
      setValues({ ...emptyBooking });
      onSaved(data.reference);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save the booking.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="booking-form">
      <div className="form-main">
        <section className="panel">
          <div className="panel-heading">
            <MapPin size={19} />
            <h2>The journey</h2>
            <span>01</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Pick-up location</span>
              <LocationAutocomplete
                id="pickup"
                name="pickup"
                disabled={busy}
                value={values.pickup}
                required
                maxLength={500}
                placeholder="Airport, address or hotel"
                onChange={(value) => update("pickup", value)}
              />
            </label>
            <label className="field">
              <span>Drop-off location</span>
              <LocationAutocomplete
                id="dropoff"
                name="dropoff"
                disabled={busy}
                value={values.dropoff}
                required
                maxLength={500}
                placeholder="Where are we taking them?"
                onChange={(value) => update("dropoff", value)}
              />
            </label>
            {field("date", "Pick-up date", "date")}
            {field("time", "Pick-up time", "time")}
            {field(
              "timeZone",
              "Pick-up time zone",
              "text",
              true,
              "America/New_York",
              80,
            )}
            {field(
              "flightNumber",
              "Flight number",
              "text",
              false,
              "e.g. AA123",
              40,
            )}
          </div>
          <p className="field-note">
            Use the local time at the pick-up location. Washington, D.C. uses
            America/New_York.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <UserRound size={19} />
            <h2>The people</h2>
            <span>02</span>
          </div>
          <div className="form-grid">
            {field(
              "traveler",
              "Principal / traveler",
              "text",
              true,
              "Full name",
            )}
            {field("contactName", "Booking contact", "text", true, "Full name")}
            {field(
              "email",
              "Contact email",
              "email",
              true,
              "name@company.com",
              254,
            )}
            {field(
              "phone",
              "Contact phone",
              "tel",
              true,
              "Include country code",
              40,
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <CarFront size={19} />
            <h2>Service details</h2>
            <span>03</span>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Purpose</span>
              <select
                value={values.purpose}
                disabled={busy}
                onChange={(event) =>
                  update(
                    "purpose",
                    event.target.value as BookingInput["purpose"],
                  )
                }
              >
                {purposes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Vehicle preference</span>
              <select
                value={values.vehicle}
                disabled={busy}
                onChange={(event) =>
                  update(
                    "vehicle",
                    event.target.value as BookingInput["vehicle"],
                  )
                }
              >
                {vehicles.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Passengers</span>
              <input
                type="number"
                min={1}
                max={55}
                required
                disabled={busy}
                value={values.passengers}
                onChange={(event) =>
                  update(
                    "passengers",
                    event.target.value === "" ? 0 : Number(event.target.value),
                  )
                }
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <NotebookPen size={19} />
            <h2>The finer details</h2>
            <span>04</span>
          </div>
          <label className="field">
            <span>
              What matters most <small>Optional</small>
            </span>
            <textarea
              rows={3}
              maxLength={3000}
              disabled={busy}
              value={values.success}
              onChange={(event) => update("success", event.target.value)}
              placeholder="What would make this journey feel just right?"
            />
          </label>
          <label className="field">
            <span>
              Passenger preferences <small>Optional</small>
            </span>
            <textarea
              rows={3}
              maxLength={3000}
              disabled={busy}
              placeholder="Water, temperature, accessibility needs, or anything to prepare."
              value={values.preferences}
              onChange={(event) => update("preferences", event.target.value)}
            />
          </label>
          <label className="field">
            <span>
              Internal notes <small>Optional</small>
            </span>
            <textarea
              rows={3}
              maxLength={3000}
              disabled={busy}
              placeholder="Details for the Client Experience Team."
              value={values.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>
        </section>
      </div>
      <aside className="summary panel">
        <p className="eyebrow">PERSONALLY ARRANGED</p>
        <h2>
          Every detail.
          <br />
          Taken care of.
        </h2>
        <p>Create a booking record for the team to coordinate.</p>
        <div className="summary-route">
          <MapPin size={17} />
          <div>
            <small>PICK-UP</small>
            <p>{values.pickup || "Add a pick-up location"}</p>
            <small>DESTINATION</small>
            <p>{values.dropoff || "Add a destination"}</p>
          </div>
        </div>
        <div className="summary-note">
          <Check size={16} />
          <span>Saved securely with your name and a booking reference.</span>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy} type="submit">
          {busy ? "Saving booking…" : "Create booking"}
          <ArrowRight size={16} />
        </button>
        <small className="disclaimer">
          Saved as New. Vehicle and chauffeur availability must be confirmed by
          your team.
        </small>
      </aside>
    </form>
  );
}
