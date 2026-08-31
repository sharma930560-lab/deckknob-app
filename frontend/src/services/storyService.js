import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  increment,
  serverTimestamp,
  deleteDoc,
  addDoc
} from 'firebase/firestore';

function parseTimestampMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

export const storyService = {
  // Create Story with overlays, tags, location, scheduled time, and music
  createStory: async (currentUid, username, avatar, mediaUrl, mediaType = 'image', options = {}) => {
    try {
      const storiesRef = collection(db, 'stories');
      const newStoryRef = doc(storiesRef);
      
      const storyData = {
        id: newStoryRef.id,
        authorId: currentUid,
        authorUsername: username,
        authorAvatar: avatar || '',
        media_url: mediaUrl,
        mediaUrl: mediaUrl,
        media_type: mediaType || 'image',
        mediaType: mediaType || 'image',
        viewers: [],
        createdAt: serverTimestamp(),
        expiresAt: options.scheduledTime 
          ? new Date(new Date(options.scheduledTime).getTime() + 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours TTL
        isArchived: false,
        isDraft: options.isDraft || false,
        scheduledTime: options.scheduledTime || null,
        
        // Stickers, text overlays, tags, and music metadata
        overlays: options.overlays || [],
        tags: options.tags || [],
        location: options.location || null,
        music: options.music || null,
        filter: options.filter || 'Original',
        adjustments: options.adjustments || {},
        caption: options.caption || ''
      };
      
      await setDoc(newStoryRef, storyData);

      // Track story creation in analytics
      try {
        const analyticsRef = doc(db, 'storyAnalytics', newStoryRef.id);
        await setDoc(analyticsRef, {
          storyId: newStoryRef.id,
          authorId: currentUid,
          views: 0,
          reach: 0,
          replies: 0,
          shares: 0,
          stickerClicks: 0,
          musicClicks: 0,
          linkClicks: 0,
          createdAt: serverTimestamp()
        });
      } catch { /* non-critical */ }

      // Save tags and mentions to dedicated indexes
      if (options.tags && options.tags.length > 0) {
        for (const taggedUser of options.tags) {
          try {
            await addDoc(collection(db, 'storyTags'), {
              storyId: newStoryRef.id,
              userId: taggedUser.uid || taggedUser.id,
              username: taggedUser.username,
              createdAt: serverTimestamp()
            });
          } catch { /* non-critical */ }
        }
      }

      return storyData;
    } catch (e) {
      console.error('[storyService] createStory error:', e);
      throw e;
    }
  },

  // Get active feed stories
  getActiveStories: async (currentUid) => {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      let snapshot;

      try {
        const q = query(
          collection(db, 'stories'),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexErr) {
        console.warn('[storyService] Falling back to unindexed stories query:', indexErr);
        snapshot = await getDocs(collection(db, 'stories'));
      }
      
      const userGroupsMap = {};
      
      snapshot.forEach((storyDoc) => {
        const data = storyDoc.data();
        if (data.isDraft) return;

        const createdMillis = parseTimestampMillis(data.createdAt);
        // Exclude stories older than 24h if timestamp is present
        if (createdMillis > 0 && createdMillis < oneDayAgo) return;

        const authorId = data.authorId;
        const viewers = data.viewers || [];
        const isSeen = currentUid ? viewers.includes(currentUid) : false;
        
        const mediaUrl = data.media_url || data.mediaUrl || '';
        const mediaType = data.media_type || data.mediaType || 'image';

        const storyObj = {
          id: storyDoc.id,
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: mediaType,
          mediaType: mediaType,
          is_seen: isSeen,
          overlays: data.overlays || [],
          location: data.location || null,
          music: data.music || null,
          filter: data.filter || 'Original',
          adjustments: data.adjustments || {},
          caption: data.caption || '',
          createdAt: data.createdAt
        };
        
        if (!userGroupsMap[authorId]) {
          userGroupsMap[authorId] = {
            user: {
              id: authorId,
              username: data.authorUsername || 'selector',
              profile_pic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername || 'U'}&background=DFE104&color=000&bold=true`
            },
            stories: [],
            has_unseen: false
          };
        }
        
        userGroupsMap[authorId].stories.push(storyObj);
      });
      
      const groups = Object.values(userGroupsMap).map((group) => {
        // Sort oldest to newest within user's active story reel
        group.stories.sort((a, b) => parseTimestampMillis(a.createdAt) - parseTimestampMillis(b.createdAt));
        group.has_unseen = group.stories.some((s) => !s.is_seen);
        return group;
      });
      
      return groups;
    } catch (e) {
      console.error('[storyService] getActiveStories error:', e);
      return [];
    }
  },

  // Mark a story as seen and log to storyViews
  markStorySeen: async (storyId, currentUid) => {
    try {
      if (!currentUid) return;
      const storyRef = doc(db, 'stories', storyId);
      
      await updateDoc(storyRef, {
        viewers: arrayUnion(currentUid)
      });

      const viewId = `${storyId}_${currentUid}`;
      const viewRef = doc(db, 'storyViews', viewId);
      const viewSnap = await getDoc(viewRef);
      
      if (!viewSnap.exists()) {
        await setDoc(viewRef, {
          storyId,
          userId: currentUid,
          viewedAt: serverTimestamp()
        });

        try {
          const analyticsRef = doc(db, 'storyAnalytics', storyId);
          await updateDoc(analyticsRef, {
            views: increment(1),
            reach: increment(1)
          });
        } catch { /* non-critical */ }
      }
    } catch (e) {
      console.error('[storyService] markStorySeen error:', e);
    }
  },

  // Story replies
  replyToStory: async (storyId, currentUid, username, avatar, text) => {
    try {
      const repliesRef = collection(db, 'storyReplies');
      const replyData = {
        storyId,
        authorId: currentUid,
        authorUsername: username,
        authorAvatar: avatar || '',
        text,
        createdAt: serverTimestamp()
      };
      const replyDoc = await addDoc(repliesRef, replyData);
      
      try {
        const analyticsRef = doc(db, 'storyAnalytics', storyId);
        await updateDoc(analyticsRef, {
          replies: increment(1)
        });
      } catch { /* non-critical */ }

      return { id: replyDoc.id, ...replyData };
    } catch (e) {
      console.error('[storyService] replyToStory error:', e);
      throw e;
    }
  },

  // Story highlights
  createHighlight: async (currentUid, title, coverUrl, storyIds) => {
    try {
      const highlightsRef = collection(db, 'storyHighlights');
      const newHighlightRef = doc(highlightsRef);
      const highlightData = {
        id: newHighlightRef.id,
        userId: currentUid,
        title,
        coverUrl: coverUrl || '',
        storyIds: storyIds || [],
        createdAt: serverTimestamp()
      };
      await setDoc(newHighlightRef, highlightData);
      return highlightData;
    } catch (e) {
      console.error('[storyService] createHighlight error:', e);
      throw e;
    }
  },

  getHighlights: async (userId) => {
    try {
      let snap;
      try {
        const q = query(
          collection(db, 'storyHighlights'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        snap = await getDocs(q);
      } catch {
        const fallbackQ = query(
          collection(db, 'storyHighlights'),
          where('userId', '==', userId)
        );
        snap = await getDocs(fallbackQ);
      }

      const highlights = [];
      snap.forEach((docSnap) => {
        highlights.push(docSnap.data());
      });
      return highlights;
    } catch (e) {
      console.error('[storyService] getHighlights error:', e);
      return [];
    }
  },

  // Get archived stories (expired stories owned by current user)
  getStoriesArchive: async (currentUid) => {
    try {
      let snap;
      try {
        const q = query(
          collection(db, 'stories'),
          where('authorId', '==', currentUid),
          orderBy('createdAt', 'desc')
        );
        snap = await getDocs(q);
      } catch {
        const fallbackQ = query(
          collection(db, 'stories'),
          where('authorId', '==', currentUid)
        );
        snap = await getDocs(fallbackQ);
      }

      const archive = [];
      snap.forEach((docSnap) => {
        archive.push(docSnap.data());
      });
      return archive;
    } catch (e) {
      console.error('[storyService] getStoriesArchive error:', e);
      return [];
    }
  },

  // Get single story analytics
  getStoryAnalytics: async (storyId) => {
    try {
      const analyticsRef = doc(db, 'storyAnalytics', storyId);
      const snap = await getDoc(analyticsRef);
      if (snap.exists()) {
        return snap.data();
      }
      return {
        views: 0,
        reach: 0,
        replies: 0,
        shares: 0,
        stickerClicks: 0,
        musicClicks: 0,
        linkClicks: 0
      };
    } catch (e) {
      console.error('[storyService] getStoryAnalytics error:', e);
      return null;
    }
  }
};
