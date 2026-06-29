import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData
} from "firebase/firestore";
import { db } from "../../lib/firebase/client";
import { normalizeText } from "../../lib/text/normalizeText";
import { toEntryTimeParts } from "../../lib/time/currentEntryTime";
import type { AddEntryInput, TimeEntry, UpdateEntryInput } from "../../types/entry";
import type { EntryRepository } from "./repository";

function toDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const toDateMethod = (value as { toDate: () => Date }).toDate;
    return typeof toDateMethod === "function" ? toDateMethod() : null;
  }

  return null;
}

function mapFirestoreEntry(entryId: string, data: DocumentData): TimeEntry {
  return {
    id: entryId,
    userId: typeof data.userId === "string" ? data.userId : "",
    dateKey: typeof data.dateKey === "string" ? data.dateKey : "",
    monthKey: typeof data.monthKey === "string" ? data.monthKey : "",
    timeText: typeof data.timeText === "string" ? data.timeText : "",
    text: typeof data.text === "string" ? data.text : "",
    textNormalized: typeof data.textNormalized === "string" ? data.textNormalized : "",
    capturedAt: typeof data.capturedAt === "string" ? data.capturedAt : "",
    timezone: typeof data.timezone === "string" ? data.timezone : "",
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    deletedAt: toDate(data.deletedAt)
  };
}

function getEntriesCollection(userId: string) {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  return collection(db, "users", userId, "entries");
}

function getEntryDoc(userId: string, entryId: string) {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  return doc(db, "users", userId, "entries", entryId);
}

export const firestoreEntryRepository: EntryRepository | null = db
  ? {
      subscribeEntries(userId, onEntries, onError) {
        const entriesQuery = query(
          getEntriesCollection(userId),
          orderBy("capturedAt", "desc")
        );

        return onSnapshot(
          entriesQuery,
          (snapshot) => {
            const nextEntries = snapshot.docs
              .map((entryDoc) => mapFirestoreEntry(entryDoc.id, entryDoc.data()))
              .filter((entry) => !entry.deletedAt);

            onEntries(nextEntries);
          },
          (error) => {
            onError?.(error);
          }
        );
      },
      async addEntry(input: AddEntryInput) {
        const parts = toEntryTimeParts(input.capturedAt ?? new Date());
        const text = input.text.trim();

        await addDoc(getEntriesCollection(input.userId), {
          userId: input.userId,
          dateKey: parts.dateKey,
          monthKey: parts.monthKey,
          timeText: parts.timeText,
          text,
          textNormalized: normalizeText(text),
          capturedAt: parts.capturedAt,
          timezone: parts.timezone,
          createdAt: serverTimestamp(),
          updatedAt: null,
          deletedAt: null
        });
      },
      async updateEntry(input: UpdateEntryInput) {
        const text = input.text.trim();
        const payload: Record<string, unknown> = {
          text,
          textNormalized: normalizeText(text),
          updatedAt: serverTimestamp()
        };

        if (input.capturedAt) {
          const parts = toEntryTimeParts(input.capturedAt);
          payload.dateKey = parts.dateKey;
          payload.monthKey = parts.monthKey;
          payload.timeText = parts.timeText;
          payload.capturedAt = parts.capturedAt;
          payload.timezone = parts.timezone;
        }

        await updateDoc(getEntryDoc(input.userId, input.entryId), payload);
      },
      async softDeleteEntry(userId: string, entryId: string) {
        await updateDoc(getEntryDoc(userId, entryId), {
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    }
  : null;
