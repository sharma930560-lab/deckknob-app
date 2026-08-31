import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  writeBatch,
  increment,
  serverTimestamp
} from 'firebase/firestore';

export const userService = {
  getUserProfile: async (uid) => {
    try {
      if (!uid) return null;
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          uid,
          id: uid,
          ...data,
          profilePic: data.profilePic || data.profile_pic || '',
          profile_pic: data.profilePic || data.profile_pic || '',
          postsCount: data.postsCount ?? data.posts_count ?? 0,
          followersCount: data.followersCount ?? data.followers_count ?? 0,
          followingCount: data.followingCount ?? data.following_count ?? 0,
        };
      }
      return null;
    } catch (e) {
      console.error('[userService] getUserProfile error:', e);
      return null;
    }
  },

  getUserByUsername: async (username) => {
    try {
      if (!username) return null;
      const name = username.toLowerCase().trim();
      
      // First check usernames lookup collection
      const usernameDocRef = doc(db, 'usernames', name);
      const usernameSnap = await getDoc(usernameDocRef);
      if (usernameSnap.exists()) {
        const uid = usernameSnap.data().uid;
        return await userService.getUserProfile(uid);
      }

      // Fallback query in users collection by username
      const q = query(
        collection(db, 'users'),
        where('username', '==', name),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const data = userDoc.data();
        return {
          uid: userDoc.id,
          id: userDoc.id,
          ...data,
          profilePic: data.profilePic || data.profile_pic || '',
          profile_pic: data.profilePic || data.profile_pic || '',
        };
      }

      return null;
    } catch (e) {
      console.error('[userService] getUserByUsername error:', e);
      return null;
    }
  },

  updateUserProfile: async (uid, data) => {
    try {
      if (!uid) throw new Error('User ID is required to update profile.');
      const docRef = doc(db, 'users', uid);
      
      const payload = {
        ...data,
        updatedAt: serverTimestamp(),
      };

      // If username changed, update usernames collection
      if (data.username) {
        const cleanUsername = data.username.toLowerCase().trim().replace(/\s/g, '_');
        payload.username = cleanUsername;
        try {
          await setDoc(doc(db, 'usernames', cleanUsername), {
            uid,
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (err) {
          console.warn('[userService] Failed to update usernames index:', err);
        }
      }

      await setDoc(docRef, payload, { merge: true });
      return await userService.getUserProfile(uid);
    } catch (e) {
      console.error('[userService] updateUserProfile error:', e);
      throw e;
    }
  },

  checkUsernameAvailable: async (username) => {
    try {
      if (!username) return false;
      const name = username.toLowerCase().trim().replace(/\s/g, '_');
      const docRef = doc(db, 'usernames', name);
      const docSnap = await getDoc(docRef);
      return !docSnap.exists();
    } catch (e) {
      console.error('[userService] checkUsernameAvailable error:', e);
      return false;
    }
  },

  followUser: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid || currentUid === targetUid) return;
      const batch = writeBatch(db);
      
      const followingRef = doc(db, 'following', currentUid, 'userFollowing', targetUid);
      batch.set(followingRef, {
        targetUid,
        createdAt: serverTimestamp()
      });
      
      const followersRef = doc(db, 'followers', targetUid, 'userFollowers', currentUid);
      batch.set(followersRef, {
        followerUid: currentUid,
        createdAt: serverTimestamp()
      });
      
      batch.update(doc(db, 'users', currentUid), { followingCount: increment(1) });
      batch.update(doc(db, 'users', targetUid), { followersCount: increment(1) });
      
      await batch.commit();
    } catch (e) {
      console.error('[userService] followUser error:', e);
      throw e;
    }
  },

  unfollowUser: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid) return;
      const batch = writeBatch(db);
      
      const followingRef = doc(db, 'following', currentUid, 'userFollowing', targetUid);
      batch.delete(followingRef);
      
      const followersRef = doc(db, 'followers', targetUid, 'userFollowers', currentUid);
      batch.delete(followersRef);
      
      batch.update(doc(db, 'users', currentUid), { followingCount: increment(-1) });
      batch.update(doc(db, 'users', targetUid), { followersCount: increment(-1) });
      
      await batch.commit();
    } catch (e) {
      console.error('[userService] unfollowUser error:', e);
      throw e;
    }
  },

  isFollowing: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid) return false;
      const docRef = doc(db, 'following', currentUid, 'userFollowing', targetUid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (e) {
      console.error('[userService] isFollowing error:', e);
      return false;
    }
  },

  searchUsers: async (searchText) => {
    try {
      const qText = searchText.toLowerCase().trim();
      if (!qText) return [];
      
      const q = query(
        collection(db, 'users'),
        where('username', '>=', qText),
        where('username', '<=', qText + '\uf8ff'),
        limit(20)
      );
      
      const snap = await getDocs(q);
      const users = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          uid: docSnap.id,
          id: docSnap.id,
          ...data,
          profilePic: data.profilePic || data.profile_pic || '',
          profile_pic: data.profilePic || data.profile_pic || '',
        });
      });
      return users;
    } catch (e) {
      console.error('[userService] searchUsers error:', e);
      return [];
    }
  }
};
