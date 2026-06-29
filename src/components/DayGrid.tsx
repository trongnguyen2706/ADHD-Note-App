import type { DayGroup } from "../types/entry";
import { markTextMatch, type ParsedSearch } from "../features/search/search";

type DayGridProps = {
  groups: DayGroup[];
  isLoading: boolean;
  selectedDateKey: string | null;
  search: ParsedSearch;
  onSelectDate: (dateKey: string) => void;
};

export function DayGrid({
  groups,
  isLoading,
  selectedDateKey,
  search,
  onSelectDate
}: DayGridProps) {
  if (isLoading) {
    return (
      <section className="empty-state">
        <h2>Loading notes</h2>
        <p>Pulling the latest entries into your timeline.</p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="empty-state">
        <h2>No notes found</h2>
        <p>Try another date, time, or action.</p>
      </section>
    );
  }

  return (
    <section className="day-grid" aria-label="Days">
      {groups.map((group) => (
        <button
          className="day-card"
          data-selected={group.dateKey === selectedDateKey}
          key={group.dateKey}
          type="button"
          onClick={() => onSelectDate(group.dateKey)}
        >
          <span className="day-card-date">{group.displayDate}</span>
          <span className="day-card-meta">
            {group.entryCount} {group.entryCount === 1 ? "entry" : "entries"}
          </span>
          <span className="day-card-preview">
            {group.previewEntries.map((entry) => (
              <span className="preview-line" key={entry.id}>
                <span className="preview-time">{entry.timeText}</span>
                <span>
                  {markTextMatch(entry.text, search).map((part, index) => (
                    <span
                      className={part.isMatch ? "text-highlight" : undefined}
                      key={`${entry.id}-${index}`}
                    >
                      {part.text}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </span>
        </button>
      ))}
    </section>
  );
}
