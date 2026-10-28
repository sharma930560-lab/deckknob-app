import { db, auth } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  increment,
  serverTimestamp
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

export const postService = {
  createPost: async (currentUid, username, avatar, role, mediaUrl, mediaType, caption, options = {}) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid) {
        throw new Error('Authentication required: user must be logged in to create a post.');
      }

      if (options.music) {
        const rights = validatePublishing(options.music);
        if (!rights.cleared) {
          throw new LicensingValidationError(
            `Post music publishing rejected: ${rights.rejectionReason}`,
            options.music.rightsEvidence || null
          );
        }
      }

      const postsRef = collection(db, 'posts');
      const newPostRef = doc(postsRef);

      // Extract @mentions from caption text
      const mentionMatches = (caption || '').match(/@(\w+)/g) || [];
      const mentionedUsernames = mentionMatches.map(m => m.slice(1));

      const postData = {
        id: newPostRef.id,
        authorId: activeUid,
        authorUsername: username || auth.currentUser?.displayName || 'selector',
        authorAvatar: avatar || '',
        authorRole: role || 'dj',
        genre: options.genre || 'all',
        media_url: mediaUrl,
        mediaUrl: mediaUrl,
        media_type: mediaType || 'image', // 'image' | 'video'
        mediaType: mediaType || 'image',
        caption: caption || '',
        likes_count: 0,
        comments_count: 0,
        taggedUsers: options.taggedUsers || [],
        mentionedUsernames,
        music: options.music || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(newPostRef, postData);
      
      // Update user posts count
      try {
        await updateDoc(doc(db, 'users', activeUid), {
          postsCount: increment(1)
        });
      } catch (err) {
        console.warn('[postService] Could not increment postsCount on user:', err);
      }

      // Index mentions for notification lookup
      if (options.taggedUsers && options.taggedUsers.length > 0) {
        for (const tagged of options.taggedUsers) {
          try {
            await addDoc(collection(db, 'mentions'), {
              postId: newPostRef.id,
              mentionedUid: tagged.uid || '',
              mentionedUsername: tagged.username || '',
              authorId: activeUid,
              authorUsername: username,
              type: 'post',
              createdAt: serverTimestamp()
            });
          } catch { /* non-critical */ }
        }
      }
      
      return postData;
    } catch (e) {
      console.error('[postService] createPost error:', e);
      throw e;
    }
  },

  getFeedPosts: async (currentUid, lastDocSnapshot = null, limitCount = 10) => {
    try {
      let q;
      try {
        q = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        if (lastDocSnapshot) {
          q = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDocSnapshot),
            limit(limitCount)
          );
        }
      } catch {
        q = query(collection(db, 'posts'), limit(limitCount));
      }
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('[postService] Falling back to unindexed query:', indexError);
        snapshot = await getDocs(query(collection(db, 'posts'), limit(limitCount)));
      }

      const posts = [];
      const activeUid = auth.currentUser?.uid || currentUid;

      // Retrieve IDs of users blocked by active user
      let blockedUserIds = new Set();
      let followingUserIds = new Set();

      if (activeUid) {
        try {
          const blockedSnap = await getDocs(collection(db, 'blocked', activeUid, 'blockedUsers'));
          blockedSnap.forEach(d => blockedUserIds.add(d.data().targetUid || d.id));
        } catch { /* non-fatal */ }

        // Fetch followed users to personalize feed prioritization
        try {
          const followingSnap = await getDocs(collection(db, 'following', activeUid, 'userFollowing'));
          followingSnap.forEach(d => followingUserIds.add(d.data().targetUid || d.id));
        } catch { /* non-fatal */ }
      }
      
      for (const postDoc of snapshot.docs) {
        const data = postDoc.data();
        const postId = postDoc.id;
        const authorId = data.authorId;

        // Skip post if author is in current user's blocked list
        if (authorId && blockedUserIds.has(authorId)) {
          continue;
        }

        // Check if author has blocked current user
        if (activeUid && authorId && activeUid !== authorId) {
          try {
            const authorBlockSnap = await getDoc(doc(db, 'blocked', authorId, 'blockedUsers', activeUid));
            if (authorBlockSnap.exists()) {
              continue; // Skip post if author blocked current user
            }
          } catch { /* non-fatal */ }
        }
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (activeUid && postId) {
          try {
            const likeRef = doc(db, 'likes', `${postId}_${activeUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${postId}_${activeUid}`);
            const saveSnap = await getDoc(saveRef);
            isBookmarked = saveSnap.exists();
          } catch { /* non-fatal */ }
        }
        
        const mediaUrl = data.media_url || data.mediaUrl || '';
        const mediaType = data.media_type || data.mediaType || 'image';
        const isFromFollowed = Boolean(authorId && (followingUserIds.has(authorId) || authorId === activeUid));

        posts.push({
          id: postId,
          genre: data.genre || 'all',
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: mediaType,
          mediaType: mediaType,
          caption: data.caption || '',
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
          is_liked: isLiked,
          is_bookmarked: isBookmarked,
          is_from_followed: isFromFollowed,
          isFromFollowed: isFromFollowed,
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
          docSnapshot: postDoc
        });
      }

      // Sort client-side: prioritize followed users, then recency
      posts.sort((a, b) => {
        if (a.isFromFollowed && !b.isFromFollowed) return -1;
        if (!a.isFromFollowed && b.isFromFollowed) return 1;
        return parseTimestampMillis(b.createdAt) - parseTimestampMillis(a.createdAt);
      });
      
      return posts;
    } catch (e) {
      console.error('[postService] getFeedPosts error:', e);
      return [];
    }
  },

  getUserPosts: async (usernameOrUid, currentUid) => {
    try {
      if (!usernameOrUid) return [];

      let targetUid = usernameOrUid;

      // Check if usernameOrUid is a UID in users table
      try {
        const userDirectSnap = await getDoc(doc(db, 'users', usernameOrUid));
        if (userDirectSnap.exists()) {
          targetUid = usernameOrUid;
        } else {
          // Look up by username
          const usernameDoc = await getDoc(doc(db, 'usernames', usernameOrUid.toLowerCase().trim()));
          if (usernameDoc.exists()) {
            targetUid = usernameDoc.data().uid;
          }
        }
      } catch { /* fallback */ }

      let snapshot;
      try {
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', targetUid),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('[postService] Fallback to author query:', indexError);
        const fallbackQ = query(
          collection(db, 'posts'),
          where('authorId', '==', targetUid)
        );
        snapshot = await getDocs(fallbackQ);
      }

      const posts = [];
      const activeUid = auth.currentUser?.uid || currentUid;
      
      for (const postDoc of snapshot.docs) {
        const data = postDoc.data();
        const postId = postDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (activeUid && postId) {
          try {
            const likeRef = doc(db, 'likes', `${postId}_${activeUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${postId}_${activeUid}`);
            const saveSnap = await getDoc(saveRef);
            isBookmarked = saveSnap.exists();
          } catch { /* non-fatal */ }
        }
        
        const mediaUrl = data.media_url || data.mediaUrl || '';
        const mediaType = data.media_type || data.mediaType || 'image';

        posts.push({
          id: postId,
          genre: data.genre || 'all',
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: mediaType,
          mediaType: mediaType,
          caption: data.caption || '',
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
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
      posts.sort((a, b) => {
        return parseTimestampMillis(b.createdAt) - parseTimestampMillis(a.createdAt);
      });
      
      return posts;
    } catch (e) {
      console.error('[postService] getUserPosts error:', e);
      return [];
    }
  },

  likePost: async (postId, currentUid) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid) {
        throw new Error('Authentication required to like a post.');
      }
      if (!postId) return;

      const likeRef = doc(db, 'likes', `${postId}_${activeUid}`);
      const existingLike = await getDoc(likeRef);
      if (existingLike.exists()) {
        return; // Already liked, avoid duplicate count increment
      }

      await setDoc(likeRef, {
        targetId: postId,
        targetType: 'post',
        userId: activeUid,
        createdAt: serverTimestamp()
      });
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes_count: increment(1)
      });
    } catch (e) {
      console.error('[postService] likePost error:', e);
      throw e;
    }
  },

  unlikePost: async (postId, currentUid) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid || !postId) return;

      const likeRef = doc(db, 'likes', `${postId}_${activeUid}`);
      const existingLike = await getDoc(likeRef);
      if (!existingLike.exists()) {
        return; // Not liked, avoid duplicate count decrement
      }

      await deleteDoc(likeRef);
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes_count: increment(-1)
      });
    } catch (e) {
      console.error('[postService] unlikePost error:', e);
      throw e;
    }
  },

  bookmarkPost: async (postId, currentUid, isBookmarked) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid || !postId) return;

      const saveRef = doc(db, 'savedPosts', `${postId}_${activeUid}`);
      if (isBookmarked) {
        await setDoc(saveRef, {
          userId: activeUid,
          postId,
          createdAt: serverTimestamp()
        });
      } else {
        await deleteDoc(saveRef);
      }
    } catch (e) {
      console.error('[postService] bookmarkPost error:', e);
      throw e;
    }
  },

  getComments: async (postId) => {
    try {
      if (!postId) return [];
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const comments = [];
      snapshot.forEach((docSnap) => {
        comments.push({ id: docSnap.id, ...docSnap.data() });
      });
      return comments;
    } catch (e) {
      console.error('[postService] getComments error:', e);
      return [];
    }
  },

  addComment: async (postId, currentUid, username, avatar, text) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid) {
        throw new Error('Authentication required to comment.');
      }
      if (!postId || !text?.trim()) return null;

      // Privacy / Blocking check: Verify neither commenter nor post author is blocked
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const authorId = postSnap.data().authorId;
        if (authorId && authorId !== activeUid) {
          const isBlocked1 = await getDoc(doc(db, 'blocked', authorId, 'blockedUsers', activeUid));
          const isBlocked2 = await getDoc(doc(db, 'blocked', activeUid, 'blockedUsers', authorId));
          if (isBlocked1.exists() || isBlocked2.exists()) {
            throw new Error('Cannot comment: communication restricted.');
          }
        }
      }

      const commentsRef = collection(db, 'posts', postId, 'comments');
      const commentData = {
        authorId: activeUid,
        authorUsername: username || auth.currentUser?.displayName || 'selector',
        authorAvatar: avatar || '',
        text: text.trim(),
        createdAt: serverTimestamp()
      };
      
      const commentDocRef = await addDoc(commentsRef, commentData);
      
      // Increment comment count on post
      await updateDoc(postRef, {
        comments_count: increment(1)
      });
      
      return { id: commentDocRef.id, ...commentData };
    } catch (e) {
      console.error('[postService] addComment error:', e);
      throw e;
    }
  },

  deletePost: async (postId, currentUid) => {
    try {
      const activeUid = auth.currentUser?.uid || currentUid;
      if (!activeUid || !postId) return;

      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists() && postSnap.data().authorId === activeUid) {
        await deleteDoc(postRef);
        await updateDoc(doc(db, 'users', activeUid), {
          postsCount: increment(-1)
        });
      }
    } catch (e) {
      console.error('[postService] deletePost error:', e);
      throw e;
    }
  }
};
