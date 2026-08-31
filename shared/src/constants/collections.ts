/**
 * Firestore collection name constants.
 * Single source of truth — prevents typos across web and mobile.
 * Reverse-engineered from all service files.
 */
export const COLLECTIONS = {
  USERS: 'users',
  USERNAMES: 'usernames',
  POSTS: 'posts',
  REELS: 'reels',
  STORIES: 'stories',
  STORY_VIEWS: 'storyViews',
  STORY_ANALYTICS: 'storyAnalytics',
  STORY_HIGHLIGHTS: 'storyHighlights',
  STORY_REPLIES: 'storyReplies',
  STORY_TAGS: 'storyTags',
  EVENTS: 'events',
  NOTIFICATIONS: 'notifications',
  CHATS: 'chats',
  LIKES: 'likes',
  SAVED_POSTS: 'savedPosts',
  FOLLOWING: 'following',
  FOLLOWERS: 'followers',
  MENTIONS: 'mentions',
  HASHTAGS: 'hashtags',
  MUSIC: 'music',
  VENUES: 'venues',
  VENUE_CHECKINS: 'venueCheckins',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
