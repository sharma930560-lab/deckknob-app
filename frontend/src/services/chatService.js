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
  serverTimestamp
} from 'firebase/firestore';

export const chatService = {
  subscribeChats: (uid, callback) => {
    try {
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', uid),
        orderBy('lastMessageAt', 'desc')
      );
      
      return onSnapshot(q, (snapshot) => {
        const chats = [];
        snapshot.forEach((docSnap) => {
          chats.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(chats);
      });
    } catch (e) {
      console.error('[chatService] subscribeChats error:', e);
      return () => {};
    }
  },

  createChat: async (uid1, uid2) => {
    try {
      const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [uid1, uid2],
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }
      return chatId;
    } catch (e) {
      console.error('[chatService] createChat error:', e);
      throw e;
    }
  },

  sendMessage: async (chatId, senderId, text) => {
    try {
      const msgRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(msgRef, {
        senderId,
        text,
        createdAt: serverTimestamp()
      });
      
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[chatService] sendMessage error:', e);
      throw e;
    }
  },

  subscribeMessages: (chatId, callback) => {
    try {
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
      });
    } catch (e) {
      console.error('[chatService] subscribeMessages error:', e);
      return () => {};
    }
  }
};
