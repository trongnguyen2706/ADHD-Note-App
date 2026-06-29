import { CloudAlert, CloudCheck, HardDriveDownload } from "lucide-react";

type SyncStatusProps = {
  label: string;
  tone: "ready" | "offline" | "demo";
};

export function SyncStatus({ label, tone }: SyncStatusProps) {
  const Icon =
    tone === "offline" ? CloudAlert : tone === "demo" ? HardDriveDownload : CloudCheck;

  return (
    <span className="sync-badge" data-tone={tone}>
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
