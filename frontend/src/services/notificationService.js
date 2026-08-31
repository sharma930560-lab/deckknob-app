import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

export const notificationService = {
  subscribeNotifications: (uid, callback) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('targetUid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const notifications = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notifications.push({
            id: docSnap.id,
            type: data.type,
            message: data.message,
            is_read: data.is_read ?? false,
            createdAt: data.createdAt,
            referenceId: data.referenceId,
            fromUser: {
              username: data.fromUsername,
              profile_pic: data.fromAvatar || `https://ui-avatars.com/api/?name=${data.fromUsername}&background=DFE104&color=000&bold=true`
            }
          });
        });
        callback(notifications);
      }, (error) => {
        console.error('[notificationService] subscribeNotifications error:', error);
      });
    } catch (e) {
      console.error('[notificationService] subscribeNotifications setup error:', e);
      return () => {};
    }
  },

  markAllRead: async (uid) => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('targetUid', '==', uid),
        where('is_read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;
      
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { is_read: true });
      });
      
      await batch.commit();
    } catch (e) {
      console.error('[notificationService] markAllRead error:', e);
    }
  },

  createNotification: async (targetUid, fromUid, fromUsername, fromAvatar, type, message, referenceId = '') => {
    try {
      if (targetUid === fromUid) return; // Don't notify self
      
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        targetUid,
        fromUid,
        fromUsername,
        fromAvatar: fromAvatar || '',
        type, // 'like' | 'comment' | 'follow' | 'event'
        message,
        referenceId,
        is_read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[notificationService] createNotification error:', e);
    }
  }
};
