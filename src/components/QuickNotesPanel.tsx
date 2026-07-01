import { format } from "date-fns";
import { NotebookPen, Pencil, Pin, Plus, Trash2 } from "lucide-react";

export type QuickNoteItem = {
  id: string;
  createdAt: string;
  timeText: string;
  text: string;
  isPinned: boolean;
};

type QuickNotesPanelProps = {
  notes: QuickNoteItem[];
  onAddNote: () => void;
  onTogglePriority: (noteId: string) => void;
  onEditNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
};

export function QuickNotesPanel({
  notes,
  onAddNote,
  onTogglePriority,
  onEditNote,
  onDeleteNote
}: QuickNotesPanelProps) {
  const quickNotes = notes.slice(0, 6);
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCount = notes.filter((note) => note.createdAt.startsWith(todayKey)).length;
  const currentDateLabel = format(new Date(), "EEEE, d MMM");

  return (
    <aside className="quick-notes-panel" aria-label="Quick notes">
      <div className="quick-notes-hero">
        <div>
          <p className="eyebrow">Braindump</p>
          <p className="quick-notes-date">{currentDateLabel}</p>
          <h2>Short notes and reminders</h2>
          <p className="quick-notes-copy">
            Keep one place for the things you want to remember before they disappear.
          </p>
        </div>

        <button className="quick-add-button" type="button" onClick={onAddNote}>
          <Plus size={16} aria-hidden="true" />
          <span>Add note</span>
        </button>
      </div>

      <div className="quick-notes-meta">
        <span>{notes.length} saved</span>
        <span>{todayCount} today</span>
      </div>

      <div className="quick-notes-list">
        {quickNotes.length === 0 ? (
          <div className="quick-note-empty">
            <NotebookPen size={20} aria-hidden="true" />
            <p>No notes yet. Start with the first quick capture.</p>
          </div>
        ) : (
          quickNotes.map((note) => (
            <article className="quick-note-card" data-pinned={note.isPinned} key={note.id}>
              <div className="quick-note-card-top">
                <div className="quick-note-time">{note.timeText}</div>
                <div className="quick-note-actions">
                  <button
                    className="quick-note-action"
                    type="button"
                    aria-label={note.isPinned ? "Remove priority" : "Increase priority"}
                    onClick={() => onTogglePriority(note.id)}
                  >
                    <Pin size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="quick-note-action"
                    type="button"
                    aria-label="Edit short note"
                    onClick={() => onEditNote(note.id)}
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="quick-note-action"
                    type="button"
                    aria-label="Delete short note"
                    onClick={() => onDeleteNote(note.id)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p>{note.text}</p>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
