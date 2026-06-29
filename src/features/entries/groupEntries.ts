import { format, parseISO } from "date-fns";
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

      return {
        dateKey,
        displayDate: format(date, "dd/MM"),
        fullDate: format(date, "d MMMM yyyy"),
        entries: sortedEntries,
        entryCount: sortedEntries.length,
        previewEntries: sortedEntries.slice(0, 3),
        hasSearchMatch: search.mode !== "empty"
      };
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
