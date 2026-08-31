import { db, auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const authAPI = {
  // Check username availability
  checkUsername: async (username) => {
    try {
      if (!username || username.trim().length < 3) {
        return { available: false, suggestions: [] };
      }
      
      const name = username.toLowerCase().trim().replace(/\s/g, '_');
      const docRef = doc(db, 'usernames', name);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { available: true, suggestions: [] };
      }
      
      // Generate suggestions
      const suggestions = [];
      const suffixes = ['_dj', '_beats', '_groove', 'music', '_underground', '_mix'];
      for (const suffix of suffixes) {
        const candidate = `${name}${suffix}`;
        const candRef = doc(db, 'usernames', candidate);
        const candSnap = await getDoc(candRef);
        if (!candSnap.exists()) {
          suggestions.push(candidate);
        }
        if (suggestions.length >= 3) break;
      }
      
      // Fallback suggestions if we don't have 3 yet
      let retries = 0;
      while (suggestions.length < 3 && retries < 10) {
        const candidate = `${name}${Math.floor(Math.random() * 1000)}`;
        const candRef = doc(db, 'usernames', candidate);
        const candSnap = await getDoc(candRef);
        if (!candSnap.exists() && !suggestions.includes(candidate)) {
          suggestions.push(candidate);
        }
        retries++;
      }
      
      return { available: false, suggestions };
    } catch (e) {
      console.error('[authUtils] checkUsername error:', e);
      return { available: false, suggestions: [] };
    }
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Get stored token (promise)
export const getToken = async () => {
  if (!auth.currentUser) return null;
  return await auth.currentUser.getIdToken();
};
