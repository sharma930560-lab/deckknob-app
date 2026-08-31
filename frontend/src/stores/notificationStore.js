import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import { auth } from '../config/firebase';

let unsubscribeNotifications = null;

const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isReconnecting: false,

  // Actions
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllRead: async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    // Optimistic local update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));

    try {
      await notificationService.markAllRead(currentUid);
    } catch (e) {
      console.error('[notificationStore] markAllRead error:', e);
    }
  },

  fetchNotifications: () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
      }
      set({ notifications: [], unreadCount: 0, isConnected: false });
      return;
    }

    if (unsubscribeNotifications) return; // Already subscribed

    set({ isConnected: true });
    unsubscribeNotifications = notificationService.subscribeNotifications(currentUid, (notifications) => {
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount, isConnected: true });
    });
  },

  setConnectionStatus: ({ isConnected, isReconnecting }) => {
    set({ isConnected, isReconnecting });
  },

  disconnectNotifications: () => {
    if (unsubscribeNotifications) {
      unsubscribeNotifications();
      unsubscribeNotifications = null;
    }
    set({ notifications: [], unreadCount: 0, isConnected: false });
  }
}));

export default useNotificationStore;
