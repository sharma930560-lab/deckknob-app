import type { UserRef, FirestoreTimestamp, TaggedUser } from './user';

/**
 * Story — matches Firestore 'stories' collection document shape.
 * Reverse-engineered from storyService.js getActiveStories() and createStory().
 */
export interface Story {
  id: string;
  media_url: string;
  media_type: StoryMediaType;
  is_seen: boolean;
  overlays: StoryOverlay[];
  location: StoryLocation | null;
  music: StoryMusic | null;
  filter: string;
  adjustments: Record<string, unknown>;
  createdAt: FirestoreTimestamp | null;
}

export type StoryMediaType = 'image' | 'video';

/** A group of stories belonging to one user — returned by getActiveStories(). */
export interface StoryGroup {
  user: UserRef;
  stories: Story[];
  has_unseen: boolean;
}

export interface StoryOverlay {
  type: 'text' | 'sticker';
  content: string;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
}

export interface StoryLocation {
  name?: string;
  latitude?: number;
  longitude?: number;
}

export interface StoryMusic {
  title: string;
  artist: string;
  audioUrl: string;
  startTime?: number;
  duration?: number;
}

export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  coverUrl: string;
  storyIds: string[];
  createdAt: FirestoreTimestamp | null;
}

export interface StoryAnalytics {
  storyId: string;
  authorId: string;
  views: number;
  reach: number;
  replies: number;
  shares: number;
  stickerClicks: number;
  musicClicks: number;
  linkClicks: number;
  createdAt: FirestoreTimestamp | null;
}

/** Payload for creating a new story. */
export interface CreateStoryPayload {
  currentUid: string;
  username: string;
  avatar: string;
  mediaUrl: string;
  mediaType?: StoryMediaType;
  overlays?: StoryOverlay[];
  tags?: TaggedUser[];
  location?: StoryLocation;
  music?: StoryMusic;
  filter?: string;
  adjustments?: Record<string, unknown>;
  isDraft?: boolean;
  scheduledTime?: string | null;
}
