import { Download } from "lucide-react";

export function InstallAppPrompt() {
  return (
    <button className="icon-button" type="button" aria-label="Install app">
      <Download size={18} aria-hidden="true" />
    </button>
  );
}
