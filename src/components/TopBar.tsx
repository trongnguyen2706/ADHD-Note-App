import { CirclePlus, LogOut, Search } from "lucide-react";
import { InstallAppPrompt } from "../features/pwa/InstallAppPrompt";
import { SyncStatus } from "./SyncStatus";

type TopBarProps = {
  isDemo: boolean;
  onCreateEntry: () => void;
  onSignOut: () => Promise<void>;
  searchValue: string;
  statusLabel: string;
  statusTone: "ready" | "offline" | "demo";
  viewerLabel: string;
  onSearchChange: (value: string) => void;
};

export function TopBar({
  isDemo,
  onCreateEntry,
  onSignOut,
  searchValue,
  statusLabel,
  statusTone,
  viewerLabel,
  onSearchChange
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <img src="/icons/icon.svg" alt="" className="brand-mark" />
        <div>
          <p className="eyebrow">Personal timeline</p>
          <h1>Note Time</h1>
        </div>
      </div>

      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search notes</span>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search date, time, or action"
        />
      </label>

      <div className="top-bar-actions">
        <SyncStatus label={statusLabel} tone={statusTone} />
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={onCreateEntry}
        >
          <CirclePlus size={18} aria-hidden="true" />
          <span>New note</span>
        </button>
        <span className="viewer-pill">{viewerLabel}</span>
        <InstallAppPrompt />
        {!isDemo && (
          <button
            className="icon-button"
            type="button"
            onClick={() => void onSignOut()}
            aria-label="Sign out"
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
