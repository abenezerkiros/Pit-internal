"use client";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Plus,
  Search,
  Users,
  X,
  Pencil,
  Check,
  LoaderCircle,
} from "lucide-react";
import { teamFetch, useTeam } from "../auth";
import {
  emptyClient,
  emptyJourney,
  journeySchema,
  type Client,
  type ClientInput,
  type Journey,
  type JourneyInput,
} from "@/lib/client-desk/model";
import styles from "./desk.module.css";
import { matchClient } from "@/lib/client-desk/match-client";
const errText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
const shortDate = (v: string) =>
  v
    ? new Date(v + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? styles.wide : undefined}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}
function ErrorNote({ message }: { message: string }) {
  return message ? (
    <p className="error" role="alert">
      {message}
    </p>
  ) : null;
}
function Loading() {
  return (
    <p className={styles.loading} role="status">
      <LoaderCircle size={18} /> Loading…
    </p>
  );
}
function ProfileContent({ client }: { client: Client }) {
  return (
    <>
      <div className={styles.profileHeading}>
        <span className={styles.monogram}>
          {client.fullName
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <h2>{client.fullName}</h2>
          <p>
            {[client.title, client.company].filter(Boolean).join(" · ") ||
              "Client profile"}
          </p>
        </div>
      </div>
      <div className={styles.metadata}>
        <span>
          Client since{" "}
          <b>{client.clientSince.split("-").reverse().join("/")}</b>
        </span>
        <span>
          Updated{" "}
          <b>
            {client.updatedAt
              ? new Date(client.updatedAt).toLocaleDateString("en-US")
              : "—"}
          </b>
        </span>
        <span>
          Compiled by <b>{client.compiledBy}</b>
        </span>
      </div>
      <div className={styles.profileGrid}>
        {[
          ["Significant addresses", client.addresses],
          ["The welcome", client.welcome],
          ["Standing arrangements", client.arrangements],
        ].map(([title, value]) => (
          <section key={title}>
            <h3>{title}</h3>
            <p>{value || "Not recorded yet."}</p>
          </section>
        ))}
      </div>
    </>
  );
}
export function ClientDirectory() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        let cursor: string | null = null;
        const all: Client[] = [];
        do {
          const data = await teamFetch(
            "/api/clients" + (cursor ? "?cursor=" + cursor : ""),
          );
          all.push(...data.clients);
          cursor = data.nextCursor;
        } while (cursor && active);
        if (active) setClients(all);
      } catch (e) {
        if (active) setError(errText(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [retry]);
  const filtered = clients
    .filter((c) =>
      `${c.fullName} ${c.company} ${c.title}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  return (
    <div className={styles.desk}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">PREMIER / CLIENT EXPERIENCE</p>
          <h1>
            Known. Remembered.
            <br />
            <em>Considered.</em>
          </h1>
          <p>Every detail that makes their journey personal, in one place.</p>
        </div>
        <Link className="button primary" href="/clients/new">
          <Plus size={17} /> Add client
        </Link>
      </div>
      <div className={styles.directoryBar}>
        <h2>
          Our clients <span>{clients.length}</span>
        </h2>
        <label className={styles.search}>
          <Search size={18} />
          <input
            aria-label="Search clients"
            placeholder="Search name or company"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <ErrorNote message={error} />
      {error && (
        <button className="button" onClick={() => setRetry((n) => n + 1)}>
          Try again
        </button>
      )}
      {loading ? (
        <Loading />
      ) : !clients.length && !error ? (
        <div className={styles.empty}>
          <Users size={32} />
          <h2>Great care starts with knowing someone.</h2>
          <p>
            Create your first client profile to begin arranging their journeys.
          </p>
          <Link className="button primary" href="/clients/new">
            <Plus size={16} /> Create client profile
          </Link>
        </div>
      ) : (
        <div className={styles.clientGrid}>
          {filtered.map((c) => (
            <Link
              href={"/clients/" + c.id}
              className={styles.clientCard}
              key={c.id}
            >
              <div className={styles.cardTop}>
                <span className={styles.monogram}>
                  {c.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <ArrowRight size={19} />
              </div>
              <h3>{c.fullName}</h3>
              <p>
                {[c.title, c.company].filter(Boolean).join(" · ") ||
                  "Premier client"}
              </p>
              <small>COMPILED BY {c.compiledBy}</small>
            </Link>
          ))}
        </div>
      )}
      {!loading && clients.length > 0 && !filtered.length && (
        <p className={styles.empty}>No clients match your search.</p>
      )}
    </div>
  );
}
function ClientEditor({
  client,
  onSaved,
  onCancel,
}: {
  client?: Client;
  onSaved: (id: string) => void;
  onCancel?: () => void;
}) {
  const { user } = useTeam();
  const [value, setValue] = useState<ClientInput>(
    client
      ? (Object.fromEntries(
          Object.keys(emptyClient).map((k) => [
            k,
            client[k as keyof ClientInput],
          ]),
        ) as ClientInput)
      : {
          ...emptyClient,
          compiledBy: user?.name || "",
          clientSince: new Date().toISOString().slice(0, 7),
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const set = (key: keyof ClientInput, v: string) =>
    setValue((x) => ({ ...x, [key]: v }));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await teamFetch(
        "/api/clients" + (client ? "/" + client.id : ""),
        {
          method: client ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...value,
            ...(client ? { revision: client.revision } : {}),
          }),
        },
      );
      onSaved(data.id);
    } catch (e) {
      setError(errText(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className={styles.form}>
      <ErrorNote message={error} />
      <fieldset disabled={busy}>
        <div className={styles.formGrid}>
          <Field label="Client full name">
            <input
              required
              maxLength={200}
              autoComplete="name"
              value={value.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </Field>
          <Field label="Title">
            <input
              maxLength={150}
              placeholder="e.g. Managing Director"
              value={value.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label="Company">
            <input
              maxLength={200}
              value={value.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </Field>
          <Field label="Client since">
            <input
              type="month"
              required
              value={value.clientSince}
              onChange={(e) => set("clientSince", e.target.value)}
            />
          </Field>
          <Field label="Compiled by" wide>
            <input
              required
              maxLength={200}
              value={value.compiledBy}
              onChange={(e) => set("compiledBy", e.target.value)}
            />
          </Field>
          <Field label="Significant addresses" wide>
            <p className={styles.hint}>
              Home, office, and repeat destinations—with the client’s shorthand
              for each (“the house,” “the club,” “Teterboro”).
            </p>
            <textarea
              rows={5}
              maxLength={5000}
              value={value.addresses}
              onChange={(e) => set("addresses", e.target.value)}
            />
          </Field>
          <Field label="The welcome" wide>
            <p className={styles.hint}>
              Preferred address, curbside vs. lobby meet, door service, signage,
              small talk vs. silence.
            </p>
            <textarea
              rows={4}
              maxLength={5000}
              value={value.welcome}
              onChange={(e) => set("welcome", e.target.value)}
            />
          </Field>
          <Field label="Standing arrangements" wide>
            <p className={styles.hint}>
              Usual vehicle, preferred chauffeur, typical buffers, billing, and
              recurring runs.
            </p>
            <textarea
              rows={4}
              maxLength={5000}
              value={value.arrangements}
              onChange={(e) => set("arrangements", e.target.value)}
            />
          </Field>
        </div>
        <div className={styles.actions}>
          {onCancel && (
            <button type="button" className="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save client profile"}
            <Check size={17} />
          </button>
        </div>
      </fieldset>
    </form>
  );
}
export function NewClient() {
  const router = useRouter();
  return (
    <div className={styles.desk}>
      <Link href="/" className={styles.back}>
        <ArrowLeft size={16} /> Clients
      </Link>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">A PERSONAL STANDARD</p>
          <h1>Create a client profile.</h1>
          <p>Keep the details that make thoughtful service second nature.</p>
        </div>
      </div>
      <ClientEditor onSaved={(id) => router.push("/clients/" + id)} />
    </div>
  );
}
export function ClientDetail({ id }: { id: string }) {
  const [client, setClient] = useState<Client | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await teamFetch("/api/clients/" + id);
        if (active) setClient(data.client);
        let cursor: string | null = null;
        const all: Journey[] = [];
        do {
          const trips = await teamFetch(
            "/api/journeys?clientId=" +
              id +
              (cursor ? "&cursor=" + cursor : ""),
          );
          all.push(...trips.journeys);
          cursor = trips.nextCursor;
        } while (cursor && active);
        if (active) setJourneys(all);
      } catch (e) {
        if (active) setError(errText(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, tick]);
  return (
    <div className={styles.desk}>
      <Link href="/" className={styles.back}>
        <ArrowLeft size={16} /> All clients
      </Link>
      <ErrorNote message={error} />
      {error && (
        <button className="button" onClick={() => setTick((n) => n + 1)}>
          Reload
        </button>
      )}
      {loading ? (
        <Loading />
      ) : (
        client && (
          <>
            <div className={styles.sectionBar}>
              <p className="eyebrow">CLIENT DOSSIER</p>
              <button className="button" onClick={() => setEditing((v) => !v)}>
                <Pencil size={15} />
                {editing ? "Close editor" : "Edit profile"}
              </button>
            </div>
            {editing ? (
              <ClientEditor
                client={client}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  setTick((n) => n + 1);
                }}
              />
            ) : (
              <div className={styles.profile}>
                <ProfileContent client={client} />
              </div>
            )}
            <div className={styles.sectionBar}>
              <h2>Client journeys</h2>
              <Link href="/calendar" className={styles.back}>
                <CalendarDays size={16} /> Open calendar
              </Link>
            </div>
            <BookingList journeys={journeys} onOpen={setSelected} />
          </>
        )
      )}
      {selected && (
        <BookingPanel
          id={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setTick((n) => n + 1)}
        />
      )}
    </div>
  );
}
function BookingFields({
  value,
  set,
  locked = false,
}: {
  value: JourneyInput;
  set: (v: JourneyInput) => void;
  locked?: boolean;
}) {
  const update = (k: keyof JourneyInput, v: string | number) =>
    set({ ...value, [k]: v });
  const fields: [keyof JourneyInput, string, string, boolean][] = [
    ["reservationId", "Reservation number", "text", true],
    ["traveler", "Passenger name", "text", true],
    ["date", "Pickup date", "date", true],
    ["time", "Pickup time", "time", true],
    ["timeZone", "Pickup time zone", "text", true],
    ["passengers", "Passengers", "number", true],
    ["phone", "Passenger phone", "tel", false],
    ["flightNumber", "Flight number", "text", false],
    ["chauffeur", "Chauffeur", "text", false],
    ["chauffeurPhone", "Chauffeur phone", "tel", false],
    ["vehicle", "Vehicle / class", "text", false],
    ["plate", "License plate", "text", false],
  ];
  return (
    <div className={styles.formGrid}>
      {fields.map(([key, label, type, required]) => (
        <Field key={key} label={label}>
          <input
            type={type}
            required={required}
            readOnly={locked && key === "reservationId"}
            min={type === "number" ? 1 : undefined}
            max={type === "number" ? 1000 : undefined}
            step={type === "number" ? 1 : undefined}
            maxLength={500}
            value={value[key]}
            onChange={(e) =>
              update(
                key,
                type === "number" ? Number(e.target.value) : e.target.value,
              )
            }
          />
        </Field>
      ))}
      {(
        [
          ["pickup", "Pickup location"],
          ["dropoff", "Drop-off location"],
          ["account", "Account / billing contact"],
          ["payment", "Payment information"],
          ["service", "Trip / service information"],
          ["additionalPassengers", "Additional passengers"],
          ["notes", "Trip notes"],
        ] as [keyof JourneyInput, string][]
      ).map(([key, label]) => (
        <Field key={key} label={label} wide>
          <textarea
            rows={key === "notes" ? 4 : 2}
            maxLength={key === "notes" ? 5000 : 1500}
            value={value[key]}
            onChange={(e) => update(key, e.target.value)}
          />
        </Field>
      ))}
    </div>
  );
}
export function BookingsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className={styles.desk}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">PREMIER / RESERVATIONS</p>
          <h1>
            Every booking.
            <br />
            <em>One place.</em>
          </h1>
          <p>
            Import a report for all your passengers. We connect the profiles you
            already know.
          </p>
        </div>
        <Link className="button primary" href="/calendar">
          <CalendarDays size={17} /> View calendar
        </Link>
      </div>
      <ImportBooking onSaved={setSelected} />
      {selected && (
        <BookingPanel
          id={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}
type ImportDraft = {
  value: JourneyInput;
  warnings: string[];
  savedId?: string;
  error?: string;
};
function ImportBooking({ onSaved }: { onSaved: (id: string) => void }) {
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submitLock = useRef(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const saved = drafts.filter((d) => d.savedId);
  const pending = drafts.filter((d) => !d.savedId);
  function reset() {
    setDrafts([]);
    setFileName("");
    setError("");
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
    if (saved.length) onSaved(saved[0].savedId!);
  }
  async function upload(file: File) {
    const run = ++generation.current;
    setBusy(true);
    setError("");
    setDrafts([]);
    setConfirmed(false);
    setFileName(file.name);
    try {
      const { readBookingPdf } = await import("@/lib/client-desk/read-pdf");
      const bookings = await readBookingPdf(file);
      const all: Client[] = [];
      let cursor: string | null = null;
      do {
        const data = await teamFetch(
          "/api/clients" +
            (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
        );
        all.push(...data.clients);
        cursor = data.nextCursor;
      } while (cursor && run === generation.current);
      if (run !== generation.current) return;
      setClients(all.sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setDrafts(
        bookings.map((item) => ({
          value: {
            ...item.booking,
            clientId: matchClient(item.booking.traveler, all).clientId,
          },
          warnings: item.warnings,
        })),
      );
    } catch (e) {
      if (run === generation.current) setError(errText(e));
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }
  function update(index: number, value: JourneyInput) {
    value = {
      ...value,
      clientId: matchClient(value.traveler, clients).clientId,
    };
    setConfirmed(false);
    setDrafts((items) =>
      items.map((item, i) =>
        i === index ? { ...item, value, error: undefined } : item,
      ),
    );
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!pending.length || !confirmed || submitLock.current) return;
    // Validate the entire report before making the first write.
    const ids = new Set<string>();
    for (const [index, item] of drafts.entries()) {
      const id = item.value.reservationId.trim().toUpperCase();
      if (ids.has(id)) {
        setError(
          "Duplicate reservation number " +
            id +
            " in this report. Discard this import and upload a report with unique reservations.",
        );
        return;
      }
      ids.add(id);
      if (item.savedId) continue;
      const result = journeySchema.safeParse(item.value);
      if (!result.success) {
        setError(
          "Booking " +
            (index + 1) +
            ": " +
            result.error.issues
              .map((issue) => issue.path.join(".") + " — " + issue.message)
              .join("; "),
        );
        return;
      }
    }
    submitLock.current = true;
    setBusy(true);
    setError("");
    let failures = 0;
    try {
      for (const [index, item] of drafts.entries()) {
        if (item.savedId) continue;
        try {
          const data = await teamFetch("/api/journeys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.value),
          });
          setDrafts((items) =>
            items.map((entry, i) =>
              i === index
                ? { ...entry, savedId: data.id, error: undefined }
                : entry,
            ),
          );
        } catch (e) {
          failures++;
          setDrafts((items) =>
            items.map((entry, i) =>
              i === index ? { ...entry, error: errText(e) } : entry,
            ),
          );
        }
      }
      if (failures)
        setError(
          failures +
            " booking(s) could not be saved. See the errors below. Saved bookings are already on the calendar; retry only the remaining ones.",
        );
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }
  return (
    <section className={styles.import}>
      <div className={styles.importIntro}>
        <span className={styles.importIcon}>
          <FileUp size={26} />
        </span>
        <div>
          <p className="eyebrow">THE NEXT JOURNEYS</p>
          <h2>One report. Every reservation.</h2>
          <p>
            Upload a manifest with one or several bookings. Review each journey
            and its linked client, then save them to the calendar.
          </p>
        </div>
      </div>
      <label className={styles.upload}>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy || drafts.length > 0}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <span>{busy ? "Processing…" : fileName || "Choose a booking PDF"}</span>
        <small>
          PDF · up to 20 MB · 100 pages maximum · text-based detailed manifest
        </small>
      </label>
      <ErrorNote message={error} />
      {drafts.length > 0 && (
        <form noValidate onSubmit={save} className={styles.importForm}>
          <p role="status">
            <strong>
              {drafts.length} bookings found · {saved.length} saved ·{" "}
              {pending.length} remaining
            </strong>
          </p>
          <p>
            Matching client profiles are linked automatically by passenger name.
            Unmatched bookings are saved normally without a client profile.
            Expand any reservation to review or correct its details.
          </p>
          {drafts.map((item, index) => {
            const match = matchClient(item.value.traveler, clients);
            const linked = clients.find((c) => c.id === item.value.clientId);
            return (
              <details className={styles.importReservation} key={index}>
                <summary>
                  <span>
                    <strong>
                      {item.value.reservationId || "Booking " + (index + 1)} ·{" "}
                      {item.value.traveler || "Passenger not found"}
                    </strong>
                    <small>
                      {shortDate(item.value.date)} · {item.value.time} ·{" "}
                      {item.value.pickup}
                    </small>
                  </span>
                  <span className={styles.status}>
                    {item.savedId
                      ? "Saved"
                      : item.error
                        ? "Needs attention"
                        : linked
                          ? "Profile matched"
                          : match.status === "ambiguous"
                            ? "Multiple matches · no link"
                            : "No profile · booking only"}
                  </span>
                </summary>
                <fieldset disabled={busy || Boolean(item.savedId)}>
                  <p className={styles.notice}>
                    {linked
                      ? "Linked client: " + linked.fullName
                      : match.status === "ambiguous"
                        ? "Several client profiles have this name. This booking will be saved without a link."
                        : "No matching client profile. This booking will still be saved to the calendar."}
                  </p>
                  <ErrorNote message={item.error || ""} />
                  {!item.savedId && (
                    <ul>
                      {item.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                  <BookingFields
                    value={item.value}
                    set={(v) => update(index, v)}
                  />
                </fieldset>
              </details>
            );
          })}
          {pending.length > 0 && (
            <label className={styles.confirm}>
              <input
                type="checkbox"
                required
                disabled={busy}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                I checked every remaining booking, including its pickup time
                zone and linked client profile.
              </span>
            </label>
          )}
          <div className={styles.actions}>
            <button
              className="button"
              type="button"
              disabled={busy}
              onClick={reset}
            >
              {pending.length
                ? saved.length
                  ? "Keep saved & discard remaining"
                  : "Discard import"
                : "Done"}
            </button>
            {pending.length > 0 && (
              <button className="button primary" disabled={!confirmed || busy}>
                {busy
                  ? "Saving bookings…"
                  : saved.length
                    ? "Save remaining bookings"
                    : "Save all bookings & add to calendar"}
                <ArrowRight size={16} />
              </button>
            )}
            <Link className="button" href="/calendar">
              Open calendar
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
function BookingList({
  journeys,
  onOpen,
}: {
  journeys: Journey[];
  onOpen: (id: string) => void;
}) {
  return !journeys.length ? (
    <div className={styles.emptySmall}>No bookings here yet.</div>
  ) : (
    <div className={styles.bookingList}>
      {[...journeys]
        .sort((a, b) =>
          `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
        )
        .map((j) => (
          <button
            key={j.id}
            onClick={() => onOpen(j.id)}
            className={styles.bookingRow}
          >
            <span className={styles.dateTag}>
              {shortDate(j.date)}
              <b>{j.time || "Time not set"}</b>
            </span>
            <span>
              <strong>{j.traveler || "Passenger not specified"}</strong>
              <small>
                {j.pickup || "Pickup not set"} →{" "}
                {j.dropoff || "Drop-off not set"}
              </small>
            </span>
            <span className={styles.status}>{j.status || "new"}</span>
            <ArrowRight size={16} />
          </button>
        ))}
    </div>
  );
}
export function CalendarView() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setJourneys([]);
    (async () => {
      try {
        let cursor: string | null = null;
        const all: Journey[] = [];
        do {
          const data = await teamFetch(
            "/api/journeys?month=" +
              month +
              (cursor ? "&cursor=" + cursor : ""),
          );
          all.push(...data.journeys);
          cursor = data.nextCursor;
        } while (cursor && active);
        if (active) setJourneys(all);
      } catch (e) {
        if (active) setError(errText(e));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [month, tick]);
  const [year, m] = month.split("-").map(Number);
  const offset = new Date(year, m - 1, 1).getDay();
  const length = new Date(year, m, 0).getDate();
  const move = (n: number) => {
    const d = new Date(year, m - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setDay(null);
  };
  return (
    <div className={styles.desk}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">PREMIER / SHARED CALENDAR</p>
          <h1>
            Every journey.
            <br />
            <em>In view.</em>
          </h1>
          <p>Pickup times are shown in each booking’s local time zone.</p>
        </div>
        <Link href="/bookings" className="button primary">
          <Plus size={16} /> Import bookings
        </Link>
      </div>
      <div className={styles.calendarToolbar}>
        <h2>
          {new Date(year, m - 1, 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <div>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <input
            aria-label="Calendar month"
            type="month"
            value={month}
            onChange={(e) => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) {
                setMonth(e.target.value);
                setDay(null);
              }
            }}
          />
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => move(1)}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="button"
            onClick={() => {
              const d = new Date();
              setMonth(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
              );
              setDay(null);
            }}
          >
            Today
          </button>
        </div>
      </div>
      <ErrorNote message={error} />
      {error && (
        <button className="button" onClick={() => setTick((n) => n + 1)}>
          Retry
        </button>
      )}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className={styles.calendarWrap}>
            <div className={styles.calendar}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div className={styles.weekday} key={d}>
                  {d}
                </div>
              ))}
              {Array.from(
                { length: Math.ceil((offset + length) / 7) * 7 },
                (_, i) => {
                  const num = i - offset + 1;
                  if (num < 1 || num > length)
                    return <div key={i} className={styles.offDay} />;
                  const date = `${month}-${String(num).padStart(2, "0")}`;
                  const trips = journeys
                    .filter((j) => j.date === date)
                    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
                  return (
                    <div
                      className={`${styles.day} ${date === day ? styles.chosenDay : ""}`}
                      key={i}
                    >
                      <button
                        className={styles.dayNumber}
                        aria-label={"Show bookings for " + shortDate(date)}
                        onClick={() => setDay(date)}
                      >
                        {num}
                        <span>
                          {trips.length
                            ? `${trips.length} journey${trips.length === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </button>
                      {trips.slice(0, 3).map((j) => (
                        <button
                          key={j.id}
                          className={`${styles.event} ${j.status === "cancelled" ? styles.cancelled : ""}`}
                          onClick={() => setSelected(j.id)}
                        >
                          <b>{j.time}</b> {j.traveler || "Booking"}
                        </button>
                      ))}
                      {trips.length > 3 && (
                        <button
                          className={styles.more}
                          onClick={() => setDay(date)}
                        >
                          +{trips.length - 3} more
                        </button>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
          <div className={styles.sectionBar}>
            <h2>{day ? shortDate(day) : "This month’s journeys"}</h2>
            {day && (
              <button className="button" onClick={() => setDay(null)}>
                Show entire month
              </button>
            )}
          </div>
          <BookingList
            journeys={journeys.filter((j) => !day || j.date === day)}
            onOpen={setSelected}
          />
        </>
      )}
      {selected && (
        <BookingPanel
          id={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setTick((n) => n + 1)}
        />
      )}
    </div>
  );
}
function BookingPanel({
  id,
  onClose,
  onUpdated,
}: {
  id: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<JourneyInput>(emptyJourney);
  const [status, setStatus] = useState("scheduled");
  const [busy, setBusy] = useState(false);
  const submitLock = useRef(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const data = await teamFetch("/api/journeys/" + id);
      setJourney(data.journey);
      setClient(data.client);
      setDraft(
        Object.fromEntries(
          Object.keys(emptyJourney).map((k) => [
            k,
            data.journey[k] ?? emptyJourney[k as keyof JourneyInput],
          ]),
        ) as JourneyInput,
      );
      setStatus(data.journey.status || "scheduled");
    } catch (e) {
      setError(errText(e));
    }
  }, [id]);
  useEffect(() => {
    const el = dialog.current;
    const focused = document.activeElement as HTMLElement;
    el?.showModal();
    void load();
    return () => {
      el?.close();
      focused?.focus();
    };
  }, [load]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!journey || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      await teamFetch("/api/journeys/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status, revision: journey.revision }),
      });
      setEditing(false);
      await load();
      onUpdated();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }
  return (
    <dialog
      ref={dialog}
      aria-label="Booking and client details"
      className={styles.dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className={styles.dialogHeader}>
        <span className="eyebrow">JOURNEY DETAILS</span>
        <button
          className="icon-button"
          aria-label="Close booking details"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className={styles.dialogBody}>
        <ErrorNote message={error} />
        {!journey && !error ? (
          <Loading />
        ) : (
          journey && (
            <div className={styles.bookingColumns}>
              <section
                className={styles.journeyColumn}
                aria-label="Journey information"
              >
                <div className={styles.sectionBar}>
                  <div>
                    <p className="eyebrow">
                      RESERVATION{" "}
                      {journey.reservationId || journey.id.slice(0, 8)}
                    </p>
                    <h2>{journey.traveler}</h2>
                  </div>
                  {journey.source === "internal-manifest" && (
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => setEditing((v) => !v)}
                    >
                      <Pencil size={15} />
                      {editing ? "Close editor" : "Edit booking"}
                    </button>
                  )}
                </div>
                {editing ? (
                  <form onSubmit={save}>
                    <fieldset disabled={busy}>
                      <BookingFields value={draft} set={setDraft} locked />
                      <Field label="Booking status">
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </Field>
                      <div className={styles.actions}>
                        <button className="button primary" disabled={busy}>
                          {busy ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </fieldset>
                  </form>
                ) : (
                  <>
                    <div className={styles.journeySummary}>
                      <CalendarDays size={22} />
                      <div>
                        <strong>
                          {shortDate(journey.date)} · {journey.time}
                        </strong>
                        <p>
                          {journey.timeZone || "Pickup local time"} ·{" "}
                          {journey.status || "new"}
                        </p>
                      </div>
                    </div>
                    <dl className={styles.details}>
                      {Object.entries(journey)
                        .filter(
                          ([key, value]) =>
                            ![
                              "id",
                              "revision",
                              "createdAt",
                              "updatedAt",
                              "createdBy",
                              "updatedBy",
                              "payloadHash",
                              "clientId",
                              "source",
                              "timeBasis",
                              "status",
                              "date",
                              "time",
                              "timeZone",
                              "traveler",
                              "reservationId",
                            ].includes(key) &&
                            value !== "" &&
                            value !== null &&
                            typeof value !== "object",
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </>
                )}
              </section>
              <section
                className={styles.linkedProfile}
                aria-label="Client profile"
              >
                <div className={styles.sectionBar}>
                  <p className="eyebrow">CLIENT PROFILE · CURRENT DETAILS</p>
                  {client && (
                    <Link
                      href={"/clients/" + client.id}
                      className={styles.back}
                    >
                      Open profile <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
                {client ? (
                  <ProfileContent client={client} />
                ) : (
                  <p>
                    No client profile is linked to this booking. The booking is
                    saved independently.
                  </p>
                )}
              </section>
            </div>
          )
        )}
      </div>
    </dialog>
  );
}
