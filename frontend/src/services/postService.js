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
        authorRole: role || 'fan',
        media_url: mediaUrl,
        media_type: mediaType, // 'image' | 'video'
        caption: caption || '',
        likes_count: 0,
        comments_count: 0,
        taggedUsers: options.taggedUsers || [],
        mentionedUsernames,
        createdAt: serverTimestamp()
      };
      
      await setDoc(newPostRef, postData);
      
      // Update user posts count
      await updateDoc(doc(db, 'users', currentUid), {
        postsCount: increment(1)
      });

      // Index mentions for notification lookup
      if (options.taggedUsers && options.taggedUsers.length > 0) {
        for (const tagged of options.taggedUsers) {
          try {
            await addDoc(collection(db, 'mentions'), {
              postId: newPostRef.id,
              mentionedUid: tagged.uid,
              mentionedUsername: tagged.username,
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
      let q = query(
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
      
      const snapshot = await getDocs(q);
      const posts = [];
      
      for (const postDoc of snapshot.docs) {
        const data = postDoc.data();
        const postId = postDoc.id;
        
        // Check if current user liked it
        let isLiked = false;
        let isBookmarked = false;
        
        if (currentUid) {
          const likeRef = doc(db, 'likes', `${postId}_${currentUid}`);
          const likeSnap = await getDoc(likeRef);
          isLiked = likeSnap.exists();
          
          const saveRef = doc(db, 'savedPosts', `${postId}_${currentUid}`);
          const saveSnap = await getDoc(saveRef);
          isBookmarked = saveSnap.exists();
        }
        
        posts.push({
          id: postId,
          media_url: data.media_url,
          media_type: data.media_type,
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
          docSnapshot: postDoc // Store for cursor pagination
        });
      }
      
      return posts;
    } catch (e) {
      console.error('[postService] getFeedPosts error:', e);
      return [];
    }
  },

  getUserPosts: async (username, currentUid) => {
    try {
      // Find user UID first by username
      const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase().trim()));
      if (!usernameDoc.exists()) return [];
      const uid = usernameDoc.data().uid;

      let snapshot;
      try {
        const q = query(
          collection(db, 'posts'),
          where('authorId', '==', uid),
          orderBy('createdAt', 'desc')
        );
        snapshot = await getDocs(q);
      } catch (indexError) {
        console.warn('Firebase index still building, falling back to client-side sort for posts.');
        const fallbackQ = query(
          collection(db, 'posts'),
          where('authorId', '==', uid)
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
          const likeRef = doc(db, 'likes', `${postId}_${currentUid}`);
          const likeSnap = await getDoc(likeRef);
          isLiked = likeSnap.exists();
          
          const saveRef = doc(db, 'savedPosts', `${postId}_${currentUid}`);
          const saveSnap = await getDoc(saveRef);
          isBookmarked = saveSnap.exists();
        }
        
        posts.push({
          id: postId,
          media_url: data.media_url,
          media_type: data.media_type,
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
      posts.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
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
      snapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() });
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
  }
};
