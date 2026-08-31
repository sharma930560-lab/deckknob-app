import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore';

export const userService = {
  getUserProfile: async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.error('[userService] getUserProfile error:', e);
      return null;
    }
  },

  getUserByUsername: async (username) => {
    try {
      const name = username.toLowerCase().trim();
      const usernameDocRef = doc(db, 'usernames', name);
      const usernameSnap = await getDoc(usernameDocRef);
      if (!usernameSnap.exists()) return null;
      
      const uid = usernameSnap.data().uid;
      return await userService.getUserProfile(uid);
    } catch (e) {
      console.error('[userService] getUserByUsername error:', e);
      return null;
    }
  },

  updateUserProfile: async (uid, data) => {
    try {
      const docRef = doc(db, 'users', uid);
      await updateDoc(docRef, data);
      return await userService.getUserProfile(uid);
    } catch (e) {
      console.error('[userService] updateUserProfile error:', e);
      throw e;
    }
  },

  checkUsernameAvailable: async (username) => {
    try {
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
      const batch = writeBatch(db);
      
      const followingRef = doc(db, 'following', currentUid, 'userFollowing', targetUid);
      batch.set(followingRef, { createdAt: new Date() });
      
      const followersRef = doc(db, 'followers', targetUid, 'userFollowers', currentUid);
      batch.set(followersRef, { createdAt: new Date() });
      
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
      snap.forEach((doc) => {
        users.push(doc.data());
      });
      return users;
    } catch (e) {
      console.error('[userService] searchUsers error:', e);
      return [];
    }
  }
};
