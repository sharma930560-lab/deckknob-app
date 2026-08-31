import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/firebase/config';

export const reelService = {
  createReel: async (
    uid: string,
    username: string,
    userAvatar: string,
    userRole: string,
    videoUrl: string,
    caption: string,
    options?: { taggedUsers?: any[] }
  ) => {
    try {
      const docRef = await addDoc(collection(db, 'reels'), {
        uid,
        username,
        userAvatar,
        userRole,
        videoUrl,
        caption,
        taggedUsers: options?.taggedUsers || [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (e) {
      console.error('[reelService] createReel error:', e);
      throw e;
    }
  },

  getReels: async () => {
    try {
      const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      const reels: any[] = [];
      snap.forEach((doc) => {
        reels.push({ id: doc.id, ...doc.data() });
      });
      return reels;
    } catch (e) {
      console.error('[reelService] getReels error:', e);
      return [];
    }
  }
};
