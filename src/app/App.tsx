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
import { QuickNotesPanel, type QuickNoteItem } from "../components/QuickNotesPanel";
import { TopBar } from "../components/TopBar";
import type { TimeEntry } from "../types/entry";

type ComposerState =
  | { mode: "entry-create" }
  | { mode: "entry-edit"; entryId: string }
  | { mode: "quick-note-create" }
  | { mode: "quick-note-edit"; noteId: string }
  | null;

function sortQuickNotes(notes: QuickNoteItem[]) {
  return [...notes].sort((left, right) => {
    if (left.isPinned === right.isPinned) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    return left.isPinned ? -1 : 1;
  });
}

function normalizeQuickNotes(notes: QuickNoteItem[]) {
  return sortQuickNotes(
    notes.map((note) => ({
      ...note,
      isPinned: Boolean(note.isPinned)
    }))
  );
}

export function App() {
  const session = useAuthSession();
  const isOnline = useOnlineStatus();
  const [searchValue, setSearchValue] = useState("");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [composerState, setComposerState] = useState<ComposerState>({ mode: "entry-create" });
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [quickNotes, setQuickNotes] = useState<QuickNoteItem[]>([]);
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
  const quickNotesStorageKey = viewerKey ? `note-time:quick-notes:${viewerKey}` : null;

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

  useEffect(() => {
    if (!quickNotesStorageKey) {
      setQuickNotes([]);
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(quickNotesStorageKey);
      if (!rawValue) {
        setQuickNotes([]);
        return;
      }

      const parsedValue = JSON.parse(rawValue) as QuickNoteItem[];
      setQuickNotes(Array.isArray(parsedValue) ? normalizeQuickNotes(parsedValue) : []);
    } catch {
      setQuickNotes([]);
    }
  }, [quickNotesStorageKey]);

  const activeDateKey =
    selectedDateKey && groups.some((group) => group.dateKey === selectedDateKey)
      ? selectedDateKey
      : groups[0]?.dateKey ?? null;
  const selectedGroup =
    groups.find((group) => group.dateKey === activeDateKey) ?? groups[0] ?? null;
  const currentTimeLabel = format(new Date(), "HH:mm");
  const editingEntry =
    composerState?.mode === "entry-edit"
      ? entries.find((entry) => entry.id === composerState.entryId) ?? null
      : null;
  const editingQuickNote =
    composerState?.mode === "quick-note-edit"
      ? quickNotes.find((note) => note.id === composerState.noteId) ?? null
      : null;

  useEffect(() => {
    if (composerState?.mode === "entry-edit" && !editingEntry) {
      setComposerState(null);
    }

    if (composerState?.mode === "quick-note-edit" && !editingQuickNote) {
      setComposerState(null);
    }
  }, [composerState, editingEntry, editingQuickNote]);

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
            setComposerState(null);
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

        async function handleAddQuickNote(text: string) {
          const createdAt = new Date().toISOString();
          const nextQuickNotes = sortQuickNotes([
            {
              id: `quick-note-${createdAt}`,
              createdAt,
              timeText: format(new Date(createdAt), "HH:mm"),
              text,
              isPinned: false
            },
            ...quickNotes
          ]);

          setQuickNotes(nextQuickNotes);
          if (quickNotesStorageKey) {
            window.localStorage.setItem(quickNotesStorageKey, JSON.stringify(nextQuickNotes));
          }
          setComposerState(null);
          return true;
        }

        async function handleUpdateQuickNote(text: string) {
          if (composerState?.mode !== "quick-note-edit") {
            return false;
          }

          const nextQuickNotes = sortQuickNotes(
            quickNotes.map((note) =>
              note.id === composerState.noteId ? { ...note, text: text.trim() } : note
            )
          );

          setQuickNotes(nextQuickNotes);
          if (quickNotesStorageKey) {
            window.localStorage.setItem(quickNotesStorageKey, JSON.stringify(nextQuickNotes));
          }
          setComposerState(null);
          return true;
        }

        async function handleUpdateEntry(text: string) {
          if (!repository || !editingEntry) {
            return false;
          }

          setIsSavingEntry(true);

          try {
            await repository.updateEntry({
              userId: viewer.uid,
              entryId: editingEntry.id,
              text
            });
            setComposerState(null);
            return true;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unable to update the note.";
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

        function persistQuickNotes(nextQuickNotes: QuickNoteItem[]) {
          setQuickNotes(sortQuickNotes(nextQuickNotes));
          if (quickNotesStorageKey) {
            window.localStorage.setItem(
              quickNotesStorageKey,
              JSON.stringify(sortQuickNotes(nextQuickNotes))
            );
          }
        }

        function handleToggleQuickNotePriority(noteId: string) {
          const nextQuickNotes = quickNotes.map((note) =>
            note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
          );

          persistQuickNotes(nextQuickNotes);
        }

        function handleDeleteQuickNote(noteId: string) {
          const nextQuickNotes = quickNotes.filter((note) => note.id !== noteId);
          persistQuickNotes(nextQuickNotes);
        }

        async function handleDeleteEntry(entryId: string) {
          if (!repository) {
            return;
          }

          setIsSavingEntry(true);
          try {
            await repository.softDeleteEntry(viewer.uid, entryId);
          } finally {
            setIsSavingEntry(false);
          }
        }

        const composerTitle =
          composerState?.mode === "quick-note-create"
            ? "Add a quick note for today"
            : composerState?.mode === "quick-note-edit"
              ? "Edit your short note"
              : composerState?.mode === "entry-edit"
                ? "Edit timeline note"
                : "Add a note for right now";

        const composerEyebrow =
          composerState?.mode === "quick-note-create" || composerState?.mode === "quick-note-edit"
            ? "Braindump"
            : "Quick capture";

        const composerPlaceholder =
          composerState?.mode === "quick-note-create" ||
          composerState?.mode === "quick-note-edit"
            ? "Write the reminder or short note you want to keep on the left panel."
            : "What are you doing right now?";

        const composerSubmitLabel =
          composerState?.mode === "quick-note-edit"
            ? "Update note"
            : composerState?.mode === "entry-edit"
              ? "Update entry"
              : composerState?.mode === "quick-note-create"
                ? "Save note"
                : "Save entry";

        const composerInitialValue =
          editingQuickNote?.text ?? editingEntry?.text ?? "";

        async function handleComposerSave(text: string) {
          if (composerState?.mode === "quick-note-create") {
            return handleAddQuickNote(text);
          }

          if (composerState?.mode === "quick-note-edit") {
            return handleUpdateQuickNote(text);
          }

          if (composerState?.mode === "entry-edit") {
            return handleUpdateEntry(text);
          }

          return handleAddEntry(text);
        }

        const isQuickNoteComposer =
          composerState?.mode === "quick-note-create" ||
          composerState?.mode === "quick-note-edit";

        const isComposerSaving = isQuickNoteComposer ? false : isSavingEntry;

        return (
          <>
            <main className="app-shell">
              <TopBar
                isDemo={viewer.isDemo}
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
                <QuickNotesPanel
                  notes={quickNotes}
                  onAddNote={() => setComposerState({ mode: "quick-note-create" })}
                  onTogglePriority={handleToggleQuickNotePriority}
                  onEditNote={(noteId) => setComposerState({ mode: "quick-note-edit", noteId })}
                  onDeleteNote={handleDeleteQuickNote}
                />
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
                  onEditEntry={(entryId) => setComposerState({ mode: "entry-edit", entryId })}
                  onDeleteEntry={(entryId) => void handleDeleteEntry(entryId)}
                />
              </div>

              <button
                className="floating-add"
                type="button"
                aria-label="Add current entry"
                onClick={() => setComposerState({ mode: "entry-create" })}
              >
                <Plus size={28} aria-hidden="true" />
              </button>
            </main>

            {composerState && (
              <AddEntryModal
                currentTimeLabel={currentTimeLabel}
                isSaving={isComposerSaving}
                error={isQuickNoteComposer ? null : entriesError}
                eyebrow={composerEyebrow}
                title={composerTitle}
                placeholder={composerPlaceholder}
                submitLabel={composerSubmitLabel}
                initialValue={composerInitialValue}
                onClose={() => {
                  if (!isSavingEntry || isQuickNoteComposer) {
                    setComposerState(null);
                  }
                }}
                onSave={handleComposerSave}
              />
            )}
          </>
        );
      }}
    </AuthGate>
  );
}
