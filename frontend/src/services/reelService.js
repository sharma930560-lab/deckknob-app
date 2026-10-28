import { db, auth } from '../config/firebase';
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
import { validatePublishing, LicensingValidationError } from './musicService';

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
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid) {
        throw new Error('Authentication required: user must be logged in to create a reel.');
      }

      if (options.music) {
        const rights = validatePublishing(options.music);
        if (!rights.cleared) {
          throw new LicensingValidationError(
            `Klyp music publishing rejected: ${rights.rejectionReason}`,
            options.music.rightsEvidence || null
          );
        }
      }

      const reelsRef = collection(db, 'reels');
      const newReelRef = doc(reelsRef);

      const mentionMatches = (caption || '').match(/@(\w+)/g) || [];
      const mentionedUsernames = mentionMatches.map(m => m.slice(1));

      const defaultPoster = mediaUrl ? mediaUrl.replace(/\.[^/.]+$/, '.jpg') : '';
      const finalPoster = options.coverUrl || options.poster || defaultPoster || mediaUrl;

      const reelData = {
        id: newReelRef.id,
        authorId: activeUid,
        authorUsername: username || auth.currentUser?.displayName || 'selector',
        authorAvatar: avatar || '',
        authorRole: role || 'dj',
        media_url: mediaUrl,
        mediaUrl: mediaUrl,
        media_type: 'video',
        mediaType: 'video',
        poster: finalPoster,
        caption: caption || '',
        duration_seconds: durationSeconds || 0,
        likes_count: 0,
        comments_count: 0,
        taggedUsers: options.taggedUsers || [],
        mentionedUsernames,
        music: options.music || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(newReelRef, reelData);

      // Increment user reels / posts count
      try {
        await updateDoc(doc(db, 'users', activeUid), {
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
              authorId: activeUid,
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
      const activeUid = auth.currentUser?.uid || currentUid;
      
      for (const reelDoc of snapshot.docs) {
        const data = reelDoc.data();
        const reelId = reelDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (activeUid && reelId) {
          try {
            const likeRef = doc(db, 'likes', `${reelId}_${activeUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${reelId}_${activeUid}`);
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
          music: data.music || null,
          taggedUsers: data.taggedUsers || [],
          mentionedUsernames: data.mentionedUsernames || [],
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

      // Sort client-side
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

      try {
        const userDirectSnap = await getDoc(doc(db, 'users', usernameOrUid));
        if (userDirectSnap.exists()) {
          targetUid = usernameOrUid;
        } else {
          const usernameDoc = await getDoc(doc(db, 'usernames', usernameOrUid.toLowerCase().trim()));
          if (usernameDoc.exists()) {
            targetUid = usernameDoc.data().uid;
          }
        }
      } catch { /* fallback */ }

      let snapshot;
      try {
        const q = query(
          collection(db, 'reels'),
          where('authorId', '==', targetUid),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('[reelService] Fallback to author query:', indexError);
        const fallbackQ = query(
          collection(db, 'reels'),
          where('authorId', '==', targetUid)
        );
        snapshot = await getDocs(fallbackQ);
      }

      const reels = [];
      const activeUid = auth.currentUser?.uid || currentUid;
      
      for (const reelDoc of snapshot.docs) {
        const data = reelDoc.data();
        const reelId = reelDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (activeUid && reelId) {
          try {
            const likeRef = doc(db, 'likes', `${reelId}_${activeUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${reelId}_${activeUid}`);
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
          music: data.music || null,
          taggedUsers: data.taggedUsers || [],
          mentionedUsernames: data.mentionedUsernames || [],
          createdAt: data.createdAt,
          user: {
            id: data.authorId,
            username: data.authorUsername || 'selector',
            profile_pic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername || 'U'}&background=DFE104&color=000&bold=true`,
            profilePic: data.authorAvatar || `https://ui-avatars.com/api/?name=${data.authorUsername || 'U'}&background=DFE104&color=000&bold=true`,
            role: data.authorRole || 'dj'
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
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid) throw new Error('Authentication required to like.');
      if (!reelId) return;

      const likeRef = doc(db, 'likes', `${reelId}_${activeUid}`);
      const existingLike = await getDoc(likeRef);
      if (existingLike.exists()) return;

      await setDoc(likeRef, {
        targetId: reelId,
        targetType: 'reel',
        userId: activeUid,
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
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid || !reelId) return;

      const likeRef = doc(db, 'likes', `${reelId}_${activeUid}`);
      const existingLike = await getDoc(likeRef);
      if (!existingLike.exists()) return;

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
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid || !reelId) return;

      const saveRef = doc(db, 'savedPosts', `${reelId}_${activeUid}`);
      if (isBookmarked) {
        await setDoc(saveRef, {
          userId: activeUid,
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
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid || !reelId) return;

      const reelRef = doc(db, 'reels', reelId);
      const reelSnap = await getDoc(reelRef);
      if (reelSnap.exists() && reelSnap.data().authorId === activeUid) {
        await deleteDoc(reelRef);
        await updateDoc(doc(db, 'users', activeUid), {
          reelsCount: increment(-1)
        });
      }
    } catch (e) {
      console.error('[reelService] deleteReel error:', e);
      throw e;
    }
  },

  getComments: async (reelId) => {
    try {
      if (!reelId) return [];
      const commentsRef = collection(db, 'reels', reelId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const comments = [];
      snapshot.forEach((docSnap) => {
        comments.push({ id: docSnap.id, ...docSnap.data() });
      });
      return comments;
    } catch (e) {
      console.error('[reelService] getComments error:', e);
      return [];
    }
  },

  addComment: async (reelId, currentUid, username, avatar, text) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid) {
        throw new Error('Authentication required to comment.');
      }
      if (!reelId || !text?.trim()) return null;

      // Privacy / Blocking check: Verify neither current user nor reel author is blocked
      const reelRef = doc(db, 'reels', reelId);
      const reelSnap = await getDoc(reelRef);
      if (reelSnap.exists()) {
        const authorId = reelSnap.data().authorId;
        if (authorId && authorId !== activeUid) {
          const isBlocked1 = await getDoc(doc(db, 'blocked', authorId, 'blockedUsers', activeUid));
          const isBlocked2 = await getDoc(doc(db, 'blocked', activeUid, 'blockedUsers', authorId));
          if (isBlocked1.exists() || isBlocked2.exists()) {
            throw new Error('Cannot comment: communication restricted.');
          }
        }
      }

      const commentsRef = collection(db, 'reels', reelId, 'comments');
      const commentData = {
        authorId: activeUid,
        authorUsername: username || auth.currentUser?.displayName || 'selector',
        authorAvatar: avatar || '',
        text: text.trim(),
        createdAt: serverTimestamp()
      };

      const commentDocRef = await addDoc(commentsRef, commentData);

      // Increment comment count on reel
      await updateDoc(reelRef, {
        comments_count: increment(1)
      });

      return { id: commentDocRef.id, ...commentData };
    } catch (e) {
      console.error('[reelService] addComment error:', e);
      throw e;
    }
  }
};
