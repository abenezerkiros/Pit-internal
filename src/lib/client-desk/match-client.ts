type NamedClient = { id: string; fullName: string };

/** Conservative full-name match. Never use substring or fuzzy matching. */
export function normalizeClientName(name: string): string {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .trim()
    .replace(/^(?:(?:mrs|mr|ms|miss|dr|prof)(?:\.\s*|\s+))+/u, "")
    .replace(/[’']/gu, "")
    .replace(/[.,-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
export function matchClient(name: string, clients: NamedClient[]) {
  const key = normalizeClientName(name);
  const candidates = key
    ? clients.filter((c) => normalizeClientName(c.fullName) === key)
    : [];
  return {
    clientId: candidates.length === 1 ? candidates[0].id : "",
    status:
      candidates.length === 1
        ? ("matched" as const)
        : candidates.length > 1
          ? ("ambiguous" as const)
          : ("unmatched" as const),
  };
}
