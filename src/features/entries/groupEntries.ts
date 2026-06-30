import { format, isValid, parseISO } from "date-fns";
import { entryMatchesSearch, type ParsedSearch } from "../search/search";
import type { DayGroup, TimeEntry } from "../../types/entry";

export function groupEntriesByDay(entries: TimeEntry[], search: ParsedSearch): DayGroup[] {
  const groups = new Map<string, TimeEntry[]>();

  for (const entry of entries) {
    if (!entryMatchesSearch(entry, search)) {
      continue;
    }

    const current = groups.get(entry.dateKey) ?? [];
    current.push(entry);
    groups.set(entry.dateKey, current);
  }

  return Array.from(groups.entries())
    .map(([dateKey, groupEntries]) => {
      const sortedEntries = groupEntries.sort((a, b) =>
        b.capturedAt.localeCompare(a.capturedAt)
      );
      const date = parseISO(dateKey);
      const safeDate = isValid(date) ? date : new Date(`${dateKey}T00:00:00`);
      const displayDate = isValid(safeDate) ? format(safeDate, "dd/MM") : dateKey;
      const fullDate = isValid(safeDate) ? format(safeDate, "d MMMM yyyy") : dateKey;

      return {
        dateKey,
        displayDate,
        fullDate,
        entries: sortedEntries,
        entryCount: sortedEntries.length,
        previewEntries: sortedEntries.slice(0, 3),
        hasSearchMatch: search.mode !== "empty"
      };
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
