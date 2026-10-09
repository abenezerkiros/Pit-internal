"use client";
import { useEffect, useRef, useState } from "react";
import { teamFetch } from "./auth";
type Suggestion = {
  place_id: string;
  formatted: string;
  address_line1?: string;
  address_line2?: string;
};
type Props = {
  id: string;
  name: string;
  value: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  onChange: (value: string) => void;
};
export default function LocationAutocomplete({ onChange, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const selected = useRef<string | null>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = props.id + "-locations";
  useEffect(() => {
    if (
      !focused ||
      props.value.trim().length < 3 ||
      selected.current === props.value
    ) {
      setOpen(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setOpen(true);
    setItems([]);
    setActive(-1);
    setMessage("Searching locations…");
    const timer = setTimeout(async () => {
      const query = props.value.trim();
      const key = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
      const result = await Promise.allSettled([
        teamFetch(`/api/airports?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        }),
        (async () => {
          if (!key) return { results: [], unconfigured: true };
          const params = new URLSearchParams({
            apiKey: key,
            text: query,
            format: "json",
            limit: "6",
            lang: "en",
            bias: "proximity:-77.0369,38.9072",
          });
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?${params}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error();
          return response.json();
        })(),
      ]);
      if (cancelled) return;
      const airports =
        result[0].status === "fulfilled" ? (result[0].value.results ?? []) : [];
      const addresses =
        result[1].status === "fulfilled" ? (result[1].value.results ?? []) : [];
      const seen = new Set<string>();
      const merged: Suggestion[] = [...airports, ...addresses]
        .filter(
          (item) =>
            typeof item.formatted === "string" &&
            !seen.has(item.formatted.toLowerCase()) &&
            Boolean(seen.add(item.formatted.toLowerCase())),
        )
        .slice(0, 8);
      setItems(merged);
      setMessage(
        merged.length
          ? ""
          : result.every((item) => item.status === "rejected")
            ? "Search unavailable. You can enter a location manually."
            : "No suggestions. You can enter a location manually.",
      );
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [props.value, focused]);
  useEffect(() => {
    if (active >= 0)
      list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);
  function choose(item: Suggestion) {
    selected.current = item.formatted;
    onChange(item.formatted);
    setOpen(false);
    setActive(-1);
  }
  return (
    <div className="autocomplete">
      <input
        {...props}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setOpen(false);
        }}
        onChange={(event) => {
          selected.current = null;
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            setOpen(false);
            event.preventDefault();
          } else if (
            open &&
            items.length &&
            (event.key === "ArrowDown" || event.key === "ArrowUp")
          ) {
            event.preventDefault();
            setActive((old) =>
              event.key === "ArrowDown"
                ? (old + 1) % items.length
                : old <= 0
                  ? items.length - 1
                  : old - 1,
            );
          } else if (open && event.key === "Enter") {
            event.preventDefault();
            if (active >= 0 && items[active]) choose(items[active]);
            else setOpen(false);
          }
        }}
      />
      {open && (
        <div className="suggestions">
          <ul
            id={listId}
            ref={list}
            role="listbox"
            aria-label="Suggested locations"
          >
            {items.map((item, index) => (
              <li
                key={item.place_id || item.formatted}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={active === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <strong>{item.address_line1 || item.formatted}</strong>
                {item.address_line2 && <small>{item.address_line2}</small>}
              </li>
            ))}
          </ul>
          {message && <p role="status">{message}</p>}
          <p className="attribution">
            Airports: OurAirports · Addresses: Geoapify / © OpenStreetMap
            contributors
          </p>
        </div>
      )}
    </div>
  );
}
