import { create } from 'zustand';
import { authService, formatAuthError } from '../services/authService';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';

const authStore = create((set, get) => ({
  // State: single authoritative user
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  // Actions
  setUser: (user) => set({ 
    user: user ? { uid: user.uid, ...user } : null, 
    isAuthenticated: !!user,
    isLoading: false 
  }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Initialize auth
  initializeAuth: () => {
    return new Promise((resolve) => {
      set({ isLoading: true });
      const unsubscribe = authService.onAuthChange((user) => {
        if (user) {
          const normalized = { uid: user.uid, ...user };
          set({ 
            user: normalized, 
            isAuthenticated: true, 
            isLoading: false 
          });
          resolve(normalized);
        } else {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          resolve(null);
        }
      });
    });
  },

  // Login
  login: async (usernameOrEmail, password) => {
    try {
      set({ isLoading: true, error: null });
      const firebaseUser = await authService.signInWithEmail(usernameOrEmail, password);
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const profileData = userSnap.exists() ? userSnap.data() : {};
      const user = { uid: firebaseUser.uid, email: firebaseUser.email, emailVerified: firebaseUser.emailVerified, ...profileData };

      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return user;
    } catch (error) {
      const friendlyMessage = formatAuthError(error);
      set({ error: friendlyMessage, isLoading: false });
      throw new Error(friendlyMessage);
    }
  },

  // Login with Google
  loginWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });
      const firebaseUser = await authService.signInWithGoogle();
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const profileData = userSnap.exists() ? userSnap.data() : {};
      const user = { uid: firebaseUser.uid, email: firebaseUser.email, emailVerified: firebaseUser.emailVerified, ...profileData };

      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return user;
    } catch (error) {
      const friendlyMessage = formatAuthError(error);
      set({ error: friendlyMessage, isLoading: false });
      throw new Error(friendlyMessage);
    }
  },

  // Register (single account per email)
  register: async (username, email, password, role = 'fan', name = '') => {
    try {
      set({ isLoading: true, error: null });
      const firebaseUser = await authService.signUpWithEmail(email, password, username, role, name);
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const profileData = userSnap.exists() ? userSnap.data() : {};
      const user = { uid: firebaseUser.uid, email: firebaseUser.email, emailVerified: firebaseUser.emailVerified, ...profileData };

      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return user;
    } catch (error) {
      const friendlyMessage = formatAuthError(error);
      set({ error: friendlyMessage, isLoading: false });
      throw new Error(friendlyMessage);
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const activeUid = auth.currentUser?.uid || get().user?.uid;
      if (!activeUid) {
        throw new Error('User not logged in.');
      }
      
      const userDocRef = doc(db, 'users', activeUid);
      const currentUser = get().user || {};
      
      // Handle username change
      if (data.username && data.username !== currentUser.username) {
        const newUsername = data.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        const newUsernameRef = doc(db, 'usernames', newUsername);
        const checkSnap = await getDoc(newUsernameRef);
        
        if (checkSnap.exists()) {
          throw new Error('Username is already taken.');
        }

        // Set the new username mapping
        await setDoc(newUsernameRef, { uid: activeUid });

        // Delete old username mapping if it existed
        if (currentUser.username) {
          const oldUsernameRef = doc(db, 'usernames', currentUser.username.toLowerCase());
          await deleteDoc(oldUsernameRef);
        }
        
        data.username = newUsername;
      }

      // Sync both profilePic and profile_pic for Web and Android parity
      if (data.profilePic !== undefined && data.profile_pic === undefined) {
        data.profile_pic = data.profilePic;
      } else if (data.profile_pic !== undefined && data.profilePic === undefined) {
        data.profilePic = data.profile_pic;
      }

      // Clean undefined fields
      const cleanData = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          cleanData[key] = data[key];
        }
      });
      cleanData.updatedAt = serverTimestamp();

      await updateDoc(userDocRef, cleanData);
      
      const userSnap = await getDoc(userDocRef);
      const updatedUser = { uid: activeUid, ...userSnap.data() };

      set({ 
        user: updatedUser, 
        isLoading: false 
      });
      return updatedUser;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    await authService.signOut();
    set({ user: null, isAuthenticated: false, error: null });
  },
}));

export default authStore;
