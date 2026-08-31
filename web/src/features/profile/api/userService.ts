import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/core/firebase/config';
import { UserProfile } from '@/features/auth/types';

export const userService = {
  searchUsers: async (searchText: string): Promise<UserProfile[]> => {
    try {
      const qText = searchText.toLowerCase().trim();
      if (!qText) return [];
      
      const q = query(
        collection(db, 'users'),
        where('username', '>=', qText),
        where('username', '<=', qText + '\uf8ff'),
        limit(20)
      );
      
      const snap = await getDocs(q);
      const users: UserProfile[] = [];
      snap.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      return users;
    } catch (e) {
      console.error('[userService] searchUsers error:', e);
      return [];
    }
  }
};
