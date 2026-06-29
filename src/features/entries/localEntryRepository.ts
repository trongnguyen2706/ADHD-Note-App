import { mockEntries } from "./mockEntries";
import { normalizeText } from "../../lib/text/normalizeText";
import { toEntryTimeParts } from "../../lib/time/currentEntryTime";
import type { AddEntryInput, TimeEntry, UpdateEntryInput } from "../../types/entry";
import type { EntryRepository } from "./repository";

type StoredEntry = Omit<TimeEntry, "createdAt" | "updatedAt" | "deletedAt"> & {
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

const STORAGE_KEY = "note-time-demo-entries";

let entriesCache: TimeEntry[] | null = null;
const listeners = new Set<() => void>();

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function serializeEntries(entries: TimeEntry[]): StoredEntry[] {
  return entries.map((entry) => ({
    ...entry,
    createdAt: entry.createdAt ? entry.createdAt.toISOString() : null,
    updatedAt: entry.updatedAt ? entry.updatedAt.toISOString() : null,
    deletedAt: entry.deletedAt ? entry.deletedAt.toISOString() : null
  }));
}

function deserializeEntries(entries: StoredEntry[]): TimeEntry[] {
  return entries.map((entry) => ({
    ...entry,
    createdAt: entry.createdAt ? new Date(entry.createdAt) : null,
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : null,
    deletedAt: entry.deletedAt ? new Date(entry.deletedAt) : null
  }));
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function saveEntries(entries: TimeEntry[]) {
  entriesCache = entries;

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeEntries(entries)));
  }

  notifyListeners();
}

function loadEntries() {
  if (entriesCache) {
    return entriesCache;
  }

  if (!canUseStorage()) {
    entriesCache = mockEntries;
    return entriesCache;
  }

  const rawEntries = window.localStorage.getItem(STORAGE_KEY);

  if (!rawEntries) {
    entriesCache = mockEntries;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(serializeEntries(entriesCache))
    );
    return entriesCache;
  }

  try {
    entriesCache = deserializeEntries(JSON.parse(rawEntries) as StoredEntry[]);
  } catch {
    entriesCache = mockEntries;
  }

  return entriesCache;
}

function sortVisibleEntries(entries: TimeEntry[], userId: string) {
  return entries
    .filter((entry) => entry.userId === userId && !entry.deletedAt)
    .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
}

function generateEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `entry-${Date.now()}`;
}

export const localEntryRepository: EntryRepository = {
  subscribeEntries(userId, onEntries) {
    const emit = () => {
      onEntries(sortVisibleEntries(loadEntries(), userId));
    };

    listeners.add(emit);
    emit();

    return () => {
      listeners.delete(emit);
    };
  },
  async addEntry(input: AddEntryInput) {
    const capturedAt = input.capturedAt ?? new Date();
    const parts = toEntryTimeParts(capturedAt);
    const now = new Date();
    const text = input.text.trim();
    const nextEntry: TimeEntry = {
      id: generateEntryId(),
      userId: input.userId,
      dateKey: parts.dateKey,
      monthKey: parts.monthKey,
      timeText: parts.timeText,
      text,
      textNormalized: normalizeText(text),
      capturedAt: parts.capturedAt,
      timezone: parts.timezone,
      createdAt: now,
      updatedAt: null,
      deletedAt: null
    };

    saveEntries([nextEntry, ...loadEntries()]);
  },
  async updateEntry(input: UpdateEntryInput) {
    const text = input.text.trim();
    const nextEntries = loadEntries().map((entry) => {
      if (entry.id !== input.entryId || entry.userId !== input.userId) {
        return entry;
      }

      if (!input.capturedAt) {
        return {
          ...entry,
          text,
          textNormalized: normalizeText(text),
          updatedAt: new Date()
        };
      }

      const parts = toEntryTimeParts(input.capturedAt);

      return {
        ...entry,
        text,
        textNormalized: normalizeText(text),
        dateKey: parts.dateKey,
        monthKey: parts.monthKey,
        timeText: parts.timeText,
        capturedAt: parts.capturedAt,
        timezone: parts.timezone,
        updatedAt: new Date()
      };
    });

    saveEntries(nextEntries);
  },
  async softDeleteEntry(userId: string, entryId: string) {
    const nextEntries = loadEntries().map((entry) =>
      entry.id === entryId && entry.userId === userId
        ? {
            ...entry,
            deletedAt: new Date(),
            updatedAt: new Date()
          }
        : entry
    );

    saveEntries(nextEntries);
  }
};
