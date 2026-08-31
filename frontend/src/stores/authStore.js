import { create } from 'zustand';
import { authService } from '../services/authService';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';

const authStore = create((set, get) => ({
  // State
  user: null,
  accounts: [], // Array of sessions for compat: [{ user }]
  isLoading: true,
  error: null,
  isAuthenticated: false,

  // Actions
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user,
    accounts: user ? [{ user }] : [],
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
          set({ 
            user, 
            accounts: [{ user }], 
            isAuthenticated: true, 
            isLoading: false 
          });
        } else {
          set({ 
            user: null, 
            accounts: [], 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
        resolve(user);
      });
      // Stash unsubscribe function if needed, but standard auth state handles unmounts.
    });
  },

  // Login
  login: async (usernameOrEmail, password) => {
    try {
      set({ isLoading: true, error: null });
      
      let email = usernameOrEmail;
      if (!usernameOrEmail.includes('@')) {
        const usernameDocRef = doc(db, 'usernames', usernameOrEmail.toLowerCase().trim());
        const usernameSnap = await getDoc(usernameDocRef);
        if (usernameSnap.exists()) {
          const uid = usernameSnap.data().uid;
          const userDocRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            email = userSnap.data().email;
          } else {
            throw new Error('User profile record not found.');
          }
        } else {
          throw new Error('Username not found.');
        }
      }

      const firebaseUser = await authService.signInWithEmail(email, password);
      // Wait for auth state listener to populate user profile
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const user = userSnap.data();

      set({ 
        user, 
        accounts: [{ user }], 
        isAuthenticated: true, 
        isLoading: false 
      });
      return user;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Login with Google
  loginWithGoogle: async () => {
    try {
      set({ isLoading: true, error: null });
      const firebaseUser = await authService.signInWithGoogle();
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const user = userSnap.data();

      set({ 
        user, 
        accounts: [{ user }], 
        isAuthenticated: true, 
        isLoading: false 
      });
      return user;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Register
  register: async (username, email, password, role = 'fan', bio = '') => {
    try {
      set({ isLoading: true, error: null });
      const firebaseUser = await authService.signUpWithEmail(email, password, username, role);
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userDocRef);
      const user = userSnap.data();

      set({ 
        user, 
        accounts: [{ user }], 
        isAuthenticated: true, 
        isLoading: false 
      });
      return user;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const currentUser = get().user;
      if (!currentUser || !currentUser.uid) {
        throw new Error('User not logged in.');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      // Handle username change
      if (data.username && data.username !== currentUser.username) {
        const newUsername = data.username.toLowerCase().trim().replace(/\s/g, '_');
        const newUsernameRef = doc(db, 'usernames', newUsername);
        const checkSnap = await getDoc(newUsernameRef);
        
        if (checkSnap.exists()) {
          throw new Error('Username is already taken.');
        }

        // Set the new username mapping
        await setDoc(newUsernameRef, { uid: currentUser.uid });

        // Delete old username mapping if it existed
        if (currentUser.username) {
          const oldUsernameRef = doc(db, 'usernames', currentUser.username.toLowerCase());
          await deleteDoc(oldUsernameRef);
        }
        
        data.username = newUsername; // Ensure cleaned username is saved to user doc
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
      const updatedUser = userSnap.data();

      set({ 
        user: updatedUser, 
        accounts: [{ user: updatedUser }], 
        isLoading: false 
      });
      return updatedUser;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Switch active account session (Stubbed for single account)
  switchAccount: async (username) => {
    throw new Error('Multi-account switching is disabled under Firebase.');
  },

  // Logout current active account only
  logoutCurrent: async () => {
    await authService.signOut();
    set({ user: null, accounts: [], isAuthenticated: false, error: null });
  },

  // Logout all accounts
  logoutAll: async () => {
    await authService.signOut();
    set({ user: null, accounts: [], isAuthenticated: false, error: null });
  },

  // Default logout
  logout: async () => {
    await get().logoutAll();
  },
}));

export default authStore;
