/**
 * App-wide constants shared between web and mobile.
 */

/** DECKKNOB brand color — used for avatars, accents, highlights. */
export const BRAND_COLOR = '#DFE104' as const;
export const BRAND_COLOR_DARK = '#09090B' as const;

/** Default fallback avatar base URL (ui-avatars.com). */
export const AVATAR_API_BASE = 'https://ui-avatars.com/api/' as const;

/** Story TTL in milliseconds (24 hours). */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

/** Default image for events without a banner. */
export const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600' as const;

/** User role options (matches backend and Firestore). */
export const USER_ROLES = ['fan', 'dj', 'venue', 'artist', 'promoter'] as const;

/** Music genres used throughout the app. */
export const MUSIC_GENRES = [
  'All',
  'Techno',
  'House',
  'Synthwave',
  'Drum & Bass',
  'Ambient',
  'Electronic',
  'Trance',
  'Dubstep',
] as const;

/** Venue crowd level options. */
export const CROWD_LEVELS = [
  'Low',
  'Moderate',
  'Busy',
  'Packed',
  'Full Capacity',
] as const;

/** Pagination limits. */
export const PAGINATION = {
  FEED_LIMIT: 10,
  REELS_LIMIT: 10,
  EXPLORE_POSTS_LIMIT: 6,
  EXPLORE_REELS_LIMIT: 6,
  SEARCH_USERS_LIMIT: 20,
  SUGGESTED_USERS_LIMIT: 10,
} as const;

/** Username constraints (must match backend validation). */
export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-z0-9_]+$/,
} as const;

/** Music username suggestion suffixes (matches authService.js). */
export const USERNAME_SUGGESTION_SUFFIXES = [
  '_dj',
  '_beats',
  '_groove',
  'music',
  '_underground',
  '_mix',
] as const;
