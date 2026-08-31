import type { UserRef, FirestoreTimestamp, TaggedUser } from './user';

/**
 * Reel — matches Firestore 'reels' collection document shape.
 * Reverse-engineered from reelService.js getReels() return shape.
 */
export interface Reel {
  id: string;
  media_url: string;
  poster: string;
  caption: string;
  duration_seconds?: number;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  createdAt: FirestoreTimestamp | null;
  user: UserRef;
  taggedUsers?: TaggedUser[];
  mentionedUsernames?: string[];
  /** Present only on paginated queries — not serializable. */
  docSnapshot?: unknown;
}

/** Payload for creating a new reel. */
export interface CreateReelPayload {
  currentUid: string;
  username: string;
  avatar: string;
  role: string;
  mediaUrl: string;
  caption: string;
  durationSeconds?: number;
  taggedUsers?: TaggedUser[];
}
