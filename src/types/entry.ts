import type { Timestamp } from "firebase/firestore";

export type TimeEntry = {
  id: string;
  userId: string;
  dateKey: string;
  monthKey: string;
  timeText: string;
  text: string;
  textNormalized: string;
  capturedAt: string;
  timezone: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  deletedAt: Timestamp | null;
};

export type DayGroup = {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  entries: TimeEntry[];
  entryCount: number;
  previewEntries: TimeEntry[];
  hasSearchMatch: boolean;
};

export type AddEntryInput = {
  userId: string;
  text: string;
  capturedAt?: Date;
};
