import type { AddEntryInput, TimeEntry, UpdateEntryInput } from "../../types/entry";

export type EntryRepository = {
  subscribeEntries: (
    userId: string,
    onEntries: (entries: TimeEntry[]) => void,
    onError?: (error: Error) => void
  ) => () => void;
  addEntry: (input: AddEntryInput) => Promise<void>;
  updateEntry: (input: UpdateEntryInput) => Promise<void>;
  softDeleteEntry: (userId: string, entryId: string) => Promise<void>;
};
