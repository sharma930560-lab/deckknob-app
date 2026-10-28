import { db, auth } from '../config/firebase';
import { notificationService } from './notificationService';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
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

  searchUsers: async (searchTerm, maxResults = 10) => {
    try {
      if (!searchTerm) return [];
      const term = searchTerm.toLowerCase().trim().replace(/^@/, '');
      if (!term) return [];

      const q = query(
        collection(db, 'users'),
        where('username', '>=', term),
        where('username', '<=', term + '\uf8ff'),
        limit(maxResults)
      );
      const snap = await getDocs(q);
      const users = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          id: d.id,
          ...data,
          profilePic: data.profilePic || data.profile_pic || '',
          profile_pic: data.profilePic || data.profile_pic || '',
        };
      });

      if (users.length === 0) {
        const single = await userService.getUserByUsername(term);
        if (single) return [single];
      }

      return users;
    } catch (e) {
      console.error('[userService] searchUsers error:', e);
      return [];
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

  followUser: async (currentUid, targetUid, currentUserData = {}) => {
    try {
      if (!currentUid || !targetUid || currentUid === targetUid) return;

      const followingRef = doc(db, 'following', currentUid, 'userFollowing', targetUid);
      const existingSnap = await getDoc(followingRef);
      if (existingSnap.exists()) return; // Prevent duplicate follows

      const batch = writeBatch(db);
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

      // Trigger notification if not self
      try {
        const fromUsername = currentUserData.username || auth.currentUser?.displayName || 'selector';
        const fromAvatar = currentUserData.profilePic || currentUserData.profile_pic || '';
        await notificationService.createNotification(
          targetUid,
          currentUid,
          fromUsername,
          fromAvatar,
          'follow',
          `@${fromUsername} started following you.`
        );
      } catch (notifErr) {
        console.warn('[userService] Could not send follow notification:', notifErr);
      }
    } catch (e) {
      console.error('[userService] followUser error:', e);
      throw e;
    }
  },

  unfollowUser: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid || currentUid === targetUid) return;

      const followingRef = doc(db, 'following', currentUid, 'userFollowing', targetUid);
      const existingSnap = await getDoc(followingRef);
      if (!existingSnap.exists()) return; // Already unfollowed

      const batch = writeBatch(db);
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

  getFollowRelationship: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid || currentUid === targetUid) {
        return { isFollowing: false, isFollowedBy: false, canFollow: currentUid !== targetUid };
      }
      const [followingSnap, followerSnap] = await Promise.all([
        getDoc(doc(db, 'following', currentUid, 'userFollowing', targetUid)),
        getDoc(doc(db, 'followers', currentUid, 'userFollowers', targetUid))
      ]);
      return {
        isFollowing: followingSnap.exists(),
        isFollowedBy: followerSnap.exists(),
        canFollow: true
      };
    } catch (e) {
      console.error('[userService] getFollowRelationship error:', e);
      return { isFollowing: false, isFollowedBy: false, canFollow: currentUid !== targetUid };
    }
  },

  getFollowers: async (targetUid) => {
    try {
      if (!targetUid) return [];
      const snap = await getDocs(collection(db, 'followers', targetUid, 'userFollowers'));
      const followerUids = [];
      snap.forEach((d) => {
        const data = d.data();
        followerUids.push(data.followerUid || d.id);
      });
      
      const profiles = await Promise.all(
        followerUids.map((uid) => userService.getUserProfile(uid))
      );
      return profiles.filter(Boolean);
    } catch (e) {
      console.error('[userService] getFollowers error:', e);
      return [];
    }
  },

  getFollowing: async (targetUid) => {
    try {
      if (!targetUid) return [];
      const snap = await getDocs(collection(db, 'following', targetUid, 'userFollowing'));
      const followingUids = [];
      snap.forEach((d) => {
        const data = d.data();
        followingUids.push(data.targetUid || d.id);
      });
      
      const profiles = await Promise.all(
        followingUids.map((uid) => userService.getUserProfile(uid))
      );
      return profiles.filter(Boolean);
    } catch (e) {
      console.error('[userService] getFollowing error:', e);
      return [];
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
  },

  // ── Block / Unblock ────────────────────────────────────
  blockUser: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid || currentUid === targetUid) return;
      const ref = doc(db, 'blocked', currentUid, 'blockedUsers', targetUid);
      await setDoc(ref, { targetUid, createdAt: serverTimestamp() });
    } catch (e) {
      console.error('[userService] blockUser error:', e);
      throw e;
    }
  },

  unblockUser: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid) return;
      const ref = doc(db, 'blocked', currentUid, 'blockedUsers', targetUid);
      await deleteDoc(ref);
    } catch (e) {
      console.error('[userService] unblockUser error:', e);
      throw e;
    }
  },

  getBlockedUsers: async (currentUid) => {
    try {
      if (!currentUid) return [];
      const colRef = collection(db, 'blocked', currentUid, 'blockedUsers');
      const snap = await getDocs(colRef);
      const uids = snap.docs.map((d) => d.data().targetUid || d.id);
      // Fetch profiles in parallel (capped at 50)
      const profiles = await Promise.all(
        uids.slice(0, 50).map((uid) => userService.getUserProfile(uid))
      );
      return profiles.filter(Boolean);
    } catch (e) {
      console.error('[userService] getBlockedUsers error:', e);
      return [];
    }
  },

  isBlocked: async (currentUid, targetUid) => {
    try {
      if (!currentUid || !targetUid) return false;
      const ref = doc(db, 'blocked', currentUid, 'blockedUsers', targetUid);
      const snap = await getDoc(ref);
      return snap.exists();
    } catch {
      return false;
    }
  },

  // ── Account Deletion Cascade ──────────────────────────
  deleteUserData: async (uid, username) => {
    try {
      if (!uid) throw new Error('User ID required for account deletion.');

      // 1. Delete user's posts
      try {
        const postsQ = query(collection(db, 'posts'), where('authorId', '==', uid));
        const postsSnap = await getDocs(postsQ);
        const batchPosts = writeBatch(db);
        postsSnap.forEach((d) => batchPosts.delete(d.ref));
        await batchPosts.commit();
      } catch (err) {
        console.warn('[userService] Failed cleaning posts:', err);
      }

      // 2. Delete user's reels / klyps
      try {
        const reelsQ = query(collection(db, 'reels'), where('authorId', '==', uid));
        const reelsSnap = await getDocs(reelsQ);
        const batchReels = writeBatch(db);
        reelsSnap.forEach((d) => batchReels.delete(d.ref));
        await batchReels.commit();
      } catch (err) {
        console.warn('[userService] Failed cleaning reels:', err);
      }

      // 3. Delete user's stories
      try {
        const storiesQ = query(collection(db, 'stories'), where('authorId', '==', uid));
        const storiesSnap = await getDocs(storiesQ);
        const batchStories = writeBatch(db);
        storiesSnap.forEach((d) => batchStories.delete(d.ref));
        await batchStories.commit();
      } catch (err) {
        console.warn('[userService] Failed cleaning stories:', err);
      }

      // 4. Delete user's blocked accounts list
      try {
        const blockedQ = collection(db, 'blocked', uid, 'blockedUsers');
        const blockedSnap = await getDocs(blockedQ);
        const batchBlocked = writeBatch(db);
        blockedSnap.forEach((d) => batchBlocked.delete(d.ref));
        await batchBlocked.commit();
      } catch (err) {
        console.warn('[userService] Failed cleaning blocked users:', err);
      }

      // 5. Release username reservation
      if (username) {
        try {
          const uDocRef = doc(db, 'usernames', username.toLowerCase().trim());
          await deleteDoc(uDocRef);
        } catch (err) {
          console.warn('[userService] Failed deleting username index:', err);
        }
      }

      // 6. Delete user profile document
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);

      return true;
    } catch (e) {
      console.error('[userService] deleteUserData error:', e);
      throw e;
    }
  },
};
