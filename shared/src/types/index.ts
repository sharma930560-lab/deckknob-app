/**
 * Barrel export for all shared type definitions.
 * Import from '@deckknob/shared' or '../../shared/src/types'.
 */

export type {
  UserProfile,
  UserRole,
  UserRef,
  TaggedUser,
  FirestoreTimestamp,
} from './user';

export type {
  Post,
  MediaType,
  Comment,
  CreatePostPayload,
} from './post';

export type {
  Reel,
  CreateReelPayload,
} from './reel';

export type {
  Story,
  StoryMediaType,
  StoryGroup,
  StoryOverlay,
  StoryLocation,
  StoryMusic,
  StoryHighlight,
  StoryAnalytics,
  CreateStoryPayload,
} from './story';

export type {
  DeckknobEvent,
  EventLineupEntry,
  CreateEventPayload,
} from './event';

export type {
  AppNotification,
  NotificationType,
  NotificationFromUser,
  CreateNotificationPayload,
} from './notification';

export type {
  Chat,
  Message,
} from './chat';

export type {
  MusicTrack,
  MusicSearchFilters,
} from './music';

export type {
  CrowdLevel,
  VenueCurrentMusic,
  VenueLineupEntry,
  Venue,
  VenueCheckin,
  LocationPrediction,
} from './venue';
