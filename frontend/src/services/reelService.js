import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  increment,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';

export const reelService = {
  createReel: async (currentUid, username, avatar, role, mediaUrl, caption, durationSeconds = 0, options = {}) => {
    try {
      const reelsRef = collection(db, 'reels');
      const newReelRef = doc(reelsRef);

      const mentionMatches = (caption || '').match(/@(\w+)/g) || [];
      const mentionedUsernames = mentionMatches.map(m => m.slice(1));

      const reelData = {
        id: newReelRef.id,
        authorId: currentUid,
        authorUsername: username,
        authorAvatar: avatar || '',
        authorRole: role || 'dj',
        media_url: mediaUrl,
        poster: mediaUrl,
        caption: caption || '',
        duration_seconds: durationSeconds,
        likes_count: 0,
        comments_count: 0,
        taggedUsers: options.taggedUsers || [],
        mentionedUsernames,
        createdAt: serverTimestamp()
      };

      await setDoc(newReelRef, reelData);

      if (options.taggedUsers && options.taggedUsers.length > 0) {
        for (const tagged of options.taggedUsers) {
          try {
            await addDoc(collection(db, 'mentions'), {
              reelId: newReelRef.id,
              mentionedUid: tagged.uid,
              mentionedUsername: tagged.username,
              authorId: currentUid,
              authorUsername: username,
              type: 'reel',
              createdAt: serverTimestamp()
            });
          } catch { /* non-critical */ }
        }
      }

      return reelData;
    } catch (e) {
      console.error('[reelService] createReel error:', e);
      throw e;
    }
  },

  getReels: async (currentUid, lastDocSnapshot = null, limitCount = 10) => {
    try {
      let q = query(
        collection(db, 'reels'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      if (lastDocSnapshot) {
        q = query(
          collection(db, 'reels'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocSnapshot),
          limit(limitCount)
        );
      }
      
      const snapshot = await getDocs(q);
      const reels = [];
      
      for (const reelDoc of snapshot.docs) {
        const data = reelDoc.data();
        const reelId = reelDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (currentUid) {
          const likeRef = doc(db, 'likes', `${reelId}_${currentUid}`);
          const likeSnap = await getDoc(likeRef);
          isLiked = likeSnap.exists();
          
          const saveRef = doc(db, 'savedPosts', `${reelId}_${currentUid}`);
          const saveSnap = await getDoc(saveRef);
          isBookmarked = saveSnap.exists();
        }
        
        reels.push({
          id: reelId,
          media_url: data.media_url,
          poster: data.poster || data.media_url,
          caption: data.caption,
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername,
            profile_pic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername}&background=DFE104&color=000&bold=true`,
            role: data.authorRole
          },
          docSnapshot: reelDoc
        });
      }
      
      return reels;
    } catch (e) {
      console.error('[reelService] getReels error:', e);
      return [];
    }
  },

  getUserReels: async (username, currentUid) => {
    try {
      const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase().trim()));
      if (!usernameDoc.exists()) return [];
      const uid = usernameDoc.data().uid;

      let snapshot;
      try {
        // Try Firebase native sorting first
        const q = query(
          collection(db, 'reels'),
          where('authorId', '==', uid),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('Firebase index still building, falling back to client-side sort for reels.');
        // Fallback to client-side sorting if the composite index is still building
        const fallbackQ = query(
          collection(db, 'reels'),
          where('authorId', '==', uid)
        );
        snapshot = await getDocs(fallbackQ);
      }

      const reels = [];
      
      for (const reelDoc of snapshot.docs) {
        const data = reelDoc.data();
        const reelId = reelDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (currentUid) {
          const likeRef = doc(db, 'likes', `${reelId}_${currentUid}`);
          const likeSnap = await getDoc(likeRef);
          isLiked = likeSnap.exists();
          
          const saveRef = doc(db, 'savedPosts', `${reelId}_${currentUid}`);
          const saveSnap = await getDoc(saveRef);
          isBookmarked = saveSnap.exists();
        }
        
        reels.push({
          id: reelId,
          media_url: data.media_url,
          poster: data.poster || data.media_url,
          caption: data.caption,
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername,
            profile_pic: data.authorAvatar,
            role: data.authorRole
          }
        });
      }
      
      // Client-side sort fallback
      reels.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      
      return reels;
    } catch (e) {
      console.error('[reelService] getUserReels error:', e);
      return [];
    }
  },

  likeReel: async (reelId, currentUid) => {
    try {
      const likeRef = doc(db, 'likes', `${reelId}_${currentUid}`);
      await setDoc(likeRef, {
        targetId: reelId,
        targetType: 'reel',
        userId: currentUid,
        createdAt: serverTimestamp()
      });
      
      const reelRef = doc(db, 'reels', reelId);
      await updateDoc(reelRef, {
        likes_count: increment(1)
      });
    } catch (e) {
      console.error('[reelService] likeReel error:', e);
      throw e;
    }
  },

  unlikeReel: async (reelId, currentUid) => {
    try {
      const likeRef = doc(db, 'likes', `${reelId}_${currentUid}`);
      await deleteDoc(likeRef);
      
      const reelRef = doc(db, 'reels', reelId);
      await updateDoc(reelRef, {
        likes_count: increment(-1)
      });
    } catch (e) {
      console.error('[reelService] unlikeReel error:', e);
      throw e;
    }
  },

  bookmarkReel: async (reelId, currentUid, isBookmarked) => {
    try {
      const saveRef = doc(db, 'savedPosts', `${reelId}_${currentUid}`);
      if (isBookmarked) {
        await setDoc(saveRef, {
          userId: currentUid,
          postId: reelId,
          createdAt: serverTimestamp()
        });
      } else {
        await deleteDoc(saveRef);
      }
    } catch (e) {
      console.error('[reelService] bookmarkReel error:', e);
      throw e;
    }
  }
};
