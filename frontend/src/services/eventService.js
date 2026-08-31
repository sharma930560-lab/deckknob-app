import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';

export const eventService = {
  /**
   * Create an event in Firestore.
   * Supports both object options and legacy positional arguments.
   */
  createEvent: async (arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) => {
    try {
      let eventPayload = {};

      if (typeof arg1 === 'object' && arg1 !== null) {
        eventPayload = { ...arg1 };
      } else {
        // Positional args fallback
        eventPayload = {
          authorId: arg1,
          username: arg2,
          title: arg3,
          venue: arg4,
          dateTime: arg5,
          website: arg6,
          description: arg7,
          image: arg8,
        };
      }

      const eventsRef = collection(db, 'events');
      const newEventRef = doc(eventsRef);

      const rawDateTime = eventPayload.dateTime || eventPayload.dateTimeStr || eventPayload.date || Date.now();
      const parsedDate = new Date(rawDateTime);
      const isValidDate = !isNaN(parsedDate.getTime());

      const dateStr = isValidDate
        ? parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : (eventPayload.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

      const timeStr = isValidDate
        ? parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : (eventPayload.time || '10:00 PM');

      const bannerImage = eventPayload.image || eventPayload.mediaUrl || eventPayload.media_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80';

      const eventData = {
        id: newEventRef.id,
        authorId: eventPayload.authorId || eventPayload.currentUid || '',
        username: eventPayload.username || eventPayload.authorUsername || '',
        title: eventPayload.title || 'Untitled Event',
        venue: eventPayload.venue || 'TBA',
        city: eventPayload.city || 'Local Scene',
        date: dateStr,
        time: timeStr,
        dateTimeIso: isValidDate ? parsedDate.toISOString() : new Date().toISOString(),
        image: bannerImage,
        media_url: bannerImage,
        description: eventPayload.description || eventPayload.caption || '',
        url: eventPayload.website || eventPayload.url || eventPayload.websiteUrl || eventPayload.ticketUrl || '',
        ticketUrl: eventPayload.ticketUrl || eventPayload.website || eventPayload.url || '',
        venueWebsite: eventPayload.venueWebsite || eventPayload.website || '',
        lineup: Array.isArray(eventPayload.lineup) ? eventPayload.lineup : (eventPayload.username ? [eventPayload.username] : []),
        performingDJs: Array.isArray(eventPayload.performingDJs) ? eventPayload.performingDJs : (eventPayload.username ? [eventPayload.username] : []),
        attendees: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newEventRef, eventData);
      return eventData;
    } catch (e) {
      console.error('[eventService] createEvent error:', e);
      throw e;
    }
  },

  getEvents: async () => {
    try {
      let snapshot;
      try {
        const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
        snapshot = await getDocs(q);
      } catch {
        // Fallback without ordering in case index is pending
        snapshot = await getDocs(collection(db, 'events'));
      }

      const events = [];
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Sort client-side
      events.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      return events;
    } catch (e) {
      console.error('[eventService] getEvents error:', e);
      return [];
    }
  },

  getTodayEvents: async () => {
    try {
      const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const q = query(
        collection(db, 'events'),
        where('date', '==', todayStr)
      );

      const snapshot = await getDocs(q);
      const events = [];
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Fallback: If no event today, return all events
      if (events.length === 0) {
        return await eventService.getEvents();
      }
      return events;
    } catch (e) {
      console.error('[eventService] getTodayEvents error:', e);
      return [];
    }
  },

  getEventById: async (eventId) => {
    try {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (e) {
      console.error('[eventService] getEventById error:', e);
      return null;
    }
  },

  rsvpEvent: async (eventId, uid, isAttending) => {
    try {
      const docRef = doc(db, 'events', eventId);
      await updateDoc(docRef, {
        attendees: isAttending ? arrayUnion(uid) : arrayRemove(uid),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('[eventService] rsvpEvent error:', e);
      throw e;
    }
  }
};
