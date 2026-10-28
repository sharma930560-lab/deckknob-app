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
  serverTimestamp,
  deleteDoc,
  onSnapshot
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

      const rawStartDateTime = eventPayload.startDateTime || eventPayload.dateTime || eventPayload.dateTimeStr || eventPayload.date || Date.now();
      const parsedStartDate = new Date(rawStartDateTime);
      const isValidStartDate = !isNaN(parsedStartDate.getTime());

      // Optional or explicit end datetime
      const rawEndDateTime = eventPayload.endDateTime || (isValidStartDate ? new Date(parsedStartDate.getTime() + 4 * 3600 * 1000).toISOString() : new Date().toISOString());
      const parsedEndDate = new Date(rawEndDateTime);
      const isValidEndDate = !isNaN(parsedEndDate.getTime());

      const dateStr = isValidStartDate
        ? parsedStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : (eventPayload.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

      const timeStr = isValidStartDate
        ? parsedStartDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : (eventPayload.time || '10:00 PM');

      const endTimeStr = isValidEndDate
        ? parsedEndDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : '02:00 AM';

      const bannerImage = eventPayload.image || eventPayload.mediaUrl || eventPayload.media_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900&q=80';

      const venueName = eventPayload.venue || eventPayload.venueName || 'TBA';
      const address = eventPayload.address || eventPayload.formattedAddress || eventPayload.city || 'Local Scene';

      // Directions URL generator (Google Maps / OpenStreetMap fallback)
      const directionsUrl = eventPayload.directionsUrl || (
        eventPayload.latitude && eventPayload.longitude
          ? `https://www.google.com/maps/dir/?api=1&destination=${eventPayload.latitude},${eventPayload.longitude}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venueName}, ${address}`)}`
      );

      const eventData = {
        id: newEventRef.id,
        authorId: eventPayload.authorId || eventPayload.currentUid || '',
        username: eventPayload.username || eventPayload.authorUsername || '',
        title: eventPayload.title || 'Untitled Event',
        eventType: eventPayload.eventType || 'Club', // Club, Festival, Private Party, Concert, Other
        venue: venueName,
        venueName: venueName,
        address: address,
        city: eventPayload.city || address,
        date: dateStr,
        time: timeStr,
        endTime: endTimeStr,
        startDateTimeIso: isValidStartDate ? parsedStartDate.toISOString() : new Date().toISOString(),
        endDateTimeIso: isValidEndDate ? parsedEndDate.toISOString() : new Date().toISOString(),
        dateTimeIso: isValidStartDate ? parsedStartDate.toISOString() : new Date().toISOString(),
        timezone: eventPayload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        latitude: typeof eventPayload.latitude === 'number' ? eventPayload.latitude : (parseFloat(eventPayload.latitude) || null),
        longitude: typeof eventPayload.longitude === 'number' ? eventPayload.longitude : (parseFloat(eventPayload.longitude) || null),
        placeId: eventPayload.placeId || null,
        directionsUrl,
        image: bannerImage,
        media_url: bannerImage,
        description: eventPayload.description || eventPayload.caption || '',
        url: eventPayload.ticketUrl || eventPayload.website || eventPayload.url || '',
        ticketUrl: eventPayload.ticketUrl || eventPayload.website || eventPayload.url || '',
        organizerContact: eventPayload.organizerContact || '',
        status: eventPayload.status || 'scheduled', // 'scheduled' | 'cancelled'
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

  /**
   * Update an existing event (Owner only).
   */
  updateEvent: async (eventId, updates, currentUid) => {
    try {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Event not found.');

      const existingData = docSnap.data();
      if (existingData.authorId !== currentUid) {
        throw new Error('Unauthorized: You can only edit your own events.');
      }

      const cleanUpdates = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      // Recalculate directionsUrl if coordinates or venue changed
      if (cleanUpdates.latitude && cleanUpdates.longitude) {
        cleanUpdates.directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${cleanUpdates.latitude},${cleanUpdates.longitude}`;
      } else if (cleanUpdates.venue || cleanUpdates.address) {
        const v = cleanUpdates.venue || existingData.venue;
        const a = cleanUpdates.address || existingData.address;
        cleanUpdates.directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v}, ${a}`)}`;
      }

      await updateDoc(docRef, cleanUpdates);
      return { id: eventId, ...existingData, ...cleanUpdates };
    } catch (e) {
      console.error('[eventService] updateEvent error:', e);
      throw e;
    }
  },

  /**
   * Cancel an event (Owner only, sets status to 'cancelled' without deleting).
   */
  cancelEvent: async (eventId, currentUid) => {
    try {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Event not found.');

      if (docSnap.data().authorId !== currentUid) {
        throw new Error('Unauthorized: You can only cancel your own events.');
      }

      const auditEntry = {
        action: 'CANCEL',
        actorUid: currentUid,
        timestamp: new Date().toISOString(),
        source: 'manual_cancel',
      };

      await updateDoc(docRef, {
        status: 'cancelled',
        auditTrail: arrayUnion(auditEntry),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      console.error('[eventService] cancelEvent error:', e);
      throw e;
    }
  },

  /**
   * Move an event to Trash (soft delete).
   * Verifies owner identity, records audit metadata, and hides from public calendar.
   */
  trashEvent: async (eventId, currentUid, reason = 'manual_delete') => {
    try {
      if (!currentUid) throw new Error('Authenticated user ID required.');
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Event not found.');

      const existingData = docSnap.data();
      if (existingData.authorId !== currentUid) {
        throw new Error('Unauthorized: You can only delete your own events.');
      }

      // Idempotent: already trashed
      if (existingData.status === 'trashed') {
        return { id: eventId, ...existingData };
      }

      const deletedAt = new Date().toISOString();
      const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const auditEntry = {
        action: 'TRASH',
        actorUid: currentUid,
        timestamp: deletedAt,
        source: reason,
        eventTitle: existingData.title || 'Untitled',
      };

      await updateDoc(docRef, {
        status: 'trashed',
        deletedAt,
        deletedBy: currentUid,
        deletionReason: reason,
        purgeAfter,
        auditTrail: arrayUnion(auditEntry),
        updatedAt: serverTimestamp(),
      });

      // Record in local audit trail log
      try {
        const raw = localStorage.getItem('dk_event_audit_trail');
        const logs = raw ? JSON.parse(raw) : [];
        logs.unshift({ ...auditEntry, eventId });
        localStorage.setItem('dk_event_audit_trail', JSON.stringify(logs.slice(0, 100)));
      } catch {}

      return { id: eventId, ...existingData, status: 'trashed', deletedAt, deletedBy: currentUid };
    } catch (e) {
      console.error('[eventService] trashEvent error:', e);
      throw e;
    }
  },

  /**
   * Restore a trashed event back to active calendar.
   */
  restoreEvent: async (eventId, currentUid) => {
    try {
      if (!currentUid) throw new Error('Authenticated user ID required.');
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Event not found.');

      const existingData = docSnap.data();
      if (existingData.authorId !== currentUid) {
        throw new Error('Unauthorized: You can only restore your own events.');
      }

      const restoredAt = new Date().toISOString();
      const auditEntry = {
        action: 'RESTORE',
        actorUid: currentUid,
        timestamp: restoredAt,
        source: 'trash_restore',
        eventTitle: existingData.title || 'Untitled',
      };

      await updateDoc(docRef, {
        status: 'scheduled',
        deletedAt: null,
        deletedBy: null,
        deletionReason: null,
        purgeAfter: null,
        restoredAt,
        auditTrail: arrayUnion(auditEntry),
        updatedAt: serverTimestamp(),
      });

      // Update local audit log
      try {
        const raw = localStorage.getItem('dk_event_audit_trail');
        const logs = raw ? JSON.parse(raw) : [];
        logs.unshift({ ...auditEntry, eventId });
        localStorage.setItem('dk_event_audit_trail', JSON.stringify(logs.slice(0, 100)));
      } catch {}

      return { id: eventId, ...existingData, status: 'scheduled', deletedAt: null };
    } catch (e) {
      console.error('[eventService] restoreEvent error:', e);
      throw e;
    }
  },

  /**
   * Permanently delete an event from Firestore (second confirmation required).
   */
  permanentlyDeleteEvent: async (eventId, currentUid) => {
    try {
      if (!currentUid) throw new Error('Authenticated user ID required.');
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Event not found.');

      const existingData = docSnap.data();
      if (existingData.authorId !== currentUid) {
        throw new Error('Unauthorized: You can only permanently delete your own events.');
      }

      const auditEntry = {
        action: 'PERMANENT_DELETE',
        actorUid: currentUid,
        timestamp: new Date().toISOString(),
        source: 'trash_permanent_delete',
        eventId,
        eventTitle: existingData.title || 'Untitled',
      };

      await deleteDoc(docRef);

      try {
        const raw = localStorage.getItem('dk_event_audit_trail');
        const logs = raw ? JSON.parse(raw) : [];
        logs.unshift(auditEntry);
        localStorage.setItem('dk_event_audit_trail', JSON.stringify(logs.slice(0, 100)));
      } catch {}

      return true;
    } catch (e) {
      console.error('[eventService] permanentlyDeleteEvent error:', e);
      throw e;
    }
  },

  /**
   * Fetch all trashed events belonging to the current DJ.
   */
  getTrashedEvents: async (currentUid) => {
    try {
      if (!currentUid) return [];
      const q = query(
        collection(db, 'events'),
        where('authorId', '==', currentUid),
        where('status', '==', 'trashed')
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      return list;
    } catch (e) {
      console.error('[eventService] getTrashedEvents error:', e);
      // Fallback: in-memory filter if composite index is pending
      try {
        const allSnap = await getDocs(query(collection(db, 'events'), where('authorId', '==', currentUid)));
        const fallbackList = [];
        allSnap.forEach(docSnap => {
          const d = docSnap.data();
          if (d.status === 'trashed' || d.deletedAt) {
            fallbackList.push({ id: docSnap.id, ...d });
          }
        });
        return fallbackList;
      } catch {
        return [];
      }
    }
  },

  /**
   * Automatic event cleanup settings (Default: OFF).
   */
  getCleanupSettings: (currentUid) => {
    try {
      const stored = localStorage.getItem(`dk_cleanup_settings_${currentUid}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      autoCleanupEnabled: false,
      retentionDays: 7,
    };
  },

  updateCleanupSettings: (currentUid, settings) => {
    const payload = {
      autoCleanupEnabled: Boolean(settings?.autoCleanupEnabled),
      retentionDays: Number(settings?.retentionDays) || 7,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`dk_cleanup_settings_${currentUid}`, JSON.stringify(payload));
    } catch {}
    return payload;
  },

  /**
   * Run idempotent owner-triggered cleanup for events past end time + retention days.
   */
  runOwnerEventCleanup: async (currentUid, nowMs = Date.now()) => {
    try {
      if (!currentUid) return { executed: false, scanned: 0, trashed: 0, reason: 'unauthenticated' };
      const settings = eventService.getCleanupSettings(currentUid);
      if (!settings.autoCleanupEnabled) {
        return { executed: false, scanned: 0, trashed: 0, reason: 'cleanup_disabled' };
      }

      const q = query(collection(db, 'events'), where('authorId', '==', currentUid));
      const snapshot = await getDocs(q);
      const allEvents = [];
      snapshot.forEach(docSnap => {
        allEvents.push({ id: docSnap.id, ...docSnap.data() });
      });

      const eligibleToTrash = allEvents.filter(ev => {
        // Skip already trashed
        if (ev.status === 'trashed' || ev.deletedAt) return false;
        return isEventEligibleForAutoCleanup(ev, nowMs, settings.retentionDays);
      });

      const trashedResults = [];
      for (const ev of eligibleToTrash) {
        await eventService.trashEvent(ev.id, currentUid, `auto_cleanup_${settings.retentionDays}_days`);
        trashedResults.push(ev);
      }

      return {
        executed: true,
        scanned: allEvents.length,
        trashed: trashedResults.length,
        trashedEvents: trashedResults
      };
    } catch (e) {
      console.error('[eventService] runOwnerEventCleanup error:', e);
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
        const data = docSnap.data();
        // Hide trashed and soft-deleted events from public calendar
        if (data.status !== 'trashed' && !data.deletedAt) {
          events.push({ id: docSnap.id, ...data });
        }
      });

      // Sort client-side by start date / createdAt
      events.sort((a, b) => {
        const dateA = new Date(a.startDateTimeIso || a.dateTimeIso || 0).getTime();
        const dateB = new Date(b.startDateTimeIso || b.dateTimeIso || 0).getTime();
        if (dateA && dateB) return dateA - dateB;
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

  /**
   * Subscribe to real-time events updates via Firestore onSnapshot.
   */
  subscribeEvents: (onUpdate, onError) => {
    try {
      const q = collection(db, 'events');
      return onSnapshot(
        q,
        (snapshot) => {
          const events = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.status !== 'trashed' && !data.deletedAt) {
              events.push({ id: docSnap.id, ...data });
            }
          });
          events.sort((a, b) => {
            const timeA = new Date(a.startDateTimeIso || a.date || 0).getTime();
            const timeB = new Date(b.startDateTimeIso || b.date || 0).getTime();
            return timeB - timeA;
          });
          if (typeof onUpdate === 'function') {
            onUpdate(events);
          }
        },
        (err) => {
          console.error('[eventService] subscribeEvents snapshot error:', err);
          if (typeof onError === 'function') onError(err);
        }
      );
    } catch (e) {
      console.error('[eventService] subscribeEvents error:', e);
      return () => {};
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
        const data = docSnap.data();
        if (data.status !== 'trashed' && !data.deletedAt) {
          events.push({ id: docSnap.id, ...data });
        }
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

/**
 * Retention policy evaluator:
 * Calculates whether an event is 7+ days past its end datetime (preserving midnight crossing and timezone).
 */
export function isEventEligibleForAutoCleanup(event, now = Date.now(), retentionDays = 7) {
  let endTimeMs = 0;
  if (event.endDateTimeIso) {
    endTimeMs = new Date(event.endDateTimeIso).getTime();
  } else if (event.startDateTimeIso) {
    endTimeMs = new Date(event.startDateTimeIso).getTime() + 4 * 3600 * 1000;
  } else if (event.dateTime) {
    endTimeMs = new Date(event.dateTime).getTime() + 4 * 3600 * 1000;
  }

  if (!endTimeMs || isNaN(endTimeMs)) return false;

  const retentionPeriodMs = retentionDays * 24 * 60 * 60 * 1000;
  const purgeThreshold = endTimeMs + retentionPeriodMs;

  return now >= purgeThreshold;
}

