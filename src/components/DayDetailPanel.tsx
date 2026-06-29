import { CalendarDays } from "lucide-react";
import type { DayGroup } from "../types/entry";
import { markTextMatch, type ParsedSearch } from "../features/search/search";

type DayDetailPanelProps = {
  group: DayGroup | null;
  isLoading: boolean;
  search: ParsedSearch;
};

export function DayDetailPanel({ group, isLoading, search }: DayDetailPanelProps) {
  if (isLoading) {
    return (
      <aside className="detail-panel">
        <div className="detail-empty">
          <CalendarDays size={28} aria-hidden="true" />
          <h2>Loading timeline</h2>
          <p>Your latest entries are on the way.</p>
        </div>
      </aside>
    );
  }

  if (!group) {
    return (
      <aside className="detail-panel">
        <div className="detail-empty">
          <CalendarDays size={28} aria-hidden="true" />
          <h2>Select a day</h2>
          <p>Your timeline entries will appear here.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-label={`${group.fullDate} entries`}>
      <div className="detail-header">
        <p className="eyebrow">Timeline</p>
        <h2>{group.fullDate}</h2>
      </div>

      <ol className="timeline">
        {group.entries.map((entry) => (
          <li className="timeline-entry" key={entry.id}>
            <time>{entry.timeText}</time>
            <p>
              {markTextMatch(entry.text, search).map((part, index) => (
                <span
                  className={part.isMatch ? "text-highlight" : undefined}
                  key={`${entry.id}-${index}`}
                >
                  {part.text}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
