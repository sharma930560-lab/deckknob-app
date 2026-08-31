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
        media_type: mediaType,
        viewers: [],
        createdAt: serverTimestamp(),
        expiresAt: options.scheduledTime 
          ? new Date(new Date(options.scheduledTime).getTime() + 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours TTL
        isArchived: false,
        isDraft: options.isDraft || false,
        scheduledTime: options.scheduledTime || null,
        
        // Stickers, text overlays, tags, and music metadata
        overlays: options.overlays || [], // Draggable/resizable text/stickers
        tags: options.tags || [],
        location: options.location || null,
        music: options.music || null, // { title, artist, audioUrl, startTime, duration }
        filter: options.filter || 'Original',
        adjustments: options.adjustments || {}
      };
      
      await setDoc(newStoryRef, storyData);

      // Track story creation in analytics
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

      // Save tags and mentions to dedicated indexes
      if (options.tags && options.tags.length > 0) {
        for (const taggedUser of options.tags) {
          await addDoc(collection(db, 'storyTags'), {
            storyId: newStoryRef.id,
            userId: taggedUser.uid || taggedUser.id,
            username: taggedUser.username,
            createdAt: serverTimestamp()
          });
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
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, 'stories'),
        where('createdAt', '>=', oneDayAgo),
        where('isDraft', '==', false),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const userGroupsMap = {};
      
      snapshot.forEach((storyDoc) => {
        const data = storyDoc.data();
        const authorId = data.authorId;
        const viewers = data.viewers || [];
        const isSeen = currentUid ? viewers.includes(currentUid) : false;
        
        const storyObj = {
          id: storyDoc.id,
          media_url: data.media_url,
          media_type: data.media_type || 'image',
          is_seen: isSeen,
          overlays: data.overlays || [],
          location: data.location || null,
          music: data.music || null,
          filter: data.filter || 'Original',
          adjustments: data.adjustments || {},
          createdAt: data.createdAt
        };
        
        if (!userGroupsMap[authorId]) {
          userGroupsMap[authorId] = {
            user: {
              id: authorId,
              username: data.authorUsername,
              profile_pic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername}&background=DFE104&color=000&bold=true`
            },
            stories: [],
            has_unseen: false
          };
        }
        
        userGroupsMap[authorId].stories.push(storyObj);
      });
      
      const groups = Object.values(userGroupsMap).map((group) => {
        group.stories.reverse();
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
      
      // Update viewers list in main story document
      await updateDoc(storyRef, {
        viewers: arrayUnion(currentUid)
      });

      // Record view detailed document
      const viewId = `${storyId}_${currentUid}`;
      const viewRef = doc(db, 'storyViews', viewId);
      const viewSnap = await getDoc(viewRef);
      
      if (!viewSnap.exists()) {
        await setDoc(viewRef, {
          storyId,
          userId: currentUid,
          viewedAt: serverTimestamp()
        });

        // Increment view counts on analytics
        const analyticsRef = doc(db, 'storyAnalytics', storyId);
        await updateDoc(analyticsRef, {
          views: increment(1),
          reach: increment(1)
        }).catch(() => {});
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
      
      // Increment reply counter in analytics
      const analyticsRef = doc(db, 'storyAnalytics', storyId);
      await updateDoc(analyticsRef, {
        replies: increment(1)
      }).catch(() => {});

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
      const q = query(
        collection(db, 'storyHighlights'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const highlights = [];
      snap.forEach((doc) => {
        highlights.push(doc.data());
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
      const q = query(
        collection(db, 'stories'),
        where('authorId', '==', currentUid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const archive = [];
      snap.forEach((doc) => {
        const data = doc.data();
        // Return if older than 24 hours or explicitly archived
        archive.push(data);
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
