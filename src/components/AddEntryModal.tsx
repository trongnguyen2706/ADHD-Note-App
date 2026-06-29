import { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";

type AddEntryModalProps = {
  currentTimeLabel: string;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (text: string) => Promise<boolean>;
};

export function AddEntryModal({
  currentTimeLabel,
  isSaving,
  error,
  onClose,
  onSave
}: AddEntryModalProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSaving, onClose]);

  async function handleSubmit() {
    if (isSaving) {
      return;
    }

    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    const didSave = await onSave(trimmedDraft);

    if (didSave) {
      setDraft("");
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
    >
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-entry-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Quick capture</p>
            <h2 id="add-entry-title">Add a note for right now</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close add note dialog"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="modal-time">
          <Clock3 size={16} aria-hidden="true" />
          <span>Now {currentTimeLabel}</span>
        </p>

        <label className="modal-field">
          <span className="sr-only">What are you doing right now?</span>
          <textarea
            value={draft}
            placeholder="What are you doing right now?"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                void handleSubmit();
              }
            }}
            rows={5}
            autoFocus
          />
        </label>

        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || !draft.trim()}
          >
            {isSaving ? "Saving..." : "Save entry"}
          </button>
        </div>
      </section>
    </div>
  );
}
