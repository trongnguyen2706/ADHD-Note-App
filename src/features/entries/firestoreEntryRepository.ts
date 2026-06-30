import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type DocumentData
} from "firebase/firestore";
import { format } from "date-fns";
import { db } from "../../lib/firebase/client";
import { normalizeText } from "../../lib/text/normalizeText";
import { toEntryTimeParts } from "../../lib/time/currentEntryTime";
import type { AddEntryInput, TimeEntry, UpdateEntryInput } from "../../types/entry";
import type { EntryRepository } from "./repository";

type TimestampLike = {
  toDate: () => Date;
};

function isValidDate(value: Date) {
  return Number.isFinite(value.getTime());
}

function toDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value) {
    const timestampLike = value as TimestampLike;
    const nextDate = timestampLike.toDate();
    return isValidDate(nextDate) ? nextDate : null;
  }

  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  if (typeof value === "string" || typeof value === "number") {
    const nextDate = new Date(value);
    return isValidDate(nextDate) ? nextDate : null;
  }

  return null;
}

function mapFirestoreEntry(entryId: string, data: DocumentData): TimeEntry {
  const capturedAtDate = toDate(data.capturedAt);
  const capturedAt =
    typeof data.capturedAt === "string"
      ? data.capturedAt
      : capturedAtDate?.toISOString() ?? "";
  const dateKey =
    typeof data.dateKey === "string"
      ? data.dateKey
      : capturedAtDate
        ? format(capturedAtDate, "yyyy-MM-dd")
        : "";
  const monthKey =
    typeof data.monthKey === "string"
      ? data.monthKey
      : capturedAtDate
        ? format(capturedAtDate, "yyyy-MM")
        : dateKey.slice(0, 7);
  const timeText =
    typeof data.timeText === "string"
      ? data.timeText
      : capturedAtDate
        ? format(capturedAtDate, "HH:mm")
        : "";

  return {
    id: entryId,
    userId: typeof data.userId === "string" ? data.userId : "",
    dateKey,
    monthKey,
    timeText,
    text: typeof data.text === "string" ? data.text : "",
    textNormalized: typeof data.textNormalized === "string" ? data.textNormalized : "",
    capturedAt,
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

        let hasReceivedSnapshot = false;

        const unsubscribe = onSnapshot(
          entriesQuery,
          (snapshot) => {
            hasReceivedSnapshot = true;
            const nextEntries = snapshot.docs
              .map((entryDoc) => mapFirestoreEntry(entryDoc.id, entryDoc.data()))
              .filter((entry) => !entry.deletedAt);

            onEntries(nextEntries);
          },
          (error) => {
            onError?.(error);
          }
        );

        void getDocs(entriesQuery)
          .then((snapshot) => {
            if (hasReceivedSnapshot) {
              return;
            }

            const nextEntries = snapshot.docs
              .map((entryDoc) => mapFirestoreEntry(entryDoc.id, entryDoc.data()))
              .filter((entry) => !entry.deletedAt);

            onEntries(nextEntries);
          })
          .catch((error: unknown) => {
            if (hasReceivedSnapshot) {
              return;
            }

            onError?.(
              error instanceof Error
                ? error
                : new Error("Unable to load your timeline entries.")
            );
          });

        return unsubscribe;
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
