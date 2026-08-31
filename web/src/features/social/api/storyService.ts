import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/firebase/config';

export const storyService = {
  createStory: async (
    uid: string,
    username: string,
    userAvatar: string,
    mediaUrl: string,
    mediaType: 'image' | 'video',
    options?: {
      overlays?: any[];
      music?: any;
      filter?: string;
      adjustments?: any;
      scheduledTime?: string | null;
      isDraft?: boolean;
      tags?: any[];
      caption?: string;
    }
  ) => {
    try {
      const docRef = await addDoc(collection(db, 'stories'), {
        uid,
        username,
        userAvatar,
        mediaUrl,
        mediaType,
        ...options,
        viewCount: 0,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      });
      return docRef.id;
    } catch (e) {
      console.error('[storyService] createStory error:', e);
      throw e;
    }
  },

  getStories: async () => {
    try {
      const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      const stories: any[] = [];
      snap.forEach((doc) => {
        stories.push({ id: doc.id, ...doc.data() });
      });
      return stories;
    } catch (e) {
      console.error('[storyService] getStories error:', e);
      return [];
    }
  }
};
