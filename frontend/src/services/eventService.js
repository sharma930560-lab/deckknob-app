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
  createEvent: async (currentUid, username, title, venue, dateTimeStr, websiteUrl, description, mediaUrl) => {
    try {
      const eventsRef = collection(db, 'events');
      const newEventRef = doc(eventsRef);
      
      const parsedDate = new Date(dateTimeStr || Date.now());
      const dateStr = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = parsedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      const eventData = {
        id: newEventRef.id,
        authorId: currentUid,
        username: username, // For own profile filter / compatibility
        title,
        venue,
        date: dateStr,
        time: timeStr,
        image: mediaUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
        description: description || '',
        url: websiteUrl || '',
        lineup: [],
        attendees: [],
        createdAt: serverTimestamp()
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
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const events = [];
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() });
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
        attendees: isAttending ? arrayUnion(uid) : arrayRemove(uid)
      });
    } catch (e) {
      console.error('[eventService] rsvpEvent error:', e);
      throw e;
    }
  }
};
