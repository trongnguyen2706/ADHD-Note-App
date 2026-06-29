import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { AuthGate } from "../features/auth/AuthGate";
import { useAuthSession } from "../features/auth/useAuthSession";
import { firestoreEntryRepository } from "../features/entries/firestoreEntryRepository";
import { groupEntriesByDay } from "../features/entries/groupEntries";
import { localEntryRepository } from "../features/entries/localEntryRepository";
import type { EntryRepository } from "../features/entries/repository";
import { parseSearchQuery } from "../features/search/search";
import { useOnlineStatus } from "../lib/browser/useOnlineStatus";
import { AddEntryModal } from "../components/AddEntryModal";
import { DayDetailPanel } from "../components/DayDetailPanel";
import { DayGrid } from "../components/DayGrid";
import { TopBar } from "../components/TopBar";
import type { TimeEntry } from "../types/entry";

export function App() {
  const session = useAuthSession();
  const isOnline = useOnlineStatus();
  const [searchValue, setSearchValue] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [entryState, setEntryState] = useState<{
    entries: TimeEntry[];
    error: string | null;
    ownerKey: string | null;
  }>({
    entries: [],
    error: null,
    ownerKey: null
  });
  const deferredSearchValue = useDeferredValue(searchValue);
  const parsedSearch = parseSearchQuery(deferredSearchValue);
  const viewer = session.viewer;
  const viewerKey = viewer ? `${viewer.isDemo ? "demo" : "cloud"}:${viewer.uid}` : null;
  const repository: EntryRepository | null = viewer
    ? viewer.isDemo
      ? localEntryRepository
      : firestoreEntryRepository
    : null;
  const repositoryError =
    viewer && !repository
      ? "Firebase is configured, but the Firestore repository is unavailable."
      : null;
  const isEntriesLoading = Boolean(viewerKey && repository && entryState.ownerKey !== viewerKey);
  const entries = entryState.ownerKey === viewerKey ? entryState.entries : [];
  const entriesError = repositoryError ?? (entryState.ownerKey === viewerKey ? entryState.error : null);
  const groups = groupEntriesByDay(entries, parsedSearch);

  useEffect(() => {
    if (!viewerKey || !viewer || !repository) {
      return;
    }

    return repository.subscribeEntries(
      viewer.uid,
      (nextEntries) => {
        startTransition(() => {
          setEntryState({
            entries: nextEntries,
            error: null,
            ownerKey: viewerKey
          });
        });
      },
      (error) => {
        startTransition(() => {
          setEntryState({
            entries: [],
            error: error.message,
            ownerKey: viewerKey
          });
        });
      }
    );
  }, [repository, viewer, viewerKey]);

  const activeDateKey =
    selectedDateKey && groups.some((group) => group.dateKey === selectedDateKey)
      ? selectedDateKey
      : groups[0]?.dateKey ?? null;
  const selectedGroup =
    groups.find((group) => group.dateKey === activeDateKey) ?? groups[0] ?? null;
  const currentTimeLabel = format(new Date(), "HH:mm");

  return (
    <AuthGate session={session}>
      {(viewer) => {
        const statusTone = viewer.isDemo ? "demo" : isOnline ? "ready" : "offline";
        const statusLabel = viewer.isDemo
          ? "Demo mode"
          : isSavingEntry
            ? "Syncing"
            : isOnline
              ? "Synced"
              : "Offline";
        const viewerLabel = viewer.displayName ?? viewer.email ?? "Signed in";

        async function handleAddEntry(text: string) {
          if (!repository) {
            return false;
          }
          setIsSavingEntry(true);

          try {
            await repository.addEntry({
              userId: viewer.uid,
              text
            });
            setIsComposerOpen(false);
            return true;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unable to save the new entry.";
            startTransition(() => {
              setEntryState((currentState) => ({
                ...currentState,
                error: message
              }));
            });
            return false;
          } finally {
            setIsSavingEntry(false);
          }
        }

        return (
          <>
            <main className="app-shell">
              <TopBar
                isDemo={viewer.isDemo}
                onCreateEntry={() => setIsComposerOpen(true)}
                onSignOut={session.signOut}
                searchValue={searchValue}
                statusLabel={statusLabel}
                statusTone={statusTone}
                viewerLabel={viewerLabel}
                onSearchChange={setSearchValue}
              />

              {entriesError && (
                <aside className="setup-banner error-banner" aria-label="Entry sync status">
                  <span>{entriesError}</span>
                </aside>
              )}

              <div className="content-layout">
                <DayGrid
                  groups={groups}
                  isLoading={isEntriesLoading}
                  selectedDateKey={activeDateKey}
                  search={parsedSearch}
                  onSelectDate={setSelectedDateKey}
                />
                <DayDetailPanel
                  group={selectedGroup}
                  isLoading={isEntriesLoading}
                  search={parsedSearch}
                />
              </div>

              <button
                className="floating-add"
                type="button"
                aria-label="Add current entry"
                onClick={() => setIsComposerOpen(true)}
              >
                <Plus size={28} aria-hidden="true" />
              </button>
            </main>

            {isComposerOpen && (
              <AddEntryModal
                currentTimeLabel={currentTimeLabel}
                isSaving={isSavingEntry}
                error={entriesError}
                onClose={() => {
                  if (!isSavingEntry) {
                    setIsComposerOpen(false);
                  }
                }}
                onSave={handleAddEntry}
              />
            )}
          </>
        );
      }}
    </AuthGate>
  );
}
