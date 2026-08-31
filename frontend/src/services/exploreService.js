import { db } from '../config/firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where
} from 'firebase/firestore';

export const exploreService = {
  getTrending: async () => {
    try {
      const postsQ = query(collection(db, 'posts'), orderBy('likes_count', 'desc'), limit(6));
      const reelsQ = query(collection(db, 'reels'), orderBy('likes_count', 'desc'), limit(6));
      
      const [postsSnap, reelsSnap] = await Promise.all([getDocs(postsQ), getDocs(reelsQ)]);
      
      const posts = [];
      postsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          media_url: data.media_url,
          media_type: data.media_type,
          caption: data.caption,
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername,
            profile_pic: data.authorAvatar,
            role: data.authorRole
          }
        });
      });

      const reels = [];
      reelsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        reels.push({
          id: docSnap.id,
          media_url: data.media_url,
          poster: data.poster || data.media_url,
          caption: data.caption,
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername,
            profile_pic: data.authorAvatar,
            role: data.authorRole
          }
        });
      });
      
      return { posts, reels };
    } catch (e) {
      console.error('[exploreService] getTrending error:', e);
      return { posts: [], reels: [] };
    }
  },

  getSuggestedUsers: async (currentUid) => {
    try {
      const usersQ = query(collection(db, 'users'), limit(10));
      const snapshot = await getDocs(usersQ);
      const suggestions = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.uid !== currentUid) {
          suggestions.push({
            id: data.uid,
            username: data.username,
            avatar: data.profilePic || data.profile_pic,
            profile_pic: data.profilePic || data.profile_pic,
            role: data.role,
            genre: data.genre
          });
        }
      });
      return suggestions;
    } catch (e) {
      console.error('[exploreService] getSuggestedUsers error:', e);
      return [];
    }
  },

  search: async (searchText) => {
    try {
      let qText = searchText.toLowerCase().trim();
      if (!qText) return { users: [], hashtags: [] };
      
      if (qText.startsWith('#')) {
        qText = qText.substring(1);
      }

      // Enforce prefix matching for user lookup
      const usersQ = query(
        collection(db, 'users'),
        where('username', '>=', qText),
        where('username', '<=', qText + '\uf8ff'),
        limit(15)
      );
      
      const usersSnap = await getDocs(usersQ);
      const users = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          id: data.uid,
          username: data.username,
          profile_pic: data.profilePic || data.profile_pic,
          role: data.role
        });
      });
      
      // Hashtag prefix lookup
      const hashtagsQ = query(
        collection(db, 'hashtags'),
        where('name', '>=', qText),
        where('name', '<=', qText + '\uf8ff'),
        limit(15)
      );
      
      const hashtagsSnap = await getDocs(hashtagsQ);
      const hashtags = [];
      hashtagsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        hashtags.push({
          name: data.name
        });
      });
      
      // Fallback if no hashtags found
      if (hashtags.length === 0) {
        hashtags.push({ name: qText });
      }

      return { users, hashtags };
    } catch (e) {
      console.error('[exploreService] search error:', e);
      return { users: [], hashtags: [] };
    }
  }
};
