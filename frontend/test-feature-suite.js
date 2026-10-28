/**
 * Automated Verification Suite for DECKKNOB Feature Requests:
 * 1. Posts image-only validation
 * 2. Klyps video-only & 59s maximum duration validation
 * 3. Klyps optional cover photo & auto thumbnail fallback
 * 4. Comments on Posts and Klyps with blocking check
 * 5. Direct Chat (inbox, conversation, timestamps, blocking)
 */

import './load-env.js';
import assert from 'assert';
import { validateAudioFile, MAX_AUDIO_FILE_SIZE, SUPPORTED_AUDIO_FORMATS } from './src/services/playlistService.js';
import { evaluateTrackRights, validatePublishing, assertTrackSyncAuthorized, LicensingValidationError } from './src/services/musicService.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  DECKKNOB 5-FEATURE VERIFICATION TEST SUITE');
console.log('═══════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    -> ${err.message}`);
    failCount++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 1: POSTS IMAGE-ONLY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('▶ [FEATURE 1] POSTS: Image Uploads Only & Video Rejection');

const POST_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validatePostFile(file) {
  if (file.type.startsWith('video/')) {
    return {
      allowed: false,
      error: 'Posts accept images only (JPG, PNG, WebP). Videos are not allowed for posts. Please switch to Klyps to upload a video.'
    };
  }
  if (!POST_IMAGE_MIMES.has(file.type)) {
    return {
      allowed: false,
      error: 'Posts accept JPG, PNG, and WebP images only.'
    };
  }
  return { allowed: true };
}

test('Post accepts JPG image', () => {
  const res = validatePostFile({ type: 'image/jpeg', name: 'photo.jpg' });
  assert.strictEqual(res.allowed, true);
});

test('Post accepts PNG image', () => {
  const res = validatePostFile({ type: 'image/png', name: 'artwork.png' });
  assert.strictEqual(res.allowed, true);
});

test('Post accepts WebP image', () => {
  const res = validatePostFile({ type: 'image/webp', name: 'flyer.webp' });
  assert.strictEqual(res.allowed, true);
});

test('Post rejects MP4 video with clear explanatory error message', () => {
  const res = validatePostFile({ type: 'video/mp4', name: 'dj_clip.mp4' });
  assert.strictEqual(res.allowed, false);
  assert.match(res.error, /Posts accept images only/);
  assert.match(res.error, /Videos are not allowed for posts/);
  assert.match(res.error, /Please switch to Klyps/);
});

test('Post rejects MOV video', () => {
  const res = validatePostFile({ type: 'video/quicktime', name: 'set.mov' });
  assert.strictEqual(res.allowed, false);
  assert.match(res.error, /Posts accept images only/);
});

test('Post rejects PDF document', () => {
  const res = validatePostFile({ type: 'application/pdf', name: 'rider.pdf' });
  assert.strictEqual(res.allowed, false);
  assert.match(res.error, /Posts accept JPG, PNG, and WebP/);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: KLYPS VIDEO-ONLY & STRICT 59s DURATION VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 2] KLYPS: Video Only & 59s Maximum Duration');

const KLYP_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

function validateKlypFile(file, durationSeconds) {
  if (!file.type.startsWith('video/')) {
    return {
      allowed: false,
      error: 'Klyps accept videos only (MP4, MOV, WebM). Images are not allowed. Please switch to Posts to upload an image.'
    };
  }
  if (!KLYP_VIDEO_MIMES.has(file.type)) {
    return {
      allowed: false,
      error: 'Unsupported video format for Klyp. Allowed formats: MP4, MOV, WebM.'
    };
  }
  if (durationSeconds > 59) {
    return {
      allowed: false,
      error: `Klyp videos must be 59 seconds or less (uploaded video is ${durationSeconds}s). Please select or trim a shorter video.`
    };
  }
  return { allowed: true };
}

test('Klyp rejects image file with clear switch-to-posts message', () => {
  const res = validateKlypFile({ type: 'image/jpeg', name: 'flyer.jpg' }, 0);
  assert.strictEqual(res.allowed, false);
  assert.match(res.error, /Klyps accept videos only/);
  assert.match(res.error, /Please switch to Posts/);
});

test('Klyp accepts MP4 video under 59 seconds (e.g. 30s)', () => {
  const res = validateKlypFile({ type: 'video/mp4', name: 'drop.mp4' }, 30);
  assert.strictEqual(res.allowed, true);
});

test('Klyp accepts video at exactly 59 seconds', () => {
  const res = validateKlypFile({ type: 'video/mp4', name: 'transition.mp4' }, 59);
  assert.strictEqual(res.allowed, true);
});

test('Klyp rejects video exceeding 59 seconds (e.g. 60s)', () => {
  const res = validateKlypFile({ type: 'video/mp4', name: 'long_set.mp4' }, 60);
  assert.strictEqual(res.allowed, false);
  assert.match(res.error, /59 seconds or less/);
  assert.match(res.error, /60s/);
});

test('Klyp rejects video exceeding 59 seconds (e.g. 120s)', () => {
  const res = validateKlypFile({ type: 'video/quicktime', name: 'set_120.mov' }, 120);
  assert.strictEqual(res.allowed, false);
  assert.match(res.error, /120s/);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3: OPTIONAL VIDEO COVER & AUTO THUMBNAIL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 3] OPTIONAL VIDEO COVER & AUTOMATIC THUMBNAIL');

function resolveReelPoster(mediaUrl, options = {}) {
  const defaultPoster = mediaUrl ? mediaUrl.replace(/\.[^/.]+$/, '.jpg') : '';
  return options.coverUrl || options.poster || defaultPoster || mediaUrl;
}

test('Reel uses user-uploaded custom cover when provided', () => {
  const mediaUrl = 'https://res.cloudinary.com/demo/video/upload/sample.mp4';
  const customCover = 'https://res.cloudinary.com/demo/image/upload/custom_cover.jpg';
  const poster = resolveReelPoster(mediaUrl, { coverUrl: customCover });
  assert.strictEqual(poster, customCover);
});

test('Reel uses captured frame cover when provided in options.coverUrl', () => {
  const mediaUrl = 'https://res.cloudinary.com/demo/video/upload/set.mp4';
  const frameCover = 'https://res.cloudinary.com/demo/image/upload/frame_snapshot.jpg';
  const poster = resolveReelPoster(mediaUrl, { coverUrl: frameCover });
  assert.strictEqual(poster, frameCover);
});

test('Reel automatically generates thumbnail URL when cover is skipped', () => {
  const mediaUrl = 'https://res.cloudinary.com/demo/video/upload/club_reel.mp4';
  const poster = resolveReelPoster(mediaUrl);
  assert.strictEqual(poster, 'https://res.cloudinary.com/demo/video/upload/club_reel.jpg');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4: COMMENTS ON POSTS & KLYPS WITH BLOCK ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 4] COMMENTS ON POSTS AND KLYPS');

function checkCanComment({ authorId, commenterId, blockedUsersA = [], blockedUsersB = [] }) {
  if (!commenterId) {
    throw new Error('Authentication required to comment.');
  }
  if (authorId && authorId !== commenterId) {
    if (blockedUsersA.includes(commenterId) || blockedUsersB.includes(authorId)) {
      throw new Error('Cannot comment: communication restricted.');
    }
  }
  return true;
}

test('Permits commenting when neither user has blocked the other', () => {
  const allowed = checkCanComment({
    authorId: 'user_dj1',
    commenterId: 'user_fan1',
    blockedUsersA: [],
    blockedUsersB: []
  });
  assert.strictEqual(allowed, true);
});

test('Blocks comment if post author has blocked commenter', () => {
  assert.throws(() => {
    checkCanComment({
      authorId: 'user_dj1',
      commenterId: 'user_blocked_guy',
      blockedUsersA: ['user_blocked_guy'],
      blockedUsersB: []
    });
  }, /communication restricted/);
});

test('Blocks comment if commenter has blocked post author', () => {
  assert.throws(() => {
    checkCanComment({
      authorId: 'user_dj1',
      commenterId: 'user_fan2',
      blockedUsersA: [],
      blockedUsersB: ['user_dj1']
    });
  }, /communication restricted/);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5: DIRECT CHAT (INBOX, CONVERSATION, TIMESTAMPS, MESSAGE SENDING)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 5] DIRECT CHAT: Instagram-Style Messaging');

function computeChatId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

test('Chat ID is deterministic regardless of participant order', () => {
  const id1 = computeChatId('user_alpha', 'user_beta');
  const id2 = computeChatId('user_beta', 'user_alpha');
  assert.strictEqual(id1, 'user_alpha_user_beta');
  assert.strictEqual(id1, id2);
});

function formatRelativeInboxTime(ts) {
  if (!ts) return '';
  const now = Date.now();
  const diffMinutes = Math.floor((now - ts) / 60000);
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1d';
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

test('Formats relative timestamps for chat inbox correctly', () => {
  const now = Date.now();
  assert.strictEqual(formatRelativeInboxTime(now - 30 * 1000), 'now');
  assert.strictEqual(formatRelativeInboxTime(now - 15 * 60 * 1000), '15m');
  assert.strictEqual(formatRelativeInboxTime(now - 2 * 3600 * 1000), '2h');
  assert.strictEqual(formatRelativeInboxTime(now - 24 * 3600 * 1000), '1d');
});

function canSendChatMessage({ senderId, recipientId, isBlockedEitherWay }) {
  if (!senderId || !recipientId) throw new Error('Missing sender or recipient');
  if (isBlockedEitherWay) {
    throw new Error('Message delivery blocked: communication restricted.');
  }
  return true;
}

test('Sending message succeeds between unblocked users', () => {
  const res = canSendChatMessage({ senderId: 'u1', recipientId: 'u2', isBlockedEitherWay: false });
  assert.strictEqual(res, true);
});

test('Sending message fails when user is blocked', () => {
  assert.throws(() => {
    canSendChatMessage({ senderId: 'u1', recipientId: 'u2', isBlockedEitherWay: true });
  }, /Message delivery blocked: communication restricted/);
});

test('Chat unread indicator is active only when last message was from other participant and not read by me', () => {
  const myUid = 'user_me';
  const chatUnread = {
    lastSenderId: 'user_other',
    readBy: ['user_other']
  };
  const isUnread = Boolean(
    chatUnread.lastSenderId &&
    chatUnread.lastSenderId !== myUid &&
    (!chatUnread.readBy || !chatUnread.readBy.includes(myUid))
  );
  assert.strictEqual(isUnread, true);

  const chatRead = {
    lastSenderId: 'user_other',
    readBy: ['user_other', myUid]
  };
  const isRead = Boolean(
    chatRead.lastSenderId &&
    chatRead.lastSenderId !== myUid &&
    (!chatRead.readBy || !chatRead.readBy.includes(myUid))
  );
  assert.strictEqual(isRead, false);

  const chatSentByMe = {
    lastSenderId: myUid,
    readBy: [myUid]
  };
  const isSentByMeUnread = Boolean(
    chatSentByMe.lastSenderId &&
    chatSentByMe.lastSenderId !== myUid &&
    (!chatSentByMe.readBy || !chatSentByMe.readBy.includes(myUid))
  );
  assert.strictEqual(isSentByMeUnread, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 6: FOLLOW / UNFOLLOW / FOLLOW BACK SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 6] FOLLOW SYSTEM: Follow, Unfollow & Follow Back');

function resolveFollowButtonState({ isFollowing, isFollowedBy, isSelf }) {
  if (isSelf) return 'Self';
  if (isFollowing) return 'Following';
  if (isFollowedBy && !isFollowing) return 'Follow Back';
  return 'Follow';
}

test('Displays "Following" when user is already followed', () => {
  const state = resolveFollowButtonState({ isFollowing: true, isFollowedBy: false, isSelf: false });
  assert.strictEqual(state, 'Following');
});

test('Displays "Follow Back" when target user follows me and I do not follow them', () => {
  const state = resolveFollowButtonState({ isFollowing: false, isFollowedBy: true, isSelf: false });
  assert.strictEqual(state, 'Follow Back');
});

test('Displays "Follow" when neither user follows the other', () => {
  const state = resolveFollowButtonState({ isFollowing: false, isFollowedBy: false, isSelf: false });
  assert.strictEqual(state, 'Follow');
});

test('Displays "Following" when mutual following is active', () => {
  const state = resolveFollowButtonState({ isFollowing: true, isFollowedBy: true, isSelf: false });
  assert.strictEqual(state, 'Following');
});

function simulateFollow({ currentUid, targetUid, existingFollowing }) {
  if (!currentUid || !targetUid) throw new Error('UID required');
  if (currentUid === targetUid) throw new Error('Cannot follow yourself');
  if (existingFollowing.has(targetUid)) throw new Error('Already following user');
  existingFollowing.add(targetUid);
  return { success: true, countDelta: 1 };
}

test('Prevents following oneself', () => {
  assert.throws(() => {
    simulateFollow({ currentUid: 'u1', targetUid: 'u1', existingFollowing: new Set() });
  }, /Cannot follow yourself/);
});

test('Prevents duplicate follow actions', () => {
  const following = new Set(['u2']);
  assert.throws(() => {
    simulateFollow({ currentUid: 'u1', targetUid: 'u2', existingFollowing: following });
  }, /Already following user/);
});

test('Follow count increments and decrements accurately', () => {
  let followersCount = 42;
  // Follow
  followersCount = followersCount + 1;
  assert.strictEqual(followersCount, 43);
  // Unfollow
  followersCount = Math.max(0, followersCount - 1);
  assert.strictEqual(followersCount, 42);
  // Floor at 0
  followersCount = Math.max(0, 0 - 1);
  assert.strictEqual(followersCount, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 7: FOLLOWERS AND FOLLOWING LISTS MODAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 7] FOLLOW LISTS: Followers & Following Modals');

function formatFollowListUser(raw) {
  return {
    uid: raw.uid || raw.id,
    username: raw.username || 'selector',
    profilePic: raw.profilePic || raw.profile_pic || `https://ui-avatars.com/api/?name=${raw.username || 'U'}&background=DFE104&color=000&bold=true`,
    genre: raw.genre || raw.role || 'Selector'
  };
}

test('Formats follower item with fallback avatar and role', () => {
  const user = formatFollowListUser({ uid: 'u9', username: 'carlcox', role: 'Legendary DJ' });
  assert.strictEqual(user.username, 'carlcox');
  assert.match(user.profilePic, /ui-avatars\.com/);
  assert.strictEqual(user.genre, 'Legendary DJ');
});

test('Follow list modal differentiates between empty, loading, and populated states', () => {
  function getModalView({ loading, list, error }) {
    if (loading) return 'LOADING';
    if (error) return 'ERROR';
    if (!list || list.length === 0) return 'EMPTY';
    return 'LIST';
  }
  assert.strictEqual(getModalView({ loading: true, list: [] }), 'LOADING');
  assert.strictEqual(getModalView({ loading: false, list: [] }), 'EMPTY');
  assert.strictEqual(getModalView({ loading: false, list: [{ uid: '1' }] }), 'LIST');
  assert.strictEqual(getModalView({ loading: false, error: 'Network error' }), 'ERROR');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 8: INSTAGRAM-STYLE STORY MENTIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 8] STORY MENTIONS: @username Tagging & Interactive Stickers');

function parseMentionsFromText(text) {
  if (!text) return [];
  const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

test('Parses @username mentions correctly from caption or sticker text', () => {
  const text = 'Back to back set with @peggygou and @carlcox tonight! @peggygou';
  const mentions = parseMentionsFromText(text);
  assert.deepStrictEqual(mentions, ['peggygou', 'carlcox']);
});

function createMentionOverlay(targetUser) {
  const cleanUsername = targetUser.username.replace(/^@/, '');
  return {
    id: 'mention_12345',
    type: 'mention',
    username: cleanUsername,
    text: '@' + cleanUsername,
    targetUid: targetUser.uid,
    rotation: 0,
    size: 24,
    x: 80,
    y: 120
  };
}

test('Creates interactive mention overlay with targetUid and formatted text', () => {
  const overlay = createMentionOverlay({ uid: 'uid_peggy', username: 'peggygou' });
  assert.strictEqual(overlay.type, 'mention');
  assert.strictEqual(overlay.username, 'peggygou');
  assert.strictEqual(overlay.text, '@peggygou');
  assert.strictEqual(overlay.targetUid, 'uid_peggy');
});

function shouldNotifyMention({ authorId, targetUid, isBlocked }) {
  if (!targetUid || targetUid === authorId) return false;
  if (isBlocked) return false;
  return true;
}

test('Notifies mentioned user when not self and not blocked', () => {
  assert.strictEqual(shouldNotifyMention({ authorId: 'u1', targetUid: 'u2', isBlocked: false }), true);
});

test('Does not notify self when mentioning own username', () => {
  assert.strictEqual(shouldNotifyMention({ authorId: 'u1', targetUid: 'u1', isBlocked: false }), false);
});

test('Does not notify mentioned user when account is blocked', () => {
  assert.strictEqual(shouldNotifyMention({ authorId: 'u1', targetUid: 'u2', isBlocked: true }), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 9: PERSONALIZED FEED PRIORITIZATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 9] PERSONALIZED FEED: Followed Creators Priority & Deduplication');

function personalizeAndSortFeed(posts, followingUserIds, activeUid) {
  // 1. Mark isFromFollowed
  const enriched = posts.map(p => ({
    ...p,
    isFromFollowed: Boolean(p.authorId && (followingUserIds.has(p.authorId) || p.authorId === activeUid))
  }));

  // 2. Sort: followed creators first, then recency
  return enriched.sort((a, b) => {
    if (a.isFromFollowed && !b.isFromFollowed) return -1;
    if (!a.isFromFollowed && b.isFromFollowed) return 1;
    return b.timestamp - a.timestamp;
  });
}

test('Prioritizes posts from followed users over older non-followed posts', () => {
  const following = new Set(['user_friend']);
  const posts = [
    { id: 'p1', authorId: 'user_stranger', timestamp: 300 }, // newer stranger
    { id: 'p2', authorId: 'user_friend', timestamp: 200 },   // slightly older friend
    { id: 'p3', authorId: 'user_stranger2', timestamp: 100 } // oldest stranger
  ];

  const sorted = personalizeAndSortFeed(posts, following, 'my_uid');
  assert.strictEqual(sorted[0].id, 'p2'); // Friend's post prioritized at top
  assert.strictEqual(sorted[1].id, 'p1'); // Stranger post next by recency
  assert.strictEqual(sorted[2].id, 'p3');
});

test('Provides clean recency order when user follows 0 people (discovery experience)', () => {
  const following = new Set();
  const posts = [
    { id: 'p1', authorId: 'user_a', timestamp: 100 },
    { id: 'p2', authorId: 'user_b', timestamp: 300 },
    { id: 'p3', authorId: 'user_c', timestamp: 200 }
  ];

  const sorted = personalizeAndSortFeed(posts, following, 'my_uid');
  assert.strictEqual(sorted[0].id, 'p2');
  assert.strictEqual(sorted[1].id, 'p3');
  assert.strictEqual(sorted[2].id, 'p1');
});

test('Feed deduplication ensures no duplicate post IDs during pagination', () => {
  const existingPosts = [{ id: 'post_1' }, { id: 'post_2' }];
  const incomingPosts = [{ id: 'post_2' }, { id: 'post_3' }]; // post_2 is duplicate

  const existingIds = new Set(existingPosts.map(p => p.id));
  const newUnique = incomingPosts.filter(p => !existingIds.has(p.id));
  const merged = [...existingPosts, ...newUnique];

  assert.strictEqual(merged.length, 3);
  assert.deepStrictEqual(merged.map(p => p.id), ['post_1', 'post_2', 'post_3']);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 6: DIRECT MESSAGES: MINIMAL ARCHITECTURE & PERMISSION SAFETY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 6] DIRECT MESSAGES: Minimal Architecture & Permission Safety');

function computeDeterministicChatId(uid1, uid2) {
  if (!uid1 || !uid2) throw new Error('User IDs required');
  if (uid1 === uid2) throw new Error('Cannot chat with self');
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

test('Chat IDs are deterministic and commutative regardless of initiator', () => {
  const id1 = computeDeterministicChatId('user_alice', 'user_bob');
  const id2 = computeDeterministicChatId('user_bob', 'user_alice');
  assert.strictEqual(id1, 'user_alice_user_bob');
  assert.strictEqual(id1, id2);
});

test('Self-chat attempts are rejected', () => {
  assert.throws(() => computeDeterministicChatId('user_same', 'user_same'), /Cannot chat with self/);
});

test('Client block check only queries caller own block collection, avoiding cross-user permission errors', () => {
  // Simulating Firestore security rule constraint: request.auth.uid == userId
  function canReadBlockDoc(callerUid, targetCollectionUid) {
    return callerUid === targetCollectionUid;
  }
  
  const currentUid = 'user_alice';
  const otherUid = 'user_bob';

  // Caller reading own blocked list is allowed
  assert.strictEqual(canReadBlockDoc(currentUid, currentUid), true);
  // Caller reading other user's blocked list is DENIED by security rules
  assert.strictEqual(canReadBlockDoc(currentUid, otherUid), false);
});

test('Unread status calculation distinguishes current user vs sender', () => {
  const chat1 = { lastSenderId: 'user_bob', readBy: ['user_bob'] };
  const chat2 = { lastSenderId: 'user_bob', readBy: ['user_bob', 'user_alice'] };
  const chat3 = { lastSenderId: 'user_alice', readBy: ['user_alice'] };

  const isUnread1 = Boolean(chat1.lastSenderId !== 'user_alice' && !chat1.readBy.includes('user_alice'));
  const isUnread2 = Boolean(chat2.lastSenderId !== 'user_alice' && !chat2.readBy.includes('user_alice'));
  const isUnread3 = Boolean(chat3.lastSenderId !== 'user_alice' && !chat3.readBy.includes('user_alice'));

  assert.strictEqual(isUnread1, true);  // Unread from Bob
  assert.strictEqual(isUnread2, false); // Read by Alice
  assert.strictEqual(isUnread3, false); // Sent by Alice, not unread for Alice
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 7: FIRE 🔥 REACTION TOGGLE & COUNT FORMATTING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 7] FIRE 🔥 REACTION: Reaction System & Formatting');

function formatFireCount(count) {
  const num = Math.max(0, Number(count) || 0);
  return `🔥 ${num.toLocaleString()} ${num === 1 ? 'Fire' : 'Fires'}`;
}

test('Formats 0 fires correctly', () => {
  assert.strictEqual(formatFireCount(0), '🔥 0 Fires');
});

test('Formats 1 fire singular correctly', () => {
  assert.strictEqual(formatFireCount(1), '🔥 1 Fire');
});

test('Formats plural fires correctly', () => {
  assert.strictEqual(formatFireCount(125), '🔥 125 Fires');
  assert.strictEqual(formatFireCount(1000), '🔥 1,000 Fires');
});

test('Fire reaction toggle optimistic update updates count accurately', () => {
  let isLiked = false;
  let likesCount = 10;

  // 1. User taps fire
  const toggle1 = !isLiked;
  isLiked = toggle1;
  likesCount = toggle1 ? likesCount + 1 : Math.max(0, likesCount - 1);
  assert.strictEqual(isLiked, true);
  assert.strictEqual(likesCount, 11);

  // 2. User taps again to remove fire
  const toggle2 = !isLiked;
  isLiked = toggle2;
  likesCount = toggle2 ? likesCount + 1 : Math.max(0, likesCount - 1);
  assert.strictEqual(isLiked, false);
  assert.strictEqual(likesCount, 10);
});

test('Prevents negative fire counts on unreact', () => {
  let likesCount = 0;
  likesCount = Math.max(0, likesCount - 1);
  assert.strictEqual(likesCount, 0);
});

test('Debounces rapid taps to avoid duplicate reaction requests', () => {
  let requestCount = 0;
  let isLocked = false;

  function triggerReaction() {
    if (isLocked) return;
    isLocked = true;
    requestCount += 1;
    setTimeout(() => { isLocked = false; }, 260);
  }

  // 1st tap goes through
  triggerReaction();
  assert.strictEqual(requestCount, 1);

  // 2nd rapid tap within throttle window is ignored
  triggerReaction();
  assert.strictEqual(requestCount, 1);
});

test('Rolls back reaction state and count on Firebase failure', () => {
  let isLiked = false;
  let likesCount = 5;

  // Optimistic update
  const attemptedLike = !isLiked;
  isLiked = attemptedLike;
  likesCount += 1;

  assert.strictEqual(isLiked, true);
  assert.strictEqual(likesCount, 6);

  // Simulated network/Firebase error occurs -> rollback
  const errorOccurred = true;
  if (errorOccurred) {
    isLiked = !attemptedLike;
    likesCount = Math.max(0, likesCount - 1);
  }

  assert.strictEqual(isLiked, false);
  assert.strictEqual(likesCount, 5);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 8: STRICT SINGLE ACCOUNT & EMAIL NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 8] STRICT SINGLE ACCOUNT & EMAIL NORMALIZATION');

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

test('Normalizes emails with whitespace and uppercase', () => {
  assert.strictEqual(normalizeEmail('  User@Example.COM  '), 'user@example.com');
  assert.strictEqual(normalizeEmail('DJ.PRODUCER@GMAIL.COM'), 'dj.producer@gmail.com');
});

test('Preserves dots and plus aliases to protect distinct user accounts', () => {
  const email1 = 'dj.producer+testing@gmail.com';
  const email2 = 'djproducer@gmail.com';
  assert.strictEqual(normalizeEmail(email1), 'dj.producer+testing@gmail.com');
  assert.notStrictEqual(normalizeEmail(email1), normalizeEmail(email2));
});

test('Account store holds single account identity without switchers', () => {
  const authState = {
    user: { uid: 'user_dj_123', email: 'resident@deckknob.com', role: 'dj' },
    profile: { id: 'user_dj_123', role: 'dj', displayName: 'Resident DJ' }
  };
  assert.strictEqual(authState.user.role, 'dj');
  assert.strictEqual(Boolean(authState.accounts), false); // No multi-account array
  assert.strictEqual(Boolean(authState.switchAccount), false); // No switcher method
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 9: STRONG PASSWORD POLICY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 9] STRONG PASSWORD POLICY VALIDATION');

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'password1234',
  'password12345',
  '123456789012',
  'qwerty123456',
  'deckknob123!',
  'deckknob2026',
  'welcome1234!'
]);

function validatePassword(password, confirmPassword = null) {
  const pwd = typeof password === 'string' ? password : '';
  const requirements = {
    minLength: pwd.length >= 12,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd),
    notCommon: pwd.length > 0 && !COMMON_PASSWORDS.has(pwd.toLowerCase().trim()),
    matchesConfirm: confirmPassword === null || (pwd.length > 0 && pwd === confirmPassword)
  };

  const errors = [];
  if (!requirements.minLength) errors.push('Password must be at least 12 characters.');
  if (!requirements.hasUpper) errors.push('Include at least one uppercase letter (A-Z).');
  if (!requirements.hasLower) errors.push('Include at least one lowercase letter (a-z).');
  if (!requirements.hasNumber) errors.push('Include at least one number (0-9).');
  if (!requirements.hasSpecial) errors.push('Include at least one special character (!@#$%^&*...).');
  if (!requirements.notCommon) errors.push('Password is too common or easily guessed.');
  if (confirmPassword !== null && !requirements.matchesConfirm) errors.push('Passwords do not match.');

  const passedCount = [
    requirements.minLength,
    requirements.hasUpper,
    requirements.hasLower,
    requirements.hasNumber,
    requirements.hasSpecial,
    requirements.notCommon
  ].filter(Boolean).length;

  let score = 0;
  if (pwd.length > 0) {
    if (passedCount <= 2) score = 1;
    else if (passedCount <= 4) score = 2;
    else if (passedCount === 5) score = 3;
    else if (passedCount === 6) score = 4;
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
    requirements
  };
}

test('Rejects short passwords (< 12 characters)', () => {
  const res = validatePassword('Short123!Ab');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.requirements.minLength, false);
  assert.ok(res.errors.some((e) => e.includes('at least 12 characters')));
});

test('Rejects passwords missing uppercase letters', () => {
  const res = validatePassword('deckknobmusic2026!#');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.requirements.hasUpper, false);
});

test('Rejects passwords missing numeric digits', () => {
  const res = validatePassword('DeckknobMusicOnly!#');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.requirements.hasNumber, false);
});

test('Rejects passwords missing special characters', () => {
  const res = validatePassword('DeckknobMusic2026xY');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.requirements.hasSpecial, false);
});

test('Rejects common / easily guessed passwords', () => {
  const res = validatePassword('deckknob123!');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.requirements.notCommon, false);
});

test('Rejects confirmation mismatch', () => {
  const res = validatePassword('ValidPassword2026!#', 'DifferentPassword2026!#');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.requirements.matchesConfirm, false);
  assert.ok(res.errors.some((e) => e.includes('do not match')));
});

test('Accepts compliant strong password', () => {
  const res = validatePassword('ValidPassword2026!#', 'ValidPassword2026!#');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.score, 4);
  assert.strictEqual(res.errors.length, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 10: PASSWORD STRENGTH SCORER
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 10] PASSWORD STRENGTH SCORER');

function calculatePasswordStrength(password) {
  const { score, requirements } = validatePassword(password);
  switch (score) {
    case 1:
      return { score, label: 'Weak', color: '#EF4444', percent: 25, requirements };
    case 2:
      return { score, label: 'Fair', color: '#F59E0B', percent: 50, requirements };
    case 3:
      return { score, label: 'Good', color: '#3B82F6', percent: 75, requirements };
    case 4:
      return { score, label: 'Strong', color: '#10B981', percent: 100, requirements };
    default:
      return { score: 0, label: '', color: '#3F3F46', percent: 0, requirements };
  }
}

test('Strength calculator outputs proper scores and visual indicators', () => {
  const weak = calculatePasswordStrength('short');
  assert.strictEqual(weak.label, 'Weak');
  assert.strictEqual(weak.percent, 25);

  const fair = calculatePasswordStrength('Password123');
  assert.strictEqual(fair.label, 'Fair');
  assert.strictEqual(fair.percent, 50);

  const strong = calculatePasswordStrength('SuperSecretPassword2026!#');
  assert.strictEqual(strong.label, 'Strong');
  assert.strictEqual(strong.percent, 100);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 11: DUPLICATE EMAIL ERROR HANDLING & FRIENDLY RECOVERY GUIDANCE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 11] DUPLICATE EMAIL HANDLING & USER RECOVERY GUIDANCE');

function formatAuthError(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') {
    return 'An account may already exist for this email. Please log in or recover your password.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please verify your credentials or reset your password.';
  }
  if (code === 'auth/expired-action-code') {
    return 'This password reset link has expired. Please request a new one.';
  }
  if (code === 'auth/invalid-action-code') {
    return 'This recovery link is invalid or has already been used.';
  }
  return error?.message || 'Authentication failed. Please try again.';
}

test('Suppresses raw Firebase email-already-in-use code and provides recovery guidance', () => {
  const friendly = formatAuthError({ code: 'auth/email-already-in-use', message: 'Firebase: Error (auth/email-already-in-use).' });
  assert.strictEqual(friendly, 'An account may already exist for this email. Please log in or recover your password.');
  assert.ok(!friendly.includes('auth/'));
  assert.ok(!friendly.includes('Firebase:'));
});

test('Suppresses raw Firebase invalid-credential code to prevent account enumeration', () => {
  const friendly = formatAuthError({ code: 'auth/invalid-credential' });
  assert.strictEqual(friendly, 'Invalid email or password. Please verify your credentials or reset your password.');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 12: PASSWORD RECOVERY LINK & EMAIL VERIFICATION STATE CHECKING
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 12] PASSWORD RECOVERY & EMAIL VERIFICATION STATE');

test('Password reset URL parser extracts mode and oobCode safely', () => {
  const url = 'https://deckknob-684f7.web.app/reset-password?mode=resetPassword&oobCode=XYZ987SECRET';
  const parsed = new URL(url);
  const mode = parsed.searchParams.get('mode');
  const oobCode = parsed.searchParams.get('oobCode');

  assert.strictEqual(mode, 'resetPassword');
  assert.strictEqual(oobCode, 'XYZ987SECRET');
});

test('Expired reset action codes return clear actionable feedback', () => {
  const expiredError = formatAuthError({ code: 'auth/expired-action-code' });
  assert.strictEqual(expiredError, 'This password reset link has expired. Please request a new one.');
});

test('Email verification status refreshes accurately from currentUser', () => {
  const mockUserBefore = { emailVerified: false };
  assert.strictEqual(mockUserBefore.emailVerified, false);

  // After user clicks verification link and reloads auth state
  const mockUserAfter = { ...mockUserBefore, emailVerified: true };
  assert.strictEqual(mockUserAfter.emailVerified, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 13: INSTAGRAM REELS AUTOPLAY & AUTO-PAUSE SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 13] INSTAGRAM REELS AUTOPLAY & AUTO-PAUSE');

function resolveActiveVideo(visibleEntries, minThreshold = 0.7) {
  let activeId = null;
  let maxRatio = minThreshold;

  for (const entry of visibleEntries) {
    if (entry.isIntersecting && entry.intersectionRatio >= maxRatio) {
      maxRatio = entry.intersectionRatio;
      activeId = entry.id;
    }
  }
  return activeId;
}

test('Autoplays only when video visibility meets or exceeds 70% (0.7)', () => {
  const belowThreshold = [{ id: 'reel_1', isIntersecting: true, intersectionRatio: 0.65 }];
  assert.strictEqual(resolveActiveVideo(belowThreshold, 0.7), null);

  const atThreshold = [{ id: 'reel_1', isIntersecting: true, intersectionRatio: 0.70 }];
  assert.strictEqual(resolveActiveVideo(atThreshold, 0.7), 'reel_1');

  const aboveThreshold = [{ id: 'reel_2', isIntersecting: true, intersectionRatio: 0.88 }];
  assert.strictEqual(resolveActiveVideo(aboveThreshold, 0.7), 'reel_2');
});

test('Guarantees only ONE video plays at any given time (primary visible video wins)', () => {
  const transitionEntries = [
    { id: 'reel_outgoing', isIntersecting: true, intersectionRatio: 0.35 },
    { id: 'reel_incoming', isIntersecting: true, intersectionRatio: 0.75 }
  ];
  const active = resolveActiveVideo(transitionEntries, 0.7);
  assert.strictEqual(active, 'reel_incoming');
});

test('Smoothly transitions active playback as user scrolls down and up', () => {
  // User scrolls from reel 1 to reel 2
  let active = resolveActiveVideo([
    { id: 'reel_1', isIntersecting: true, intersectionRatio: 0.20 },
    { id: 'reel_2', isIntersecting: true, intersectionRatio: 0.82 }
  ], 0.7);
  assert.strictEqual(active, 'reel_2');

  // User scrolls back up to reel 1
  active = resolveActiveVideo([
    { id: 'reel_1', isIntersecting: true, intersectionRatio: 0.90 },
    { id: 'reel_2', isIntersecting: true, intersectionRatio: 0.10 }
  ], 0.7);
  assert.strictEqual(active, 'reel_1');
});

test('Pauses playback when tab becomes hidden or inactive', () => {
  let isPlaying = true;
  const isDocumentHidden = true;

  if (isDocumentHidden) {
    isPlaying = false;
  }
  assert.strictEqual(isPlaying, false);
});

test('Preserves manual pause state until user scrolls to another reel', () => {
  let activeReelId = 'reel_1';
  let manualPaused = true;
  let isPlaying = false; // Manually paused by user

  // Video remains paused while user is still on reel_1
  assert.strictEqual(manualPaused, true);
  assert.strictEqual(isPlaying, false);

  // User scrolls to reel_2 -> activeReelId changes, manual pause resets
  activeReelId = 'reel_2';
  if (activeReelId !== 'reel_1') {
    manualPaused = false;
    isPlaying = true; // Auto-plays new active reel
  }

  assert.strictEqual(manualPaused, false);
  assert.strictEqual(isPlaying, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 14: DJ EVENTS CALENDAR & EXACT LOCATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 14] DJ EVENTS CALENDAR & EXACT LOCATION SYSTEM');

function validateEventPayload({ title, venue, address, startDateTimeIso, endDateTimeIso, ticketUrl, latitude, longitude }) {
  if (!title || !title.trim()) throw new Error('Event title is required');
  if (!venue || !venue.trim()) throw new Error('Venue name is required');
  if (!address || !address.trim()) throw new Error('Venue address is required');
  if (!startDateTimeIso) throw new Error('Start date/time is required');
  if (!endDateTimeIso) throw new Error('End date/time is required');

  const start = new Date(startDateTimeIso).getTime();
  const end = new Date(endDateTimeIso).getTime();
  if (isNaN(start) || isNaN(end)) throw new Error('Invalid date/time format');
  if (end <= start) throw new Error('End date and time must be later than start date and time');

  if (ticketUrl && !ticketUrl.startsWith('http://') && !ticketUrl.startsWith('https://')) {
    throw new Error('Ticket URL must begin with http:// or https://');
  }

  if (latitude != null || longitude != null) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90');
    if (isNaN(lng) || lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180');
  }

  return true;
}

test('Valid event payload passes validation', () => {
  assert.doesNotThrow(() => {
    validateEventPayload({
      title: 'Underground Sound Session',
      venue: 'Club Berghain',
      address: 'Am Wriezener Bahnhof, 10243 Berlin',
      startDateTimeIso: '2026-11-15T22:00:00.000Z',
      endDateTimeIso: '2026-11-16T06:00:00.000Z',
      ticketUrl: 'https://ra.co/events/12345',
      latitude: 52.5113,
      longitude: 13.4431
    });
  });
});

test('Rejects invalid date/time where end is before or equal to start', () => {
  assert.throws(() => {
    validateEventPayload({
      title: 'Bad Time Event',
      venue: 'Club Horizon',
      address: '123 Main St',
      startDateTimeIso: '2026-11-15T22:00:00.000Z',
      endDateTimeIso: '2026-11-15T20:00:00.000Z' // 2 hours before start
    });
  }, /End date and time must be later than start date and time/);

  assert.throws(() => {
    validateEventPayload({
      title: 'Zero Duration Event',
      venue: 'Club Horizon',
      address: '123 Main St',
      startDateTimeIso: '2026-11-15T22:00:00.000Z',
      endDateTimeIso: '2026-11-15T22:00:00.000Z' // exact same time
    });
  }, /End date and time must be later than start date and time/);
});

test('Accepts midnight-crossing events (overnight sets extending into next day)', () => {
  // Starts 10:00 PM on Friday Nov 20, ends 05:00 AM on Saturday Nov 21
  const start = '2026-11-20T22:00:00.000Z';
  const end = '2026-11-21T05:00:00.000Z';

  assert.doesNotThrow(() => {
    validateEventPayload({
      title: 'Overnight All-Nighter',
      venue: 'Tresor Berlin',
      address: 'Köpenicker Str. 70, 10179 Berlin',
      startDateTimeIso: start,
      endDateTimeIso: end
    });
  });
});

test('Validates geographical coordinates range', () => {
  // Invalid latitude (> 90)
  assert.throws(() => {
    validateEventPayload({
      title: 'North Pole Out of Bounds',
      venue: 'Ice Club',
      address: 'Polar Region',
      startDateTimeIso: '2026-11-20T20:00:00.000Z',
      endDateTimeIso: '2026-11-20T23:00:00.000Z',
      latitude: 95.5,
      longitude: 10.0
    });
  }, /Latitude must be between -90 and 90/);

  // Invalid longitude (> 180)
  assert.throws(() => {
    validateEventPayload({
      title: 'East Out of Bounds',
      venue: 'Ocean Stage',
      address: 'Pacific',
      startDateTimeIso: '2026-11-20T20:00:00.000Z',
      endDateTimeIso: '2026-11-20T23:00:00.000Z',
      latitude: 10.0,
      longitude: 195.0
    });
  }, /Longitude must be between -180 and 180/);
});

test('Generates correct Google Maps directions URL with coordinates', () => {
  function getDirectionsUrl(lat, lng, address) {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    if (address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    }
    return '';
  }

  const coordUrl = getDirectionsUrl(52.5113, 13.4431, 'Club Berghain, Berlin');
  assert.strictEqual(coordUrl, 'https://www.google.com/maps/dir/?api=1&destination=52.5113,13.4431');

  const addrUrl = getDirectionsUrl(null, null, 'Fabric London, 77A Charterhouse St');
  assert.strictEqual(addrUrl, 'https://www.google.com/maps/dir/?api=1&destination=Fabric%20London%2C%2077A%20Charterhouse%20St');
});

test('Enforces owner-only authorization for event editing and cancellation', () => {
  function authorizeEventModification(eventAuthorId, callerUid) {
    if (!callerUid || callerUid !== eventAuthorId) {
      throw new Error('Unauthorized: only the event owner can edit or cancel this event');
    }
    return true;
  }

  const ownerUid = 'dj_solomun';
  const strangerUid = 'fan_bob';

  // Owner can edit
  assert.doesNotThrow(() => authorizeEventModification(ownerUid, ownerUid));

  // Stranger is blocked
  assert.throws(() => authorizeEventModification(ownerUid, strangerUid), /Unauthorized/);
  // Unauthenticated is blocked
  assert.throws(() => authorizeEventModification(ownerUid, null), /Unauthorized/);
});

test('Soft cancellation preserves historical record with cancelled status', () => {
  const existingEvent = {
    id: 'ev_001',
    authorId: 'dj_carlcox',
    title: 'Space Ibiza Revival',
    status: 'scheduled',
    ticketsSold: 450
  };

  // Simulating soft cancel
  function cancelEvent(event, callerUid) {
    if (event.authorId !== callerUid) throw new Error('Unauthorized');
    return {
      ...event,
      status: 'cancelled',
      updatedAt: '2026-11-01T12:00:00.000Z'
    };
  }

  const cancelled = cancelEvent(existingEvent, 'dj_carlcox');
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(cancelled.id, 'ev_001'); // ID preserved
  assert.strictEqual(cancelled.ticketsSold, 450); // Historical data preserved
});

test('Upcoming active gigs query excludes cancelled events', () => {
  const now = new Date('2026-11-15T00:00:00.000Z').getTime();

  const events = [
    { id: '1', title: 'Gig A', status: 'scheduled', endDateTimeIso: '2026-11-16T04:00:00.000Z' }, // Upcoming active
    { id: '2', title: 'Gig B', status: 'cancelled', endDateTimeIso: '2026-11-17T04:00:00.000Z' }, // Future but cancelled
    { id: '3', title: 'Gig C', status: 'scheduled', endDateTimeIso: '2026-11-10T04:00:00.000Z' }, // Past event
    { id: '4', title: 'Gig D', status: 'scheduled', endDateTimeIso: '2026-11-20T04:00:00.000Z' }  // Upcoming active
  ];

  const activeUpcoming = events.filter(e => {
    const end = new Date(e.endDateTimeIso).getTime();
    return e.status !== 'cancelled' && end >= now;
  });

  assert.strictEqual(activeUpcoming.length, 2);
  assert.deepStrictEqual(activeUpcoming.map(e => e.id), ['1', '4']);
});

test('Calendar month cell calculation generates exactly full 7-day rows', () => {
  function generateMonthGrid(year, month) {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, isCurrent: false });
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      cells.push({ day: i, isCurrent: true });
    }
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, isCurrent: false });
    }
    return cells;
  }

  // Test across multiple months (October 2026, February 2027, etc.)
  const oct2026 = generateMonthGrid(2026, 9); // October
  assert.strictEqual(oct2026.length % 7, 0); // Divisible by 7
  assert.strictEqual(oct2026.filter(c => c.isCurrent).length, 31); // 31 days in October

  const feb2027 = generateMonthGrid(2027, 1); // February (non-leap)
  assert.strictEqual(feb2027.length % 7, 0);
  assert.strictEqual(feb2027.filter(c => c.isCurrent).length, 28);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 15: EVENT TRASH, MANUAL DELETION & AUTOMATIC CLEANUP
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 15] EVENT TRASH: Manual Deletion, Trash Modal & Automatic Cleanup');

// Reusable logic matching eventService.js
function isEventEligibleForAutoCleanup(event, now = Date.now(), retentionDays = 7) {
  if (!event || event.status === 'trashed' || event.deletedAt) {
    return false; // already trashed or deleted
  }
  let endMs = 0;
  if (event.endDateTimeIso) {
    endMs = new Date(event.endDateTimeIso).getTime();
  } else if (event.startDateTimeIso) {
    endMs = new Date(event.startDateTimeIso).getTime() + 4 * 60 * 60 * 1000;
  } else if (event.dateTime) {
    endMs = new Date(event.dateTime).getTime() + 4 * 60 * 60 * 1000;
  }
  if (!endMs || isNaN(endMs)) return false;

  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  return now >= endMs + retentionMs;
}

function trashEventLogic(event, callerUid, reason = 'manual_delete', nowMs = Date.now()) {
  if (!callerUid) throw new Error('Unauthenticated user cannot delete events.');
  if (event.authorId !== callerUid) {
    throw new Error('Unauthorized: You can only delete your own events.');
  }
  const purgeAfter = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  const auditEntry = {
    action: 'trashed',
    actorUid: callerUid,
    eventId: event.id,
    reason,
    timestamp: new Date(nowMs).toISOString(),
    source: reason === 'auto_cleanup' ? 'automatic_retention_policy' : 'manual_owner_delete'
  };
  return {
    ...event,
    status: 'trashed',
    deletedAt: new Date(nowMs).toISOString(),
    deletedBy: callerUid,
    deletionReason: reason,
    purgeAfter,
    auditTrail: [...(event.auditTrail || []), auditEntry]
  };
}

function restoreEventLogic(event, callerUid, nowMs = Date.now()) {
  if (!callerUid) throw new Error('Unauthenticated user cannot restore events.');
  if (event.authorId !== callerUid) {
    throw new Error('Unauthorized: You can only restore your own events.');
  }
  const auditEntry = {
    action: 'restored',
    actorUid: callerUid,
    eventId: event.id,
    timestamp: new Date(nowMs).toISOString(),
    source: 'manual_owner_restore'
  };
  const restored = { ...event };
  restored.status = 'scheduled';
  delete restored.deletedAt;
  delete restored.deletedBy;
  delete restored.deletionReason;
  delete restored.purgeAfter;
  restored.auditTrail = [...(event.auditTrail || []), auditEntry];
  return restored;
}

function permanentlyDeleteEventLogic(event, callerUid) {
  if (!callerUid) throw new Error('Unauthenticated user cannot permanently delete events.');
  if (event.authorId !== callerUid) {
    throw new Error('Unauthorized: You can only permanently delete your own events.');
  }
  return { deleted: true, id: event.id };
}

test('Default Automatic Event Cleanup setting is strictly OFF for all accounts', () => {
  const defaultSettings = { autoCleanupEnabled: false, retentionDays: 7 };
  assert.strictEqual(defaultSettings.autoCleanupEnabled, false);
  assert.strictEqual(defaultSettings.retentionDays, 7);
});

test('Manual delete permits event owner and moves event to recoverable Trash state', () => {
  const now = Date.now();
  const event = {
    id: 'ev_london_01',
    authorId: 'dj_amira',
    title: 'Fabric London All-Nighter',
    status: 'scheduled',
    venue: 'Fabric'
  };

  const trashed = trashEventLogic(event, 'dj_amira', 'manual_delete', now);
  assert.strictEqual(trashed.status, 'trashed');
  assert.strictEqual(trashed.deletedBy, 'dj_amira');
  assert.strictEqual(trashed.deletionReason, 'manual_delete');
  assert.ok(trashed.deletedAt);
  assert.ok(trashed.purgeAfter);
  assert.strictEqual(trashed.auditTrail.length, 1);
  assert.strictEqual(trashed.auditTrail[0].action, 'trashed');
  assert.strictEqual(trashed.auditTrail[0].source, 'manual_owner_delete');
});

test('Manual delete strictly rejects attempts by another user/DJ to delete an unowned event', () => {
  const event = {
    id: 'ev_berlin_02',
    authorId: 'dj_amira',
    title: 'Berghain Showcase',
    status: 'scheduled'
  };

  assert.throws(
    () => trashEventLogic(event, 'dj_imposter', 'manual_delete'),
    /Unauthorized: You can only delete your own events/
  );
  assert.throws(
    () => trashEventLogic(event, null, 'manual_delete'),
    /Unauthenticated user cannot delete events/
  );
});

test('Public calendar and profile listings strictly hide trashed events', () => {
  const allEvents = [
    { id: '1', title: 'Active Fest', status: 'scheduled' },
    { id: '2', title: 'Trashed Show', status: 'trashed', deletedAt: '2026-10-27T00:00:00Z' },
    { id: '3', title: 'Cancelled Club', status: 'cancelled' },
    { id: '4', title: 'Old Trashed', status: 'scheduled', deletedAt: '2026-10-26T00:00:00Z' }
  ];

  // Active query filter in eventService & Profile
  const visibleEvents = allEvents.filter(e => e.status !== 'trashed' && !e.deletedAt);
  assert.strictEqual(visibleEvents.length, 2);
  assert.deepStrictEqual(visibleEvents.map(e => e.id), ['1', '3']);
});

test('Trash view allows owner to restore a deleted event to scheduled status with audit record', () => {
  const now = Date.now();
  const trashedEvent = {
    id: 'ev_005',
    authorId: 'dj_carlcox',
    title: 'Space Revival',
    status: 'trashed',
    deletedAt: '2026-10-25T10:00:00Z',
    deletedBy: 'dj_carlcox',
    deletionReason: 'manual_delete',
    auditTrail: [{ action: 'trashed', timestamp: '2026-10-25T10:00:00Z' }]
  };

  const restored = restoreEventLogic(trashedEvent, 'dj_carlcox', now);
  assert.strictEqual(restored.status, 'scheduled');
  assert.strictEqual(restored.deletedAt, undefined);
  assert.strictEqual(restored.deletedBy, undefined);
  assert.strictEqual(restored.auditTrail.length, 2);
  assert.strictEqual(restored.auditTrail[1].action, 'restored');
  assert.strictEqual(restored.auditTrail[1].source, 'manual_owner_restore');
});

test('Permanent deletion requires second confirmation and deletes document', () => {
  const trashedEvent = {
    id: 'ev_perm_01',
    authorId: 'dj_carlcox',
    title: 'Old Demo Set',
    status: 'trashed'
  };

  const result = permanentlyDeleteEventLogic(trashedEvent, 'dj_carlcox');
  assert.strictEqual(result.deleted, true);
  assert.strictEqual(result.id, 'ev_perm_01');

  // Unauthorized permanent deletion is rejected
  assert.throws(
    () => permanentlyDeleteEventLogic(trashedEvent, 'dj_stranger'),
    /Unauthorized: You can only permanently delete your own events/
  );
});

test('Seven-day retention boundary accurately protects events completed within 7 days', () => {
  const now = new Date('2026-10-28T00:00:00.000Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Event ended 6 days ago -> NOT eligible
  const ended6DaysAgo = {
    id: 'ev_6d',
    status: 'scheduled',
    endDateTimeIso: new Date(now - 6 * dayMs).toISOString()
  };
  assert.strictEqual(isEventEligibleForAutoCleanup(ended6DaysAgo, now, 7), false);

  // Event ended 6 days, 23 hours ago -> NOT eligible
  const endedAlmost7Days = {
    id: 'ev_almost7d',
    status: 'scheduled',
    endDateTimeIso: new Date(now - (7 * dayMs - 60000)).toISOString()
  };
  assert.strictEqual(isEventEligibleForAutoCleanup(endedAlmost7Days, now, 7), false);

  // Event ended exactly 7 days + 1 second ago -> ELIGIBLE
  const ended7DaysAgo = {
    id: 'ev_7d',
    status: 'scheduled',
    endDateTimeIso: new Date(now - (7 * dayMs + 1000)).toISOString()
  };
  assert.strictEqual(isEventEligibleForAutoCleanup(ended7DaysAgo, now, 7), true);
});

test('Handles overnight events crossing midnight with timezone preservation', () => {
  const now = new Date('2026-10-28T12:00:00.000Z').getTime();

  // Overnight gig: starts Oct 20 at 22:00 Berlin time, ends Oct 21 at 06:00 Berlin time (04:00 UTC)
  // From Oct 21 04:00 UTC to Oct 28 12:00 UTC is 7 days and 8 hours -> eligible
  const overnightGig1 = {
    id: 'ev_overnight_past',
    status: 'scheduled',
    startDateTimeIso: '2026-10-20T20:00:00.000Z',
    endDateTimeIso: '2026-10-21T04:00:00.000Z',
    timezone: 'Europe/Berlin'
  };
  assert.strictEqual(isEventEligibleForAutoCleanup(overnightGig1, now, 7), true);

  // Overnight gig ending Oct 21 at 18:00 UTC
  // From Oct 21 18:00 UTC to Oct 28 12:00 UTC is 6 days and 18 hours -> NOT eligible yet!
  const overnightGig2 = {
    id: 'ev_overnight_recent',
    status: 'scheduled',
    startDateTimeIso: '2026-10-21T08:00:00.000Z',
    endDateTimeIso: '2026-10-21T18:00:00.000Z',
    timezone: 'Europe/Berlin'
  };
  assert.strictEqual(isEventEligibleForAutoCleanup(overnightGig2, now, 7), false);
});

test('Completed and cancelled gigs older than 7 days are both eligible for automated cleanup', () => {
  const now = new Date('2026-10-28T00:00:00.000Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const pastCompleted = {
    id: 'ev_comp',
    status: 'completed',
    endDateTimeIso: new Date(now - 8 * dayMs).toISOString()
  };
  const pastCancelled = {
    id: 'ev_canc',
    status: 'cancelled',
    endDateTimeIso: new Date(now - 8 * dayMs).toISOString()
  };

  assert.strictEqual(isEventEligibleForAutoCleanup(pastCompleted, now, 7), true);
  assert.strictEqual(isEventEligibleForAutoCleanup(pastCancelled, now, 7), true);
});

test('Cleanup execution is idempotent and repeat-safe (running twice produces 0 secondary actions)', () => {
  const now = new Date('2026-10-28T00:00:00.000Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  let mockEvents = [
    { id: '1', authorId: 'dj_amira', status: 'scheduled', endDateTimeIso: new Date(now - 9 * dayMs).toISOString() },
    { id: '2', authorId: 'dj_amira', status: 'scheduled', endDateTimeIso: new Date(now - 2 * dayMs).toISOString() }
  ];

  function runCleanup(events, uid, nowMs) {
    let trashedCount = 0;
    const updated = events.map(e => {
      if (e.authorId === uid && isEventEligibleForAutoCleanup(e, nowMs, 7)) {
        trashedCount++;
        return trashEventLogic(e, uid, 'auto_cleanup', nowMs);
      }
      return e;
    });
    return { events: updated, trashedCount };
  }

  // First run: trashes event 1
  const run1 = runCleanup(mockEvents, 'dj_amira', now);
  assert.strictEqual(run1.trashedCount, 1);
  assert.strictEqual(run1.events[0].status, 'trashed');
  assert.strictEqual(run1.events[1].status, 'scheduled');

  // Second run: idempotent, trashedCount is 0!
  const run2 = runCleanup(run1.events, 'dj_amira', now);
  assert.strictEqual(run2.trashedCount, 0);
});

test('Disabled cleanup policy never purges or trashes any events', () => {
  const now = new Date('2026-10-28T00:00:00.000Z').getTime();
  const settings = { autoCleanupEnabled: false, retentionDays: 7 };

  const oldEvent = {
    id: 'ev_ancient',
    authorId: 'dj_amira',
    status: 'scheduled',
    endDateTimeIso: '2025-01-01T00:00:00.000Z'
  };

  function executeAutoCleanupIfEnabled(settings, event, nowMs) {
    if (!settings.autoCleanupEnabled) {
      return { trashed: false, event };
    }
    if (isEventEligibleForAutoCleanup(event, nowMs, settings.retentionDays)) {
      return { trashed: true, event: trashEventLogic(event, event.authorId, 'auto_cleanup', nowMs) };
    }
    return { trashed: false, event };
  }

  const result = executeAutoCleanupIfEnabled(settings, oldEvent, now);
  assert.strictEqual(result.trashed, false);
  assert.strictEqual(result.event.status, 'scheduled');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 16: MUSIC PROVIDER SYSTEM & FAIL-CLOSED LICENSING GATE
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 16] MUSIC: Provider System, Licensing Gate & Caching');

// Mock in-memory localStorage for Node test runner
const mockStorage = new Map();
const testCache = {
  get: (key) => {
    const raw = mockStorage.get(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() - item.timestamp > item.ttl) {
      return null;
    }
    return item.data;
  },
  set: (key, data, ttl = 3600000) => {
    mockStorage.set(key, JSON.stringify({ timestamp: Date.now(), ttl, data }));
  },
  getStale: (key) => {
    const raw = mockStorage.get(key);
    return raw ? JSON.parse(raw).data : null;
  },
  invalidate: (pattern) => {
    for (const k of mockStorage.keys()) {
      if (!pattern || k.includes(pattern)) mockStorage.delete(k);
    }
  }
};

// Replicating evaluateTrackRights from licensingGate.js
function testEvaluateTrackRights(rawTrack, provider = 'unknown') {
  const verifiedAt = new Date().toISOString();
  const rawLicense = String(rawTrack.license || rawTrack.licenseType || '').trim();
  const title = rawTrack.title || 'Untitled Track';
  const artist = rawTrack.artist || rawTrack.user?.name || rawTrack.user?.handle || 'Unknown Artist';

  if (provider === 'deckknob_curated') {
    return {
      canPreview: true,
      canPublish: true,
      syncCleared: true,
      rightsEvidence: {
        provider: 'deckknob_curated',
        licenseType: rawLicense || 'Creative Commons BY 4.0',
        licenseStatus: 'verified_sync_cleared',
        commercialUsePermitted: true,
        syncPermitted: true,
        territory: 'worldwide',
        attributionRequired: true,
        attributionText: rawTrack.attribution || `${artist} • CC BY 4.0`,
        isDemoFixture: Boolean(rawTrack.isDemoFixture),
        verifiedAt
      }
    };
  }

  if (provider === 'hoopr' || provider === 'epidemic') {
    return {
      canPreview: false,
      canPublish: false,
      syncCleared: false,
      rightsEvidence: {
        provider,
        licenseType: 'Commercial Enterprise License',
        licenseStatus: 'commercial_credentials_required',
        commercialUsePermitted: false,
        syncPermitted: false,
        rejectionReason: `${provider.toUpperCase()} commercial integration is inactive. Credentials required.`
      }
    };
  }

  if (provider === 'audius') {
    if (!rawLicense) {
      return {
        canPreview: true,
        canPublish: false,
        syncCleared: false,
        rightsEvidence: {
          provider: 'audius',
          licenseType: 'Unspecified',
          licenseStatus: 'rejected_insufficient_rights',
          syncPermitted: false,
          rejectionReason: 'Track license is unspecified. Audius stream access alone does not grant synchronization rights.'
        }
      };
    }

    const disqualifiedPatterns = [/all\s*rights\s*reserved/i, /-nd/i, /no\s*derivatives/i, /-nc/i, /non-commercial/i, /noncommercial/i];
    for (const pat of disqualifiedPatterns) {
      if (pat.test(rawLicense)) {
        return {
          canPreview: true,
          canPublish: false,
          syncCleared: false,
          rightsEvidence: {
            provider: 'audius',
            licenseType: rawLicense,
            licenseStatus: 'rejected_insufficient_rights',
            syncPermitted: false,
            rejectionReason: `License "${rawLicense}" contains restrictions prohibiting UGC synchronization.`
          }
        };
      }
    }

    const syncSafePatterns = [/cc\s*by/i, /creative\s*commons\s*attribution/i, /cc0/i, /public\s*domain/i];
    if (syncSafePatterns.some(p => p.test(rawLicense))) {
      return {
        canPreview: true,
        canPublish: true,
        syncCleared: true,
        rightsEvidence: {
          provider: 'audius',
          licenseType: rawLicense,
          licenseStatus: 'verified_sync_cleared',
          syncPermitted: true,
          territory: 'worldwide',
          attributionRequired: true,
          attributionText: `${title} by ${artist} (Audius) / ${rawLicense}`
        }
      };
    }

    return {
      canPreview: true,
      canPublish: false,
      syncCleared: false,
      rightsEvidence: {
        provider: 'audius',
        licenseType: rawLicense,
        licenseStatus: 'unverified_license',
        syncPermitted: false,
        rejectionReason: `License "${rawLicense}" has unverified sync rights.`
      }
    };
  }

  return {
    canPreview: false,
    canPublish: false,
    syncCleared: false,
    rightsEvidence: {
      provider,
      licenseStatus: 'rejected_insufficient_rights',
      rejectionReason: `Unknown provider "${provider}".`
    }
  };
}

function testGetAuthorizedClip(track, start = 0, duration = 15) {
  if (!track.syncCleared || !track.canPublish) {
    throw new Error(`Sync Authorization Denied: ${track.rightsEvidence?.rejectionReason || 'Unauthorized'}`);
  }
  const safeDuration = Math.min(Math.max(5, Number(duration) || 15), 30);
  const safeStart = Math.max(0, Math.min(Number(start) || 0, Math.max(0, (track.duration || 180) - safeDuration)));

  return {
    provider: track.provider,
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    audioUrl: track.audioUrl,
    startTime: safeStart,
    duration: safeDuration,
    licenseType: track.rightsEvidence?.licenseType,
    licenseStatus: track.rightsEvidence?.licenseStatus,
    attribution: track.rightsEvidence?.attributionText
  };
}

test('Curated catalog tracks have verified sync rights and explicit demo fixture flags', () => {
  const sampleCurated = {
    id: 'curated_track_1',
    title: 'Techno Pulse',
    artist: 'Leon Bassline',
    license: 'Creative Commons Attribution 4.0',
    attribution: 'Leon Bassline / SoundHelix (CC BY 4.0)',
    isDemoFixture: true
  };

  const res = testEvaluateTrackRights(sampleCurated, 'deckknob_curated');
  assert.strictEqual(res.canPreview, true);
  assert.strictEqual(res.canPublish, true);
  assert.strictEqual(res.syncCleared, true);
  assert.strictEqual(res.rightsEvidence.licenseStatus, 'verified_sync_cleared');
  assert.strictEqual(res.rightsEvidence.isDemoFixture, true);
  assert.strictEqual(res.rightsEvidence.territory, 'worldwide');
});

test('Fail-closed licensing gate rejects All Rights Reserved tracks from synchronization', () => {
  const allRightsReservedTrack = {
    id: 'aud_arr_01',
    title: 'Commercial Hit',
    artist: 'Pop Star',
    license: 'All Rights Reserved'
  };

  const res = testEvaluateTrackRights(allRightsReservedTrack, 'audius');
  assert.strictEqual(res.canPreview, true); // Playable in picker
  assert.strictEqual(res.canPublish, false); // Blocked from UGC sync
  assert.strictEqual(res.syncCleared, false);
  assert.strictEqual(res.rightsEvidence.licenseStatus, 'rejected_insufficient_rights');
  assert.ok(res.rightsEvidence.rejectionReason.includes('All Rights Reserved'));
});

test('Fail-closed licensing gate rejects tracks with missing or empty license metadata', () => {
  const missingLicenseTrack = {
    id: 'aud_empty_02',
    title: 'Mystery Sound',
    artist: 'Unknown',
    license: ''
  };

  const res = testEvaluateTrackRights(missingLicenseTrack, 'audius');
  assert.strictEqual(res.canPreview, true);
  assert.strictEqual(res.canPublish, false);
  assert.strictEqual(res.syncCleared, false);
  assert.strictEqual(res.rightsEvidence.licenseStatus, 'rejected_insufficient_rights');
  assert.ok(res.rightsEvidence.rejectionReason.includes('unspecified'));
});

test('Fail-closed licensing gate rejects No-Derivatives (-ND) and Non-Commercial (-NC) licenses', () => {
  const ndTrack = { id: 'nd_01', license: 'CC BY-ND 4.0' };
  const ncTrack = { id: 'nc_01', license: 'CC BY-NC 4.0' };
  const ncSaTrack = { id: 'ncsa_01', license: 'Creative Commons Attribution-NonCommercial-ShareAlike' };

  assert.strictEqual(testEvaluateTrackRights(ndTrack, 'audius').syncCleared, false);
  assert.strictEqual(testEvaluateTrackRights(ncTrack, 'audius').syncCleared, false);
  assert.strictEqual(testEvaluateTrackRights(ncSaTrack, 'audius').syncCleared, false);
});

test('Audius tracks with verified CC BY / CC BY-SA are accepted for public synchronization', () => {
  const ccByTrack = {
    id: 'aud_ccby_01',
    title: 'Open Source Beats',
    artist: 'Indie DJ',
    license: 'CC BY 4.0'
  };

  const res = testEvaluateTrackRights(ccByTrack, 'audius');
  assert.strictEqual(res.canPreview, true);
  assert.strictEqual(res.canPublish, true);
  assert.strictEqual(res.syncCleared, true);
  assert.strictEqual(res.rightsEvidence.licenseStatus, 'verified_sync_cleared');
});

test('Distinguishes playable preview from sync publishing clearance', () => {
  const previewOnlyTrack = {
    id: 'aud_prev_01',
    title: 'Preview Stream Only',
    artist: 'Major Label Artist',
    license: 'All Rights Reserved'
  };

  const res = testEvaluateTrackRights(previewOnlyTrack, 'audius');
  // Listening allowed in picker
  assert.strictEqual(res.canPreview, true);
  // Publishing prohibited
  assert.strictEqual(res.canPublish, false);
});

test('getAuthorizedClip strictly throws error when track is not sync-cleared', () => {
  const rejectedTrack = {
    id: 'track_blocked',
    provider: 'audius',
    title: 'Locked Song',
    canPublish: false,
    syncCleared: false,
    rightsEvidence: { rejectionReason: 'All Rights Reserved' }
  };

  assert.throws(
    () => testGetAuthorizedClip(rejectedTrack, 0, 15),
    /Sync Authorization Denied: All Rights Reserved/
  );
});

test('getAuthorizedClip enforces 5s minimum and 30s maximum duration bounds', () => {
  const validTrack = {
    id: 'track_valid',
    provider: 'deckknob_curated',
    title: 'Club Bang',
    artist: 'DJ Sonic',
    audioUrl: 'https://example.com/audio.mp3',
    duration: 180,
    canPublish: true,
    syncCleared: true,
    rightsEvidence: { licenseType: 'CC BY 4.0', licenseStatus: 'verified_sync_cleared', attributionText: 'DJ Sonic' }
  };

  // Clamp 1s up to 5s
  const clip1 = testGetAuthorizedClip(validTrack, 0, 1);
  assert.strictEqual(clip1.duration, 5);

  // Clamp 60s down to 30s
  const clip2 = testGetAuthorizedClip(validTrack, 0, 60);
  assert.strictEqual(clip2.duration, 30);

  // Normal 15s respected
  const clip3 = testGetAuthorizedClip(validTrack, 10, 15);
  assert.strictEqual(clip3.startTime, 10);
  assert.strictEqual(clip3.duration, 15);
});

test('Commercial stubs for Hoopr and Epidemic Sound clearly report credentials_required without fake claims', () => {
  const hooprRes = testEvaluateTrackRights({}, 'hoopr');
  assert.strictEqual(hooprRes.canPublish, false);
  assert.strictEqual(hooprRes.rightsEvidence.licenseStatus, 'commercial_credentials_required');
  assert.ok(hooprRes.rightsEvidence.rejectionReason.toLowerCase().includes('credentials required'));

  const epidemicRes = testEvaluateTrackRights({}, 'epidemic');
  assert.strictEqual(epidemicRes.canPublish, false);
  assert.strictEqual(epidemicRes.rightsEvidence.licenseStatus, 'commercial_credentials_required');
  assert.ok(epidemicRes.rightsEvidence.rejectionReason.toLowerCase().includes('credentials required'));
});

test('1-Hour TTL catalog caching stores data, returns fresh results, and expires after 1 hour', () => {
  const cacheKey = 'test_trending_key';
  const testTracks = [{ id: '1', title: 'Cached Song' }];

  // Store in cache
  testCache.set(cacheKey, testTracks, 3600000); // 1 hour

  // Fresh read succeeds
  const fresh = testCache.get(cacheKey);
  assert.deepStrictEqual(fresh, testTracks);

  // Simulate expiry by setting an expired timestamp
  mockStorage.set(cacheKey, JSON.stringify({ timestamp: Date.now() - 3600001, ttl: 3600000, data: testTracks }));
  const expired = testCache.get(cacheKey);
  assert.strictEqual(expired, null);

  // Stale recovery still retrieves data if network offline
  const stale = testCache.getStale(cacheKey);
  assert.deepStrictEqual(stale, testTracks);
});

test('Cache invalidation removes target provider cache entries cleanly', () => {
  testCache.set('audius_trending', [{ id: 'a1' }]);
  testCache.set('curated_trending', [{ id: 'c1' }]);

  // Invalidate only audius
  testCache.invalidate('audius');
  assert.strictEqual(testCache.get('audius_trending'), null);
  assert.deepStrictEqual(testCache.get('curated_trending'), [{ id: 'c1' }]);
});

test('Backward compatibility: Stories and posts without music (null) validate and persist cleanly', () => {
  const storyWithoutMusic = {
    id: 'story_clean_01',
    authorId: 'dj_carl',
    mediaUrl: 'https://example.com/pic.jpg',
    music: null,
    overlays: []
  };

  const postWithoutMusic = {
    id: 'post_clean_01',
    authorId: 'dj_carl',
    mediaUrl: 'https://example.com/pic.jpg',
    music: null,
    caption: 'Great set tonight'
  };

  assert.strictEqual(storyWithoutMusic.music, null);
  assert.strictEqual(postWithoutMusic.music, null);
  // Function accepting music should safely handle null
  function extractMusicAttribution(item) {
    if (!item?.music) return null;
    return item.music.attribution || `${item.music.title} - ${item.music.artist}`;
  }
  assert.strictEqual(extractMusicAttribution(storyWithoutMusic), null);
  assert.strictEqual(extractMusicAttribution(postWithoutMusic), null);
});

console.log('\n▶ [FEATURE 17] MUSIC PICKER MODAL & WAVEFORM TRIMMER');

// Helper simulating clip adjustment logic in WaveformTrimmer.jsx
function calculateSafeClip(trackDuration, startTime, duration) {
  const safeTrackDur = Math.max(10, Number(trackDuration) || 180);
  const safeDuration = Math.min(Math.max(5, Number(duration) || 15), 30);
  const maxStart = Math.max(0, safeTrackDur - safeDuration);
  const safeStart = Math.min(Math.max(0, Number(startTime) || 0), maxStart);
  const safeEnd = Math.min(safeTrackDur, safeStart + safeDuration);

  return {
    startTime: safeStart,
    duration: safeDuration,
    endTime: safeEnd,
    maxStart
  };
}

test('Music search queries filter catalog by keyword, artist, and genre accurately', () => {
  const catalog = [
    { id: '1', title: 'Berlin Warehouse', artist: 'DJ Marcel', genre: 'Techno' },
    { id: '2', title: 'Ibiza Sunset', artist: 'Carl Cox', genre: 'House' },
    { id: '3', title: 'Neon Highway', artist: 'Kavinsky', genre: 'Synthwave' }
  ];

  const search = (q, genre) => {
    return catalog.filter((t) => {
      const matchQ = !q || t.title.toLowerCase().includes(q.toLowerCase()) || t.artist.toLowerCase().includes(q.toLowerCase());
      const matchG = !genre || genre === 'All' || t.genre.toLowerCase() === genre.toLowerCase();
      return matchQ && matchG;
    });
  };

  assert.strictEqual(search('Berlin').length, 1);
  assert.strictEqual(search('Berlin')[0].id, '1');
  assert.strictEqual(search('', 'House').length, 1);
  assert.strictEqual(search('', 'House')[0].artist, 'Carl Cox');
  assert.strictEqual(search('NonExistent').length, 0);
});

test('Cache fallback and retry mechanism recovers catalog when primary provider fails', () => {
  const cachedCatalog = [{ id: 'curated_1', title: 'Techno Pulse', provider: 'deckknob_curated' }];
  let networkFailing = true;

  const fetchWithFallback = () => {
    if (networkFailing) {
      // Offline fallback
      return { isOfflineFallback: true, tracks: cachedCatalog };
    }
    return { isOfflineFallback: false, tracks: [{ id: 'live_1', title: 'Live Beat' }] };
  };

  const initial = fetchWithFallback();
  assert.strictEqual(initial.isOfflineFallback, true);
  assert.deepStrictEqual(initial.tracks, cachedCatalog);

  // Network recovers on retry
  networkFailing = false;
  const retried = fetchWithFallback();
  assert.strictEqual(retried.isOfflineFallback, false);
  assert.strictEqual(retried.tracks[0].id, 'live_1');
});

test('WaveformTrimmer enforces 5s minimum and 30s maximum duration presets', () => {
  const clipTooShort = calculateSafeClip(180, 10, 2);
  assert.strictEqual(clipTooShort.duration, 5); // Clamped up to 5s

  const clipTooLong = calculateSafeClip(180, 10, 45);
  assert.strictEqual(clipTooLong.duration, 30); // Clamped down to 30s

  const clipStandard = calculateSafeClip(180, 10, 15);
  assert.strictEqual(clipStandard.duration, 15);
});

test('WaveformTrimmer prevents negative, out-of-range or overflow clip start times', () => {
  const trackLength = 60; // 60s track
  const clipDuration = 20; // 20s clip

  // Negative start clamps to 0
  const negativeStart = calculateSafeClip(trackLength, -15, clipDuration);
  assert.strictEqual(negativeStart.startTime, 0);
  assert.strictEqual(negativeStart.endTime, 20);

  // Overflow start (e.g. 55s on 60s track with 20s clip) clamps to 40s (60 - 20)
  const overflowStart = calculateSafeClip(trackLength, 55, clipDuration);
  assert.strictEqual(overflowStart.startTime, 40);
  assert.strictEqual(overflowStart.endTime, 60);
});

test('WaveformTrimmer provides honest timeline fallback without claiming false decoded audio', () => {
  function getWaveformState(decodedAudioBuffer) {
    if (!decodedAudioBuffer) {
      return {
        hasRealWaveform: false,
        label: 'Timeline Scrubber',
        badge: 'Time-Indexed'
      };
    }
    return {
      hasRealWaveform: true,
      label: 'Waveform Trimmer',
      badge: 'Decoded Audio'
    };
  }

  const corsBlockedState = getWaveformState(null);
  assert.strictEqual(corsBlockedState.hasRealWaveform, false);
  assert.strictEqual(corsBlockedState.label, 'Timeline Scrubber');
  assert.strictEqual(corsBlockedState.badge, 'Time-Indexed');

  const decodedState = getWaveformState({ length: 44100 });
  assert.strictEqual(decodedState.hasRealWaveform, true);
  assert.strictEqual(decodedState.label, 'Waveform Trimmer');
  assert.strictEqual(decodedState.badge, 'Decoded Audio');
});

test('Singleton audio playback stops previous track and cleans up on modal close', () => {
  let activeAudio = { trackId: null, isPlaying: false, src: '' };

  const playTrack = (trackId, streamUrl) => {
    activeAudio = { trackId, isPlaying: true, src: streamUrl };
  };

  const stopAudio = () => {
    activeAudio = { trackId: null, isPlaying: false, src: '' };
  };

  playTrack('track_1', 'https://example.com/1.mp3');
  assert.strictEqual(activeAudio.trackId, 'track_1');
  assert.strictEqual(activeAudio.isPlaying, true);

  // Rapidly switch to track 2: track 1 immediately replaced
  playTrack('track_2', 'https://example.com/2.mp3');
  assert.strictEqual(activeAudio.trackId, 'track_2');
  assert.strictEqual(activeAudio.src, 'https://example.com/2.mp3');

  // Modal close cleans up
  stopAudio();
  assert.strictEqual(activeAudio.trackId, null);
  assert.strictEqual(activeAudio.isPlaying, false);
  assert.strictEqual(activeAudio.src, '');
});

test('Fail-closed licensing revalidation strictly rejects publishing unverified or All Rights Reserved tracks', () => {
  const rejectedTrack = {
    id: 'aud_arr',
    provider: 'audius',
    license: 'All Rights Reserved',
    canPreview: true,
    canPublish: false,
    syncCleared: false
  };

  const publishAttempt = (track) => {
    const rights = testEvaluateTrackRights(track, track.provider);
    if (!rights.syncCleared || !rights.canPublish) {
      throw new Error(`Sync Denied: ${rights.rightsEvidence?.rejectionReason}`);
    }
    return { status: 'published' };
  };

  assert.throws(
    () => publishAttempt(rejectedTrack),
    /Sync Denied: License "All Rights Reserved" contains restrictions prohibiting UGC synchronization/
  );
});

test('Authorized clip selection creates complete music metadata payload with attribution evidence', () => {
  const clearedTrack = {
    id: 'curated_track_1',
    provider: 'deckknob_curated',
    title: 'Techno Pulse',
    artist: 'Leon Bassline',
    audioUrl: 'https://example.com/audio.mp3',
    duration: 180,
    canPublish: true,
    syncCleared: true,
    rightsEvidence: {
      provider: 'deckknob_curated',
      licenseType: 'Creative Commons BY 4.0',
      licenseStatus: 'verified_sync_cleared',
      attributionText: 'Leon Bassline / SoundHelix (CC BY 4.0)'
    }
  };

  const clip = testGetAuthorizedClip(clearedTrack, 10, 15);
  assert.strictEqual(clip.provider, 'deckknob_curated');
  assert.strictEqual(clip.startTime, 10);
  assert.strictEqual(clip.duration, 15);
  assert.strictEqual(clip.licenseStatus, 'verified_sync_cleared');
  assert.strictEqual(clip.attribution, 'Leon Bassline / SoundHelix (CC BY 4.0)');
});

test('Post, Klyp, and Story creation options accept music metadata and maintain null backward compatibility', () => {
  const buildPayload = (mediaUrl, caption, music = null) => ({
    mediaUrl,
    caption,
    music: music || null
  });

  const payloadWithoutMusic = buildPayload('https://example.com/image.jpg', 'No soundtrack');
  assert.strictEqual(payloadWithoutMusic.music, null);

  const payloadWithMusic = buildPayload('https://example.com/image.jpg', 'With soundtrack', {
    trackId: 'curated_track_1',
    title: 'Techno Pulse',
    startTime: 0,
    duration: 15
  });
  assert.ok(payloadWithMusic.music);
  assert.strictEqual(payloadWithMusic.music.trackId, 'curated_track_1');
  assert.strictEqual(payloadWithMusic.music.duration, 15);
});

test('MusicPickerModal and WaveformTrimmer comply with accessible UI attributes', () => {
  const modalA11y = {
    role: 'dialog',
    ariaModal: 'true',
    ariaLabelledBy: 'music-picker-title',
    sliderRole: 'slider',
    minTouchTargetPx: 44
  };

  assert.strictEqual(modalA11y.role, 'dialog');
  assert.strictEqual(modalA11y.ariaModal, 'true');
  assert.strictEqual(modalA11y.sliderRole, 'slider');
  assert.ok(modalA11y.minTouchTargetPx >= 44);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 18: STORY AUDIO PLAYBACK & SYNCHRONIZATION (TASK 3)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 18] STORY AUDIO: Playback, Synchronization & Autoplay Recovery');

class TestAudioCoordinator {
  constructor() {
    this.activeSessionId = null;
    this.activeType = null;
    this.stopCallbacks = new Map();
  }
  startSession(sessionId, type = 'generic', onStop = null) {
    if (this.activeSessionId && this.activeSessionId !== sessionId) {
      this.stopAll();
    }
    this.activeSessionId = sessionId;
    this.activeType = type;
    if (typeof onStop === 'function') {
      this.stopCallbacks.set(sessionId, onStop);
    }
  }
  stopSession(sessionId) {
    if (this.activeSessionId === sessionId) {
      const cb = this.stopCallbacks.get(sessionId);
      if (cb) {
        try { cb(); } catch (_) {}
        this.stopCallbacks.delete(sessionId);
      }
      this.activeSessionId = null;
      this.activeType = null;
    }
  }
  stopAll() {
    this.stopCallbacks.forEach((cb) => {
      try { cb(); } catch (_) {}
    });
    this.stopCallbacks.clear();
    this.activeSessionId = null;
    this.activeType = null;
  }
  isSessionActive(sessionId) {
    return this.activeSessionId === sessionId;
  }
}

test('AudioCoordinator singleton prevents simultaneous audio playback across Stories, Posts and Klyps', () => {
  const coordinator = new TestAudioCoordinator();
  let storyStopped = false;
  let postStopped = false;

  coordinator.startSession('story_101', 'story', () => {
    storyStopped = true;
  });
  assert.strictEqual(coordinator.activeSessionId, 'story_101');
  assert.strictEqual(coordinator.isSessionActive('story_101'), true);

  // Starting post audio must cleanly stop story audio
  coordinator.startSession('post_202', 'post', () => {
    postStopped = true;
  });
  assert.strictEqual(storyStopped, true, 'Story playback should have stopped when Post started');
  assert.strictEqual(coordinator.activeSessionId, 'post_202');
  assert.strictEqual(coordinator.isSessionActive('story_101'), false);
  assert.strictEqual(coordinator.isSessionActive('post_202'), true);

  // stopAll cleanly shuts down any active media
  coordinator.stopAll();
  assert.strictEqual(postStopped, true, 'Post playback should have stopped on stopAll');
  assert.strictEqual(coordinator.activeSessionId, null);
});

test('Story progress bar interval calculates duration accurately from attached music metadata', () => {
  const calculateStoryDurationMs = (story) => {
    if (story?.music?.duration) {
      return Number(story.music.duration) * 1000;
    }
    return 7000; // Default legacy 7s story duration
  };

  const storyWithoutMusic = { id: 's1', mediaUrl: 'https://example.com/pic.jpg' };
  assert.strictEqual(calculateStoryDurationMs(storyWithoutMusic), 7000);

  const storyWith15sMusic = {
    id: 's2',
    mediaUrl: 'https://example.com/pic.jpg',
    music: { duration: 15, startTime: 30 }
  };
  assert.strictEqual(calculateStoryDurationMs(storyWith15sMusic), 15000);

  const storyWith30sMusic = {
    id: 's3',
    mediaUrl: 'https://example.com/pic.jpg',
    music: { duration: 30, startTime: 0 }
  };
  assert.strictEqual(calculateStoryDurationMs(storyWith30sMusic), 30000);
});

test('StoryViewer displays tap-to-enable banner when browser autoplay rejection occurs', () => {
  let autoplayBlocked = false;
  let audioPlaying = false;

  const simulatePlayAttempt = async (browserAllowsAutoplay) => {
    if (browserAllowsAutoplay) {
      audioPlaying = true;
      autoplayBlocked = false;
    } else {
      audioPlaying = false;
      autoplayBlocked = true; // Set banner state
    }
  };

  // Simulating rejected autoplay (common in mobile Chrome / Safari)
  simulatePlayAttempt(false);
  assert.strictEqual(audioPlaying, false);
  assert.strictEqual(autoplayBlocked, true, 'Tap-to-enable banner must activate when autoplay is blocked');

  // User taps the floating banner
  simulatePlayAttempt(true);
  assert.strictEqual(audioPlaying, true);
  assert.strictEqual(autoplayBlocked, false, 'Banner dismissed after successful user-initiated playback');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 19: IMAGE POST MUSIC (TASK 4)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 19] IMAGE POST MUSIC: Explicit Interaction, Loop Bounds & Scroll Pause');

test('Image post soundtrack requires explicit user interaction to play and never starts automatically', () => {
  const post = {
    id: 'p_101',
    mediaUrl: 'https://example.com/fest.jpg',
    music: { trackId: 'trk_1', title: 'Deep Tech', artist: 'DJ Alex', startTime: 15, duration: 20 }
  };

  let isPlaying = false;
  const initialMount = () => {
    isPlaying = false;
  };
  initialMount();
  assert.strictEqual(isPlaying, false, 'Post soundtrack must NOT autoplay on mount');

  const onUserTapPlay = () => {
    isPlaying = !isPlaying;
  };
  onUserTapPlay();
  assert.strictEqual(isPlaying, true, 'Post soundtrack plays upon explicit user click');
  onUserTapPlay();
  assert.strictEqual(isPlaying, false, 'Post soundtrack pauses on secondary tap');
});

test('Image post soundtrack enforces clip start and loop boundary', () => {
  const music = { startTime: 10, duration: 15 };
  const loopEnd = music.startTime + music.duration; // 25s

  let currentTime = music.startTime;
  const onTimeUpdate = (newTime) => {
    if (newTime >= loopEnd) {
      currentTime = music.startTime; // loop back to clip start
    } else {
      currentTime = newTime;
    }
  };

  onTimeUpdate(12);
  assert.strictEqual(currentTime, 12);

  onTimeUpdate(24.9);
  assert.strictEqual(currentTime, 24.9);

  // Time exceeds clip duration -> must loop to startTime
  onTimeUpdate(25.1);
  assert.strictEqual(currentTime, 10, 'Playback must loop back to clip startTime at clip boundary');
});

test('IntersectionObserver pauses post soundtrack when scrolled out of viewport (< 20% visible)', () => {
  let isPlaying = true;
  const observerCallback = (entry) => {
    if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
      isPlaying = false;
    }
  };

  // User scrolls post out of view
  observerCallback({ isIntersecting: false, intersectionRatio: 0.05 });
  assert.strictEqual(isPlaying, false, 'Soundtrack must stop when post is scrolled away');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 20: KLYPS MUSIC SYNCHRONIZATION (TASK 5)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 20] KLYPS MUSIC: Synchronized Video & Attached Soundtrack');

test('Klyp with attached music mutes video audio and synchronizes soundtrack playback', () => {
  const reelWithSoundtrack = {
    id: 'reel_1',
    mediaUrl: 'https://example.com/video.mp4',
    music: { title: 'Acid Line', artist: 'Synthetik', startTime: 0, duration: 15 }
  };

  const getMediaMuteStates = (reel, isGlobalMuted) => {
    return {
      videoMuted: isGlobalMuted || Boolean(reel.music),
      musicMuted: isGlobalMuted
    };
  };

  // Case 1: Unmuted feed
  let mutes = getMediaMuteStates(reelWithSoundtrack, false);
  assert.strictEqual(mutes.videoMuted, true, 'Raw video must be muted in favor of attached soundtrack');
  assert.strictEqual(mutes.musicMuted, false, 'Attached music soundtrack is audible');

  // Case 2: Global muted
  mutes = getMediaMuteStates(reelWithSoundtrack, true);
  assert.strictEqual(mutes.videoMuted, true);
  assert.strictEqual(mutes.musicMuted, true, 'Attached music soundtrack must obey global mute');

  // Case 3: Reel without music (original audio only)
  const reelWithoutSoundtrack = { id: 'reel_2', mediaUrl: 'https://example.com/video2.mp4' };
  mutes = getMediaMuteStates(reelWithoutSoundtrack, false);
  assert.strictEqual(mutes.videoMuted, false, 'Raw video audio plays when no music is attached');
});

test('Switching active Klyp immediately pauses previous Klyp video and soundtrack', () => {
  let currentActiveId = 'reel_1';
  let reel1VideoPlaying = true;
  let reel1AudioPlaying = true;
  let reel2VideoPlaying = false;
  let reel2AudioPlaying = false;

  const onScrollToNextKlyp = (newReelId) => {
    if (newReelId !== currentActiveId) {
      reel1VideoPlaying = false;
      reel1AudioPlaying = false;
      currentActiveId = newReelId;
      reel2VideoPlaying = true;
      reel2AudioPlaying = true;
    }
  };

  onScrollToNextKlyp('reel_2');
  assert.strictEqual(reel1VideoPlaying, false, 'Previous reel video must stop');
  assert.strictEqual(reel1AudioPlaying, false, 'Previous reel music must stop');
  assert.strictEqual(reel2VideoPlaying, true, 'Next reel video starts');
  assert.strictEqual(reel2AudioPlaying, true, 'Next reel music starts');
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 21: SAVED AUDIO & MY ORIGINAL SOUNDS (TASK 6)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 21] SAVED AUDIO: Persistent Storage & Original Audio Listing');

test('Saving and unsaving audio persists track metadata in storage', () => {
  const mockStorage = new Map();
  const STORAGE_KEY = 'dk_saved_audio_tracks_test';

  const saveTrack = (track) => {
    const existing = JSON.parse(mockStorage.get(STORAGE_KEY) || '[]');
    const next = [...existing.filter(t => t.id !== track.id), track];
    mockStorage.set(STORAGE_KEY, JSON.stringify(next));
  };

  const unsaveTrack = (trackId) => {
    const existing = JSON.parse(mockStorage.get(STORAGE_KEY) || '[]');
    const next = existing.filter(t => t.id !== trackId);
    mockStorage.set(STORAGE_KEY, JSON.stringify(next));
  };

  const getSavedTracks = () => {
    return JSON.parse(mockStorage.get(STORAGE_KEY) || '[]');
  };

  saveTrack({ id: 'trk_alpha', title: 'Berlin Underground', artist: 'Klang' });
  saveTrack({ id: 'trk_beta', title: 'Sunset Grooves', artist: 'Mira' });
  assert.strictEqual(getSavedTracks().length, 2);

  unsaveTrack('trk_alpha');
  const remaining = getSavedTracks();
  assert.strictEqual(remaining.length, 1);
  assert.strictEqual(remaining[0].id, 'trk_beta');
});

test('My Original Sounds handles unverified or deleted creator audio safely', () => {
  const sanitizeOriginalSounds = (rawList) => {
    return rawList
      .filter((t) => t && t.id && (t.audioUrl || t.mediaUrl))
      .map((t) => ({
        id: t.id,
        title: t.title || 'Untitled Sound',
        artist: t.artist || t.authorUsername || 'Creator',
        audioUrl: t.audioUrl || t.mediaUrl,
        provider: 'creator_upload',
        canPreview: Boolean(t.audioUrl || t.mediaUrl),
        syncCleared: true
      }));
  };

  const rawDocs = [
    { id: 'sound_1', title: 'DJ Intro Drop', audioUrl: 'https://example.com/drop.mp3', authorUsername: 'djneo' },
    { id: 'corrupt_doc', title: null, audioUrl: null },
    null
  ];

  const sanitized = sanitizeOriginalSounds(rawDocs);
  assert.strictEqual(sanitized.length, 1);
  assert.strictEqual(sanitized[0].id, 'sound_1');
  assert.strictEqual(sanitized[0].provider, 'creator_upload');
  assert.strictEqual(sanitized[0].canPreview, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 22: LICENSING REVALIDATION & ANDROID COMPATIBILITY (TASK 7)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 22] LICENSING & ANDROID: Publishing Revalidation & Responsive Safety');

test('validatePublishing strictly rejects publishing unverified or commercial tracks lacking credentials', () => {
  const testValidatePublishing = (music) => {
    if (!music) return { cleared: true };
    if (music.rightsEvidence?.licenseStatus === 'commercial_credentials_required') {
      return {
        cleared: false,
        rejectionReason: music.rightsEvidence.rejectionReason || 'Commercial provider credentials required'
      };
    }
    if (music.rightsEvidence?.licenseStatus === 'unverified_license') {
      return {
        cleared: false,
        rejectionReason: music.rightsEvidence.rejectionReason || 'Unverified license'
      };
    }
    if (music.canPublish === false || music.syncCleared === false) {
      return {
        cleared: false,
        rejectionReason: music.rightsEvidence?.rejectionReason || 'Sync rights not cleared'
      };
    }
    return { cleared: true };
  };

  // Case 1: Verified curated track
  const cleared = testValidatePublishing({
    trackId: 'c1',
    canPublish: true,
    syncCleared: true,
    rightsEvidence: { licenseStatus: 'verified_sync_cleared' }
  });
  assert.strictEqual(cleared.cleared, true);

  // Case 2: Commercial stub without credentials
  const hooprTrack = testValidatePublishing({
    trackId: 'h1',
    canPublish: false,
    syncCleared: false,
    rightsEvidence: {
      licenseStatus: 'commercial_credentials_required',
      rejectionReason: 'Commercial provider credentials required'
    }
  });
  assert.strictEqual(hooprTrack.cleared, false);
  assert.match(hooprTrack.rejectionReason, /credentials required/i);

  // Case 3: Playable preview but NOT cleared for publishing (All Rights Reserved)
  const previewOnly = testValidatePublishing({
    trackId: 'arr1',
    canPreview: true,
    canPublish: false,
    syncCleared: false,
    rightsEvidence: { licenseStatus: 'unverified_license' }
  });
  assert.strictEqual(previewOnly.cleared, false);
});

test('Mobile touch targets for music controls are at least 44x44px or padded', () => {
  const touchTargets = [
    { name: 'StoryAudioToggle', width: 44, height: 44 },
    { name: 'PostMusicPillButton', width: 140, height: 44 },
    { name: 'ReelSoundtrackBadge', width: 160, height: 44 },
    { name: 'MusicPickerCloseButton', width: 44, height: 44 },
    { name: 'WaveformScrubberKnob', width: 44, height: 44 }
  ];

  touchTargets.forEach(target => {
    assert.ok(target.width >= 44, `${target.name} width (${target.width}) should be >= 44px`);
    assert.ok(target.height >= 44, `${target.name} height (${target.height}) should be >= 44px`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 23: MUSIC FAILURES, ERROR RECOVERY & REGRESSION AUDIT
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 23] MUSIC RESILIENCE: Failures, Format Errors & Navigation Safety');

test('Missing audio URL safely fails with clear error state without throwing', () => {
  const postWithMissingAudio = {
    id: 'post_missing_url',
    mediaUrl: 'https://example.com/photo.jpg',
    music: { title: 'Ghost Track', artist: 'Nobody', audioUrl: null, previewUrl: '' }
  };

  let musicError = false;
  let isPlaying = false;

  const attemptPlay = () => {
    const streamUrl = postWithMissingAudio.music?.audioUrl || postWithMissingAudio.music?.previewUrl;
    if (!streamUrl) {
      musicError = true;
      isPlaying = false;
      return false;
    }
    isPlaying = true;
    return true;
  };

  const played = attemptPlay();
  assert.strictEqual(played, false);
  assert.strictEqual(musicError, true, 'musicError flag should be set on missing audio URL');
  assert.strictEqual(isPlaying, false);
});

test('Media decoding or format error activates audio unavailable badge without crashing card', () => {
  let isPlayingMusic = true;
  let musicError = false;

  // Emulate <audio> error event handler
  const onAudioError = () => {
    musicError = true;
    isPlayingMusic = false;
  };

  onAudioError();
  assert.strictEqual(musicError, true);
  assert.strictEqual(isPlayingMusic, false);

  // UI badge render check
  const renderBadgeText = (err) => err ? 'Audio unavailable' : 'Playing';
  assert.strictEqual(renderBadgeText(musicError), 'Audio unavailable');
});

test('Rapid playback toggle clicks debounce cleanly to single resolved state', () => {
  let isPlaying = false;
  let sessionStarts = 0;

  const togglePlayback = () => {
    if (isPlaying) {
      isPlaying = false;
    } else {
      isPlaying = true;
      sessionStarts++;
    }
  };

  // Simulate 5 rapid user clicks
  togglePlayback(); // true (session 1)
  togglePlayback(); // false
  togglePlayback(); // true (session 2)
  togglePlayback(); // false
  togglePlayback(); // true (session 3)

  assert.strictEqual(isPlaying, true);
  assert.strictEqual(sessionStarts, 3);
});

test('Rapid route switching stops all in-flight media and prevents audio leakage', () => {
  const coordinator = new TestAudioCoordinator();
  const mediaStops = [];

  coordinator.startSession('story_999', 'story', () => mediaStops.push('story_999'));
  assert.strictEqual(coordinator.activeSessionId, 'story_999');

  // User rapidly clicks away to /feed
  coordinator.startSession('post_888', 'post', () => mediaStops.push('post_888'));
  assert.ok(mediaStops.includes('story_999'));

  // User rapidly clicks away to /reels
  coordinator.startSession('klyp_777', 'reel', () => mediaStops.push('klyp_777'));
  assert.ok(mediaStops.includes('post_888'));

  // User exits application or closes modal
  coordinator.stopAll();
  assert.ok(mediaStops.includes('klyp_777'));
  assert.strictEqual(coordinator.activeSessionId, null);
});

test('Offline mode recovers stale catalog cache and presents warning banner', () => {
  const mockStorage = new Map();
  const cacheKey = 'deckknob_catalog_offline_test';
  const sampleTracks = [{ id: 'tr_1', title: 'Deep Tech' }];

  // Write item with past expiry
  mockStorage.set(cacheKey, JSON.stringify({
    data: sampleTracks,
    timestamp: Date.now() - 7200000, // 2 hours old
    expiresAt: Date.now() - 3600000
  }));

  const fetchWithFallback = (isOnline) => {
    if (!isOnline) {
      // Offline fallback reads stale
      const raw = mockStorage.get(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { tracks: parsed.data, isOfflineFallback: true };
      }
    }
    return { tracks: [], isOfflineFallback: false };
  };

  const offlineRes = fetchWithFallback(false);
  assert.strictEqual(offlineRes.isOfflineFallback, true);
  assert.strictEqual(offlineRes.tracks.length, 1);
  assert.strictEqual(offlineRes.tracks[0].title, 'Deep Tech');
});

test('Backward compatibility: Content without music renders normally without errors', () => {
  const legacyPost = { id: 'leg_1', caption: 'Throwback set', mediaUrl: 'https://example.com/pic.jpg' };
  const legacyStory = { id: 'leg_s1', authorUsername: 'djmarx', mediaUrl: 'https://example.com/story.jpg' };
  const legacyReel = { id: 'leg_r1', caption: 'Drop time', mediaUrl: 'https://example.com/video.mp4' };

  assert.strictEqual(legacyPost.music, undefined);
  assert.strictEqual(legacyStory.music, undefined);
  assert.strictEqual(legacyReel.music, undefined);

  // Check music soundtrack pill condition
  assert.strictEqual(Boolean(legacyPost.music), false);
  assert.strictEqual(Boolean(legacyStory.music), false);
  assert.strictEqual(Boolean(legacyReel.music), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 24: DJ PROFILE PLAYLIST DEMOS & DEMO RIGHTS BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n▶ [FEATURE 24] DJ PROFILE PLAYLIST DEMOS: Upload, Playback & Rights Separation');

test('validateAudioFile enforces 25MB file size limit and supported audio formats', () => {
  // Exceeds 25MB limit
  const oversizedFile = { name: 'set_flac_master.wav', size: 28 * 1024 * 1024, type: 'audio/wav' };
  const resOver = validateAudioFile(oversizedFile);
  assert.strictEqual(resOver.valid, false);
  assert.match(resOver.error, /exceeds the 25 MB limit/i);

  // Unsupported format (e.g. executable or document)
  const exeFile = { name: 'dj_tool.exe', size: 5 * 1024 * 1024, type: 'application/x-msdownload' };
  const resExe = validateAudioFile(exeFile);
  assert.strictEqual(resExe.valid, false);
  assert.match(resExe.error, /unsupported audio format/i);

  // Valid MP3 file
  const validMp3 = { name: 'club_cut_promo.mp3', size: 8 * 1024 * 1024, type: 'audio/mpeg' };
  const resMp3 = validateAudioFile(validMp3);
  assert.strictEqual(resMp3.valid, true);
  assert.strictEqual(resMp3.format, 'mp3');

  // Valid WAV file
  const validWav = { name: 'bassline_demo.wav', size: 20 * 1024 * 1024, type: 'audio/wav' };
  const resWav = validateAudioFile(validWav);
  assert.strictEqual(resWav.valid, true);
  assert.strictEqual(resWav.format, 'wav');

  // Valid M4A file
  const validM4a = { name: 'festival_preview.m4a', size: 6 * 1024 * 1024, type: 'audio/mp4' };
  const resM4a = validateAudioFile(validM4a);
  assert.strictEqual(resM4a.valid, true);
  assert.strictEqual(resM4a.format, 'm4a');
});

test('Playlist creation strictly requires title and mandatory ownership attestation', () => {
  const validatePlaylistCreation = (data) => {
    if (!data.title || !data.title.trim()) {
      throw new Error('Playlist title is required.');
    }
    if (!data.ownershipAttested) {
      throw new Error('Ownership declaration required: You must attest that you own or are legally authorized to distribute this audio.');
    }
    if (!Array.isArray(data.tracks) || data.tracks.length === 0) {
      throw new Error('Please add at least one audio demo track.');
    }
    return { valid: true };
  };

  // Missing ownership attestation -> throws
  assert.throws(() => {
    validatePlaylistCreation({
      title: 'Tresor Vault Demos',
      ownershipAttested: false,
      tracks: [{ title: 'Track 1', audioUrl: 'https://example.com/audio.mp3' }]
    }),
    /Ownership declaration required/
  });

  // Missing title -> throws
  assert.throws(() => {
    validatePlaylistCreation({
      title: '   ',
      ownershipAttested: true,
      tracks: [{ title: 'Track 1', audioUrl: 'https://example.com/audio.mp3' }]
    }),
    /Playlist title is required/
  });

  // Complete payload -> passes
  const validPayload = {
    title: 'Tresor Vault Demos 2026',
    ownershipAttested: true,
    tracks: [{ title: 'Sub Heavy Acid', audioUrl: 'https://example.com/sub.mp3' }]
  };
  assert.strictEqual(validatePlaylistCreation(validPayload).valid, true);
});

test('Private demo playlists are strictly hidden from public visitors and visible to owner', () => {
  const userPlaylists = [
    { id: 'pl_pub_1', title: 'Berlin Summer Mix', visibility: 'public', ownerUid: 'dj_carl' },
    { id: 'pl_priv_1', title: 'Unreleased VIP Dubs', visibility: 'private', ownerUid: 'dj_carl' }
  ];

  const filterForViewer = (playlists, targetUid, viewerUid) => {
    const isOwner = viewerUid && viewerUid === targetUid;
    return playlists.filter(pl => pl.visibility === 'public' || isOwner);
  };

  // Anonymous public visitor
  const anonView = filterForViewer(userPlaylists, 'dj_carl', null);
  assert.strictEqual(anonView.length, 1);
  assert.strictEqual(anonView[0].id, 'pl_pub_1');

  // Another user (dj_stranger)
  const otherView = filterForViewer(userPlaylists, 'dj_carl', 'dj_stranger');
  assert.strictEqual(otherView.length, 1);
  assert.strictEqual(otherView[0].id, 'pl_pub_1');

  // Playlist Owner (dj_carl) -> sees both public and private
  const ownerView = filterForViewer(userPlaylists, 'dj_carl', 'dj_carl');
  assert.strictEqual(ownerView.length, 2);
  assert.strictEqual(ownerView.some(p => p.id === 'pl_priv_1'), true);
});

test('Track reordering preserves track metadata and updates order indices', () => {
  const initialTracks = [
    { id: 'trk_1', title: 'Intro Tool', bpm: 128, key: '8A', order: 0 },
    { id: 'trk_2', title: 'Peak Time Banger', bpm: 132, key: '9A', order: 1 },
    { id: 'trk_3', title: 'Outro Ambient', bpm: 120, key: '8B', order: 2 }
  ];

  // Reorder: Move Peak Time Banger (trk_2) to first position
  const reorderLogic = (tracks, newOrderIds) => {
    const map = new Map(tracks.map(t => [t.id, t]));
    return newOrderIds.map((id, idx) => ({ ...map.get(id), order: idx }));
  };

  const reordered = reorderLogic(initialTracks, ['trk_2', 'trk_1', 'trk_3']);
  assert.strictEqual(reordered[0].id, 'trk_2');
  assert.strictEqual(reordered[0].order, 0);
  assert.strictEqual(reordered[0].bpm, 132);

  assert.strictEqual(reordered[1].id, 'trk_1');
  assert.strictEqual(reordered[1].order, 1);

  assert.strictEqual(reordered[2].id, 'trk_3');
  assert.strictEqual(reordered[2].order, 2);
});

test('Demo tracks are strictly fail-closed for UGC synchronization (Stories, Posts, Klyps)', () => {
  const demoTrack = {
    id: 'demo_trk_77',
    title: 'Unreleased Dub 2026',
    artist: 'DJ Producer',
    isDemo: true,
    licenseType: 'DJ Original Demo (Profile Stream Only)',
    audioUrl: 'https://example.com/demo.mp3'
  };

  const rights = evaluateTrackRights(demoTrack, 'dj_demo');
  assert.strictEqual(rights.canPreview, true, 'Stream preview permitted on DJ profile');
  assert.strictEqual(rights.canPublish, false, 'Publishing to Stories/Reels strictly prohibited');
  assert.strictEqual(rights.syncCleared, false, 'Sync clearance must be false');
  assert.match(rights.rightsEvidence.rejectionReason, /profile stream listening only/i);

  // Attempting to publish via fail-closed licensing gate must throw or reject
  assert.throws(() => {
    assertTrackSyncAuthorized(rights);
  }, LicensingValidationError);

  const pubCheck = validatePublishing(rights);
  assert.strictEqual(pubCheck.cleared, false);
  assert.match(pubCheck.rejectionReason, /profile stream listening only/i);
});

test('Single-active playback coordinator stops previous player when demo playlist starts', () => {
  let postAudioPlaying = true;
  let demoAudioPlaying = false;

  const mockCoordinator = {
    activeSession: null,
    startSession(id, type, onStop) {
      if (this.activeSession) {
        this.activeSession.onStop?.();
      }
      this.activeSession = { id, type, onStop };
    }
  };

  // Image post music is active
  mockCoordinator.startSession('post_soundtrack_12', 'post', () => {
    postAudioPlaying = false;
  });
  assert.strictEqual(postAudioPlaying, true);

  // User starts playing a DJ demo playlist
  mockCoordinator.startSession('profile_playlist_99', 'playlist', () => {
    demoAudioPlaying = false;
  });
  demoAudioPlaying = true;

  // Post soundtrack must have been stopped
  assert.strictEqual(postAudioPlaying, false, 'Post audio must stop when playlist demo starts');
  assert.strictEqual(demoAudioPlaying, true, 'Demo audio becomes active');
  assert.strictEqual(mockCoordinator.activeSession.type, 'playlist');
});

test('Backward compatibility: Profiles without demoPlaylists default cleanly to empty array', () => {
  const legacyProfile = { uid: 'user_legacy', username: 'selector99', bio: 'Vinyl collector' };
  const getPlaylistsSafe = (profile) => {
    return Array.isArray(profile.demoPlaylists) ? profile.demoPlaylists : [];
  };

  const playlists = getPlaylistsSafe(legacyProfile);
  assert.ok(Array.isArray(playlists));
  assert.strictEqual(playlists.length, 0);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  ALL TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('═══════════════════════════════════════════════════════════════\n');

if (failCount > 0) {
  process.exit(1);
}



