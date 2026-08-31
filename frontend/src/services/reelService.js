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
        mediaUrl: mediaUrl,
        media_type: 'video',
        mediaType: 'video',
        poster: mediaUrl,
        caption: caption || '',
        duration_seconds: durationSeconds || 0,
        likes_count: 0,
        comments_count: 0,
        taggedUsers: options.taggedUsers || [],
        mentionedUsernames,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(newReelRef, reelData);

      // Increment user reels / posts count
      try {
        await updateDoc(doc(db, 'users', currentUid), {
          reelsCount: increment(1)
        });
      } catch { /* non-critical */ }

      if (options.taggedUsers && options.taggedUsers.length > 0) {
        for (const tagged of options.taggedUsers) {
          try {
            await addDoc(collection(db, 'mentions'), {
              reelId: newReelRef.id,
              mentionedUid: tagged.uid || '',
              mentionedUsername: tagged.username || '',
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
      let q;
      try {
        q = query(
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
      } catch {
        q = query(collection(db, 'reels'), limit(limitCount));
      }
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('[reelService] Falling back to unindexed reels query:', indexError);
        snapshot = await getDocs(query(collection(db, 'reels'), limit(limitCount)));
      }

      const reels = [];
      
      for (const reelDoc of snapshot.docs) {
        const data = reelDoc.data();
        const reelId = reelDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (currentUid) {
          try {
            const likeRef = doc(db, 'likes', `${reelId}_${currentUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${reelId}_${currentUid}`);
            const saveSnap = await getDoc(saveRef);
            isBookmarked = saveSnap.exists();
          } catch { /* non-fatal */ }
        }

        const mediaUrl = data.media_url || data.mediaUrl || '';
        
        reels.push({
          id: reelId,
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: 'video',
          mediaType: 'video',
          poster: data.poster || mediaUrl,
          caption: data.caption || '',
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          duration_seconds: data.duration_seconds ?? 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername || 'selector',
            profile_pic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername || 'U'}&background=DFE104&color=000&bold=true`,
            profilePic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername || 'U'}&background=DFE104&color=000&bold=true`,
            role: data.authorRole || 'dj'
          },
          docSnapshot: reelDoc
        });
      }

      reels.sort((a, b) => {
        return parseTimestampMillis(b.createdAt) - parseTimestampMillis(a.createdAt);
      });
      
      return reels;
    } catch (e) {
      console.error('[reelService] getReels error:', e);
      return [];
    }
  },

  getUserReels: async (usernameOrUid, currentUid) => {
    try {
      if (!usernameOrUid) return [];

      let targetUid = usernameOrUid;

      const userDirectSnap = await getDoc(doc(db, 'users', usernameOrUid));
      if (!userDirectSnap.exists()) {
        const usernameDoc = await getDoc(doc(db, 'usernames', usernameOrUid.toLowerCase().trim()));
        if (usernameDoc.exists()) {
          targetUid = usernameDoc.data().uid;
        }
      }

      let snapshot;
      try {
        const q = query(
          collection(db, 'reels'),
          where('authorId', '==', targetUid),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('[reelService] Fallback to author reels query:', indexError);
        const fallbackQ = query(
          collection(db, 'reels'),
          where('authorId', '==', targetUid)
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
          try {
            const likeRef = doc(db, 'likes', `${reelId}_${currentUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${reelId}_${currentUid}`);
            const saveSnap = await getDoc(saveRef);
            isBookmarked = saveSnap.exists();
          } catch { /* non-fatal */ }
        }

        const mediaUrl = data.media_url || data.mediaUrl || '';
        
        reels.push({
          id: reelId,
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: 'video',
          mediaType: 'video',
          poster: data.poster || mediaUrl,
          caption: data.caption || '',
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          duration_seconds: data.duration_seconds ?? 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername,
            profile_pic: data.authorAvatar,
            profilePic: data.authorAvatar,
            role: data.authorRole
          }
        });
      }
      
      // Client-side sort fallback
      reels.sort((a, b) => {
        return parseTimestampMillis(b.createdAt) - parseTimestampMillis(a.createdAt);
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
  },

  deleteReel: async (reelId, currentUid) => {
    try {
      const reelRef = doc(db, 'reels', reelId);
      const reelSnap = await getDoc(reelRef);
      if (reelSnap.exists() && reelSnap.data().authorId === currentUid) {
        await deleteDoc(reelRef);
        await updateDoc(doc(db, 'users', currentUid), {
          reelsCount: increment(-1)
        });
      }
    } catch (e) {
      console.error('[reelService] deleteReel error:', e);
      throw e;
    }
  }
};
