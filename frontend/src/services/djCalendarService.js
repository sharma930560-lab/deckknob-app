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
  serverTimestamp
} from 'firebase/firestore';
import { userService } from './userService';

export const djCalendarService = {
  /**
   * Fetch DJ Calendar privacy settings
   * Defaults to 'private' (Only Me)
   */
  getCalendarSettings: async (djUid) => {
    try {
      if (!djUid) return { privacy: 'private', djUid: '' };
      const settingsRef = doc(db, 'djCalendars', djUid);
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          privacy: data.privacy || 'private', // 'private' | 'followers' | 'public'
          djUid: data.djUid || djUid,
          updatedAt: data.updatedAt
        };
      }
      return { privacy: 'private', djUid };
    } catch (e) {
      console.error('[djCalendarService] getCalendarSettings error:', e);
      return { privacy: 'private', djUid };
    }
  },

  /**
   * Update DJ Calendar privacy settings (Owner only)
   */
  updateCalendarSettings: async (djUid, settings, currentUid) => {
    try {
      if (!djUid || !currentUid || currentUid !== djUid) {
        throw new Error('Unauthorized: Only the DJ calendar owner can update privacy settings.');
      }
      const allowedPrivacy = ['private', 'followers', 'public'];
      const targetPrivacy = allowedPrivacy.includes(settings.privacy) ? settings.privacy : 'private';

      const settingsRef = doc(db, 'djCalendars', djUid);
      await setDoc(
        settingsRef,
        {
          privacy: targetPrivacy,
          djUid,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      return { success: true, privacy: targetPrivacy };
    } catch (e) {
      console.error('[djCalendarService] updateCalendarSettings error:', e);
      throw e;
    }
  },

  /**
   * Retrieve Calendar entries with fail-closed privacy verification
   * Strips private notes and checks follower status when not owner.
   */
  getCalendarEntries: async (djUid, viewerUid, followerStatusOverride = null) => {
    try {
      if (!djUid) return { status: 'empty', entries: [], privacy: 'private' };

      const settings = await djCalendarService.getCalendarSettings(djUid);
      const isOwner = viewerUid && viewerUid === djUid;

      // 1. Owner always has full access
      if (isOwner) {
        const entriesRef = collection(db, 'djCalendars', djUid, 'entries');
        const q = query(entriesRef, orderBy('date', 'asc'));
        const snap = await getDocs(q);
        const entries = [];
        snap.forEach((d) => {
          entries.push({ id: d.id, ...d.data() });
        });
        return {
          status: 'authorized',
          isOwner: true,
          privacy: settings.privacy,
          entries
        };
      }

      // 2. Private calendar: Non-owners cannot see entries
      if (settings.privacy === 'private') {
        return {
          status: 'restricted',
          reason: 'private',
          privacy: 'private',
          isOwner: false,
          entries: []
        };
      }

      // 3. Followers Only calendar: Verify follow status
      let isFollower = false;
      if (followerStatusOverride !== null) {
        isFollower = Boolean(followerStatusOverride);
      } else if (viewerUid) {
        isFollower = await userService.isFollowing(viewerUid, djUid);
      }

      if (settings.privacy === 'followers' && !isFollower) {
        return {
          status: 'restricted',
          reason: 'followers_only',
          privacy: 'followers',
          isOwner: false,
          entries: []
        };
      }

      // 4. Authorized follower or public calendar: Fetch and sanitize
      const entriesRef = collection(db, 'djCalendars', djUid, 'entries');
      const q = query(entriesRef, orderBy('date', 'asc'));
      const snap = await getDocs(q);
      const sanitizedEntries = [];

      snap.forEach((d) => {
        const data = d.data();
        const entryVisibility = data.visibility || 'private';

        // Filter out private entries from non-owners
        if (entryVisibility === 'private') return;

        // If public calendar and viewer is NOT follower, entry must be 'public'
        if (settings.privacy === 'public' && !isFollower && entryVisibility !== 'public') {
          return;
        }

        // SANITIZATION: Never leak private notes or rider info to non-owners
        sanitizedEntries.push({
          id: d.id,
          djUid: data.djUid,
          title: data.title,
          entryType: data.entryType || 'gig',
          date: data.date,
          startTime: data.startTime || '',
          endTime: data.endTime || '',
          venue: data.venue || '',
          city: data.city || '',
          visibility: entryVisibility,
          linkedEventId: data.linkedEventId || null,
          createdAt: data.createdAt,
          // Explicitly omit notes / internal info
          isSanitized: true
        });
      });

      return {
        status: 'authorized',
        isOwner: false,
        privacy: settings.privacy,
        entries: sanitizedEntries
      };
    } catch (e) {
      console.error('[djCalendarService] getCalendarEntries error:', e);
      // Fail closed
      return { status: 'error', reason: e.message, privacy: 'private', entries: [] };
    }
  },

  /**
   * Add a new calendar entry (Owner only)
   */
  addCalendarEntry: async (djUid, entryData, currentUid) => {
    try {
      if (!djUid || !currentUid || currentUid !== djUid) {
        throw new Error('Unauthorized: Only the DJ calendar owner can add calendar entries.');
      }
      if (!entryData.title || !entryData.date) {
        throw new Error('Title and date are required for calendar entries.');
      }

      const entriesRef = collection(db, 'djCalendars', djUid, 'entries');
      const newDocRef = doc(entriesRef);

      const payload = {
        id: newDocRef.id,
        djUid,
        title: entryData.title.trim(),
        entryType: entryData.entryType || 'gig', // 'gig' | 'tentative' | 'personal'
        date: entryData.date, // 'YYYY-MM-DD'
        startTime: entryData.startTime || '',
        endTime: entryData.endTime || '',
        venue: (entryData.venue || '').trim(),
        city: (entryData.city || '').trim(),
        notes: (entryData.notes || '').trim(), // Private notes
        visibility: entryData.visibility || 'private', // 'private' | 'followers' | 'public'
        linkedEventId: entryData.linkedEventId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(newDocRef, payload);
      return { id: newDocRef.id, ...payload };
    } catch (e) {
      console.error('[djCalendarService] addCalendarEntry error:', e);
      throw e;
    }
  },

  /**
   * Update an existing calendar entry (Owner only)
   */
  updateCalendarEntry: async (djUid, entryId, entryData, currentUid) => {
    try {
      if (!djUid || !currentUid || currentUid !== djUid) {
        throw new Error('Unauthorized: Only the DJ calendar owner can update calendar entries.');
      }
      const entryRef = doc(db, 'djCalendars', djUid, 'entries', entryId);

      const updatePayload = {
        title: entryData.title.trim(),
        entryType: entryData.entryType || 'gig',
        date: entryData.date,
        startTime: entryData.startTime || '',
        endTime: entryData.endTime || '',
        venue: (entryData.venue || '').trim(),
        city: (entryData.city || '').trim(),
        notes: (entryData.notes || '').trim(),
        visibility: entryData.visibility || 'private',
        linkedEventId: entryData.linkedEventId || null,
        updatedAt: serverTimestamp()
      };

      await updateDoc(entryRef, updatePayload);
      return { id: entryId, ...updatePayload };
    } catch (e) {
      console.error('[djCalendarService] updateCalendarEntry error:', e);
      throw e;
    }
  },

  /**
   * Delete a calendar entry (Owner only)
   * Note: Deleting a calendar entry NEVER deletes a linked public event.
   */
  deleteCalendarEntry: async (djUid, entryId, currentUid) => {
    try {
      if (!djUid || !currentUid || currentUid !== djUid) {
        throw new Error('Unauthorized: Only the DJ calendar owner can delete calendar entries.');
      }
      const entryRef = doc(db, 'djCalendars', djUid, 'entries', entryId);
      await deleteDoc(entryRef);
      return { success: true, id: entryId };
    } catch (e) {
      console.error('[djCalendarService] deleteCalendarEntry error:', e);
      throw e;
    }
  }
};

