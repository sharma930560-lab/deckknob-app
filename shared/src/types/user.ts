/**
 * UserProfile — matches Firestore 'users' collection document shape.
 * Reverse-engineered from authService.js ensureUserProfile() and authStore.js.
 */
export interface UserProfile {
  uid: string;
  username: string;
  email: string | null;
  name: string;
  role: UserRole;
  profilePic: string;
  bio: string;
  genre: string;
  city: string;
  createdAt: FirestoreTimestamp | null;
  updatedAt: FirestoreTimestamp | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isOnline: boolean;
}

export type UserRole = 'fan' | 'dj' | 'venue' | 'artist' | 'promoter';

/** Lightweight user reference used inside posts, reels, stories, etc. */
export interface UserRef {
  id: string;
  username: string;
  profile_pic: string;
  role: UserRole;
}

/** Tagged/mentioned user payload used in post/reel creation. */
export interface TaggedUser {
  uid: string;
  username: string;
}

/**
 * Firebase Firestore Timestamp-like interface.
 * Covers both web SDK (Timestamp) and RN (plain object with toMillis).
 */
export interface FirestoreTimestamp {
  toMillis: () => number;
  seconds?: number;
  nanoseconds?: number;
}
