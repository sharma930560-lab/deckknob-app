import type { FirestoreTimestamp } from './user';

/**
 * Notification — matches Firestore 'notifications' collection document shape.
 * Reverse-engineered from notificationService.js subscribeNotifications().
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  createdAt: FirestoreTimestamp | null;
  referenceId: string;
  fromUser: NotificationFromUser;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'event' | 'mention';

export interface NotificationFromUser {
  username: string;
  profile_pic: string;
}

/** Payload for creating a notification (used server-side by createNotification). */
export interface CreateNotificationPayload {
  targetUid: string;
  fromUid: string;
  fromUsername: string;
  fromAvatar: string;
  type: NotificationType;
  message: string;
  referenceId?: string;
}
