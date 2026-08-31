import type { FirestoreTimestamp } from './user';

/**
 * Chat — matches Firestore 'chats' collection document shape.
 * Reverse-engineered from chatService.js subscribeChats() and createChat().
 */
export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp | null;
}

/**
 * Message — Firestore subcollection 'chats/{chatId}/messages'.
 * Reverse-engineered from chatService.js subscribeMessages().
 */
export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: FirestoreTimestamp | null;
}
