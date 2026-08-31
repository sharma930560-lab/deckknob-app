import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/firebase/config';

export const postService = {
  createPost: async (
    uid: string,
    username: string,
    userAvatar: string,
    userRole: string,
    mediaUrl: string,
    mediaType: 'image' | 'video',
    caption: string,
    options?: { taggedUsers?: any[] }
  ) => {
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        uid,
        username,
        userAvatar,
        userRole,
        mediaUrl,
        mediaType,
        caption,
        taggedUsers: options?.taggedUsers || [],
        likesCount: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (e) {
      console.error('[postService] createPost error:', e);
      throw e;
    }
  },

  getFeed: async () => {
    try {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(15));
      const snap = await getDocs(q);
      const posts: any[] = [];
      snap.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      return posts;
    } catch (e) {
      console.error('[postService] getFeed error:', e);
      return [];
    }
  }
};
