import { normalizeText } from "../../lib/text/normalizeText";
import type { TimeEntry } from "../../types/entry";

export type SearchMode = "empty" | "date" | "month" | "time" | "text";

export type ParsedSearch = {
  mode: SearchMode;
  raw: string;
  normalized: string;
};

export function parseSearchQuery(query: string): ParsedSearch {
  const raw = query.trim();
  const normalized = normalizeText(raw);

  if (!raw) {
    return { mode: "empty", raw, normalized };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    return { mode: "date", raw, normalized };
  }

  if (/^\d{1,2}\/\d{4}$/.test(raw) || /^\d{4}-\d{2}$/.test(raw)) {
    return { mode: "month", raw, normalized };
  }

  if (/^\d{1,2}(:\d{2})?$/.test(raw)) {
    return { mode: "time", raw, normalized };
  }

  return { mode: "text", raw, normalized };
}

export function entryMatchesSearch(entry: TimeEntry, parsed: ParsedSearch) {
  if (parsed.mode === "empty") {
    return true;
  }

  if (parsed.mode === "date") {
    return entry.dateKey.includes(toDateKey(parsed.raw));
  }

  if (parsed.mode === "month") {
    return entry.monthKey.includes(toMonthKey(parsed.raw));
  }

  if (parsed.mode === "time") {
    return entry.timeText.startsWith(parsed.raw.padStart(2, "0"));
  }

  return entry.textNormalized.includes(parsed.normalized);
}

export function markTextMatch(text: string, parsed: ParsedSearch) {
  if (parsed.mode !== "text" || !parsed.normalized) {
    return [{ text, isMatch: false }];
  }

  const normalizedText = normalizeText(text);
  const index = normalizedText.indexOf(parsed.normalized);

  if (index < 0) {
    return [{ text, isMatch: false }];
  }

  return [
    { text: text.slice(0, index), isMatch: false },
    { text: text.slice(index, index + parsed.raw.length), isMatch: true },
    { text: text.slice(index + parsed.raw.length), isMatch: false }
  ].filter((part) => part.text.length > 0);
}

function toDateKey(raw: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const [day, month, year] = raw.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function toMonthKey(raw: string) {
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  const [month, year] = raw.split("/");
  return `${year}-${month.padStart(2, "0")}`;
}
