import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';

export const chatService = {
  subscribeChats: (uid, callback, onError) => {
    try {
      if (!uid) return () => {};
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', uid)
      );
      
      return onSnapshot(q, (snapshot) => {
        const chats = [];
        snapshot.forEach((docSnap) => {
          chats.push({ id: docSnap.id, ...docSnap.data() });
        });
        chats.sort((a, b) => {
          const tA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : (a.lastMessageAt?.seconds ? a.lastMessageAt.seconds * 1000 : 0);
          const tB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : (b.lastMessageAt?.seconds ? b.lastMessageAt.seconds * 1000 : 0);
          return tB - tA;
        });
        callback(chats);
      }, (err) => {
        console.warn('[chatService] subscribeChats snapshot error:', err);
        if (typeof onError === 'function') onError(err);
      });
    } catch (e) {
      console.error('[chatService] subscribeChats error:', e);
      if (typeof onError === 'function') onError(e);
      return () => {};
    }
  },

  createChat: async (uid1, uid2) => {
    try {
      if (!uid1 || !uid2) throw new Error('Valid user IDs are required to start a chat.');
      if (uid1 === uid2) throw new Error('Cannot start a chat with yourself.');

      // Check if current user has blocked target (allowed: reading own block collection)
      try {
        const isBlocked1 = await getDoc(doc(db, 'blocked', uid1, 'blockedUsers', uid2));
        if (isBlocked1.exists()) {
          throw new Error('Cannot start chat: you have blocked this user.');
        }
      } catch (err) {
        if (err.message?.includes('blocked')) throw err;
      }

      const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
      const chatRef = doc(db, 'chats', chatId);
      
      // Initialize or update chat document with merge: true
      // Firestore security rules enforce !isBlockedEitherWay on create & update
      await setDoc(chatRef, {
        participants: [uid1, uid2],
        updatedAt: serverTimestamp()
      }, { merge: true });

      return chatId;
    } catch (e) {
      console.error('[chatService] createChat error:', e);
      throw e;
    }
  },

  sendMessage: async (chatId, senderId, text) => {
    try {
      if (!chatId || !senderId || !text?.trim()) {
        throw new Error('Message text and sender are required.');
      }

      const chatRef = doc(db, 'chats', chatId);

      // Verify sender's own block list (allowed for own block subcollection)
      try {
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          const participants = chatSnap.data().participants || [];
          const otherUid = participants.find(id => id !== senderId);
          if (otherUid) {
            const isBlocked1 = await getDoc(doc(db, 'blocked', senderId, 'blockedUsers', otherUid));
            if (isBlocked1.exists()) {
              throw new Error('Message delivery blocked: communication restricted.');
            }
          }
        }
      } catch (err) {
        if (err.message?.includes('communication restricted')) throw err;
      }

      const msgRef = collection(db, 'chats', chatId, 'messages');
      const newMsg = await addDoc(msgRef, {
        senderId,
        text: text.trim(),
        createdAt: serverTimestamp()
      });
      
      await updateDoc(chatRef, {
        lastMessage: text.trim(),
        lastMessageAt: serverTimestamp(),
        lastSenderId: senderId,
        readBy: [senderId]
      });

      return newMsg.id;
    } catch (e) {
      console.error('[chatService] sendMessage error:', e);
      throw e;
    }
  },

  markChatRead: async (chatId, currentUid) => {
    try {
      if (!chatId || !currentUid) return;
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        readBy: arrayUnion(currentUid)
      });
    } catch (e) {
      console.warn('[chatService] markChatRead error:', e);
    }
  },

  subscribeMessages: (chatId, callback, onError) => {
    try {
      if (!chatId) return () => {};
      const q = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach((docSnap) => {
          messages.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(messages);
      }, (err) => {
        console.warn('[chatService] subscribeMessages error:', err);
        if (typeof onError === 'function') onError(err);
      });
    } catch (e) {
      console.error('[chatService] subscribeMessages error:', e);
      if (typeof onError === 'function') onError(e);
      return () => {};
    }
  }
};
