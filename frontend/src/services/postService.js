import { db } from '../config/firebase';
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
      const postsRef = collection(db, 'posts');
      const newPostRef = doc(postsRef);

      // Extract @mentions from caption text
      const mentionMatches = (caption || '').match(/@(\w+)/g) || [];
      const mentionedUsernames = mentionMatches.map(m => m.slice(1));

      const postData = {
        id: newPostRef.id,
        authorId: currentUid,
        authorUsername: username,
        authorAvatar: avatar || '',
        authorRole: role || 'dj',
        media_url: mediaUrl,
        mediaUrl: mediaUrl,
        media_type: mediaType || 'image', // 'image' | 'video'
        mediaType: mediaType || 'image',
        caption: caption || '',
        likes_count: 0,
        comments_count: 0,
        taggedUsers: options.taggedUsers || [],
        mentionedUsernames,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(newPostRef, postData);
      
      // Update user posts count
      try {
        await updateDoc(doc(db, 'users', currentUid), {
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
              authorId: currentUid,
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
      
      for (const postDoc of snapshot.docs) {
        const data = postDoc.data();
        const postId = postDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (currentUid) {
          try {
            const likeRef = doc(db, 'likes', `${postId}_${currentUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${postId}_${currentUid}`);
            const saveSnap = await getDoc(saveRef);
            isBookmarked = saveSnap.exists();
          } catch { /* non-fatal */ }
        }
        
        const mediaUrl = data.media_url || data.mediaUrl || '';
        const mediaType = data.media_type || data.mediaType || 'image';

        posts.push({
          id: postId,
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: mediaType,
          mediaType: mediaType,
          caption: data.caption || '',
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
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
          docSnapshot: postDoc
        });
      }

      // Sort client-side
      posts.sort((a, b) => {
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
      const userDirectSnap = await getDoc(doc(db, 'users', usernameOrUid));
      if (!userDirectSnap.exists()) {
        // Look up by username
        const usernameDoc = await getDoc(doc(db, 'usernames', usernameOrUid.toLowerCase().trim()));
        if (usernameDoc.exists()) {
          targetUid = usernameDoc.data().uid;
        }
      }

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
      
      for (const postDoc of snapshot.docs) {
        const data = postDoc.data();
        const postId = postDoc.id;
        
        let isLiked = false;
        let isBookmarked = false;
        
        if (currentUid) {
          try {
            const likeRef = doc(db, 'likes', `${postId}_${currentUid}`);
            const likeSnap = await getDoc(likeRef);
            isLiked = likeSnap.exists();
            
            const saveRef = doc(db, 'savedPosts', `${postId}_${currentUid}`);
            const saveSnap = await getDoc(saveRef);
            isBookmarked = saveSnap.exists();
          } catch { /* non-fatal */ }
        }
        
        const mediaUrl = data.media_url || data.mediaUrl || '';
        const mediaType = data.media_type || data.mediaType || 'image';

        posts.push({
          id: postId,
          media_url: mediaUrl,
          mediaUrl: mediaUrl,
          media_type: mediaType,
          mediaType: mediaType,
          caption: data.caption || '',
          likes_count: data.likes_count ?? 0,
          comments_count: data.comments_count ?? 0,
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
      const likeRef = doc(db, 'likes', `${postId}_${currentUid}`);
      await setDoc(likeRef, {
        targetId: postId,
        targetType: 'post',
        userId: currentUid,
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
      const likeRef = doc(db, 'likes', `${postId}_${currentUid}`);
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
      const saveRef = doc(db, 'savedPosts', `${postId}_${currentUid}`);
      if (isBookmarked) {
        await setDoc(saveRef, {
          userId: currentUid,
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
      const commentsRef = collection(db, 'posts', postId, 'comments');
      const commentData = {
        authorId: currentUid,
        authorUsername: username,
        authorAvatar: avatar || '',
        text,
        createdAt: serverTimestamp()
      };
      
      const commentDocRef = await addDoc(commentsRef, commentData);
      
      // Increment comment count on post
      const postRef = doc(db, 'posts', postId);
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
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists() && postSnap.data().authorId === currentUid) {
        await deleteDoc(postRef);
        await updateDoc(doc(db, 'users', currentUid), {
          postsCount: increment(-1)
        });
      }
    } catch (e) {
      console.error('[postService] deletePost error:', e);
      throw e;
    }
  }
};
