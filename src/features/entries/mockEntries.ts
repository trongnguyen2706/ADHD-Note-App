import { subDays, set } from "date-fns";
import { normalizeText } from "../../lib/text/normalizeText";
import { toEntryTimeParts } from "../../lib/time/currentEntryTime";
import type { TimeEntry } from "../../types/entry";

const samples = [
  { offset: 0, hour: 9, minute: 15, text: "Plan the Note Time project" },
  { offset: 0, hour: 13, minute: 40, text: "Review Firebase setup notes" },
  { offset: 1, hour: 8, minute: 30, text: "Breakfast and quick planning" },
  { offset: 1, hour: 18, minute: 5, text: "Go to gym" },
  { offset: 2, hour: 21, minute: 20, text: "Reading before sleep" },
  { offset: 4, hour: 14, minute: 10, text: "Write project plan" }
];

export const mockEntries: TimeEntry[] = samples.map((sample, index) => {
  const capturedDate = set(subDays(new Date(), sample.offset), {
    hours: sample.hour,
    minutes: sample.minute,
    seconds: 0,
    milliseconds: 0
  });
  const parts = toEntryTimeParts(capturedDate);

  return {
    id: `mock-${index}`,
    userId: "demo-user",
    dateKey: parts.dateKey,
    monthKey: parts.monthKey,
    timeText: parts.timeText,
    text: sample.text,
    textNormalized: normalizeText(sample.text),
    capturedAt: parts.capturedAt,
    timezone: parts.timezone,
    createdAt: null,
    updatedAt: null,
    deletedAt: null
  };
});
