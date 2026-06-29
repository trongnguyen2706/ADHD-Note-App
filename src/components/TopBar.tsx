import { Search } from "lucide-react";
import { InstallAppPrompt } from "../features/pwa/InstallAppPrompt";

type TopBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export function TopBar({ searchValue, onSearchChange }: TopBarProps) {
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

      <InstallAppPrompt />
    </header>
  );
}
