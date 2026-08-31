import type { FirestoreTimestamp } from './user';

/**
 * Event — matches Firestore 'events' collection document shape.
 * Reverse-engineered from eventService.js createEvent() and getEvents().
 */
export interface DeckknobEvent {
  id: string;
  authorId: string;
  username: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  image: string;
  description: string;
  url: string;
  lineup: EventLineupEntry[];
  attendees: string[];
  createdAt: FirestoreTimestamp | null;
}

export interface EventLineupEntry {
  dj?: string;
  artist?: string;
  time?: string;
  stage?: string;
}

/** Payload for creating a new event. */
export interface CreateEventPayload {
  currentUid: string;
  username: string;
  title: string;
  venue: string;
  dateTimeStr: string;
  websiteUrl?: string;
  description?: string;
  mediaUrl?: string;
}
