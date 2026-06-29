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
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
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

export type UpdateEntryInput = {
  userId: string;
  entryId: string;
  text: string;
  capturedAt?: Date;
};
