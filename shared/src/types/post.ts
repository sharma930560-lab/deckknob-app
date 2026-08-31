import type { UserRef, FirestoreTimestamp, TaggedUser } from './user';

/**
 * Post — matches Firestore 'posts' collection document shape.
 * Reverse-engineered from postService.js getFeedPosts() return shape.
 */
export interface Post {
  id: string;
  media_url: string;
  media_type: MediaType;
  caption: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  createdAt: FirestoreTimestamp | null;
  user: UserRef;
  taggedUsers?: TaggedUser[];
  mentionedUsernames?: string[];
  /** Present only on feed queries — used for cursor-based pagination. Not serializable. */
  docSnapshot?: unknown;
}

export type MediaType = 'image' | 'video';

/**
 * Comment — Firestore subcollection 'posts/{postId}/comments'.
 * Reverse-engineered from postService.js getComments() return shape.
 */
export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  createdAt: FirestoreTimestamp | null;
}

/** Payload for creating a new post. */
export interface CreatePostPayload {
  currentUid: string;
  username: string;
  avatar: string;
  role: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string;
  taggedUsers?: TaggedUser[];
}
