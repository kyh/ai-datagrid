/**
 * RFC 9110 §12.5.1 Accept negotiation between the two representations this
 * site serves: HTML (every page) and Markdown (for agents). Pure so it can be
 * unit-tested — `src/proxy.ts` is its only caller.
 */

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

type Representation = "text/html" | "text/markdown";

interface AcceptEntry {
  range: string;
  quality: number;
  position: number;
}

const parseQuality = (parameters: string[]): number => {
  for (const parameter of parameters) {
    const [name, value] = parameter.split("=").map((part) => part.trim());
    if (name?.toLowerCase() === "q") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? 1 : Math.max(0, Math.min(1, parsed));
    }
  }
  return 1;
};

const parseAccept = (header: string): AcceptEntry[] =>
  header
    .split(",")
    .map((raw, position) => {
      const [range = "", ...parameters] = raw.split(";").map((part) => part.trim());
      return { position, quality: parseQuality(parameters), range: range.toLowerCase() };
    })
    .filter((entry) => entry.range.includes("/"));

const specificity = (range: string): number => {
  if (range === "*/*") {
    return 0;
  }
  return range.endsWith("/*") ? 1 : 2;
};

const matches = (range: string, candidate: Representation): boolean =>
  range === "*/*" ||
  range === candidate ||
  (range.endsWith("/*") && candidate.startsWith(range.slice(0, -1)));

/** Most specific matching range wins, so `text/html;q=0, *\/*` still rejects HTML. */
const bestMatch = (entries: AcceptEntry[], candidate: Representation): AcceptEntry | undefined =>
  entries
    .filter((entry) => matches(entry.range, candidate))
    .toSorted((a, b) => specificity(b.range) - specificity(a.range) || a.position - b.position)[0];

/**
 * True only when Markdown outranks HTML. A missing or wildcard Accept means
 * "no preference", which is HTML — browsers must never get Markdown by accident.
 */
export const prefersMarkdown = (header: string | null): boolean => {
  if (!header?.trim()) {
    return false;
  }
  const entries = parseAccept(header);
  const markdown = bestMatch(entries, "text/markdown");
  if (!markdown || markdown.quality <= 0) {
    return false;
  }
  const html = bestMatch(entries, "text/html");
  if (!html || html.quality <= 0) {
    return true;
  }
  if (markdown.quality !== html.quality) {
    return markdown.quality > html.quality;
  }
  return markdown.range === "text/markdown" && markdown.position <= html.position;
};

/** Adds `Accept` to `Vary` without dropping the RSC tokens Next already set. */
export const withVaryAccept = (existing: string | null): string => {
  const tokens = (existing ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.some((token) => token.toLowerCase() === "accept")) {
    return tokens.join(", ");
  }
  return [...tokens, "Accept"].join(", ");
};
