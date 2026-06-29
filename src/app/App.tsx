import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AuthGate } from "../features/auth/AuthGate";
import { groupEntriesByDay } from "../features/entries/groupEntries";
import { mockEntries } from "../features/entries/mockEntries";
import { parseSearchQuery } from "../features/search/search";
import { DayDetailPanel } from "../components/DayDetailPanel";
import { DayGrid } from "../components/DayGrid";
import { TopBar } from "../components/TopBar";

export function App() {
  const [searchValue, setSearchValue] = useState("");
  const parsedSearch = useMemo(() => parseSearchQuery(searchValue), [searchValue]);
  const groups = useMemo(
    () => groupEntriesByDay(mockEntries, parsedSearch),
    [parsedSearch]
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    groups[0]?.dateKey ?? null
  );

  const selectedGroup =
    groups.find((group) => group.dateKey === selectedDateKey) ?? groups[0] ?? null;

  return (
    <AuthGate>
      <main className="app-shell">
        <TopBar searchValue={searchValue} onSearchChange={setSearchValue} />

        <div className="content-layout">
          <DayGrid
            groups={groups}
            selectedDateKey={selectedGroup?.dateKey ?? null}
            search={parsedSearch}
            onSelectDate={setSelectedDateKey}
          />
          <DayDetailPanel group={selectedGroup} search={parsedSearch} />
        </div>

        <button className="floating-add" type="button" aria-label="Add current entry">
          <Plus size={28} aria-hidden="true" />
        </button>
      </main>
    </AuthGate>
  );
}
