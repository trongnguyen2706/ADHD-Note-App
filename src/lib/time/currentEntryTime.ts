import { format } from "date-fns";

export function toEntryTimeParts(date = new Date()) {
  return {
    dateKey: format(date, "yyyy-MM-dd"),
    monthKey: format(date, "yyyy-MM"),
    timeText: format(date, "HH:mm"),
    capturedAt: date.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
