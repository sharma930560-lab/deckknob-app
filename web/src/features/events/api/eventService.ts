import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/core/firebase/config';

export const eventService = {
  createEvent: async (
    uid: string,
    title: string,
    venue: string,
    dateTime: string,
    website: string,
    description: string,
    bannerUrl: string
  ) => {
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        uid,
        title,
        venue,
        dateTime,
        website,
        description,
        bannerUrl,
        interestedCount: 0,
        goingCount: 0,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (e) {
      console.error('[eventService] createEvent error:', e);
      throw e;
    }
  },

  getEvents: async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(15));
      const snap = await getDocs(q);
      const events: any[] = [];
      snap.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      return events;
    } catch (e) {
      console.error('[eventService] getEvents error:', e);
      return [];
    }
  }
};
