/**
 * Mobile auth store — TypeScript port of frontend/src/stores/authStore.js.
 *
 * Key differences from web:
 * - Full TypeScript with UserProfile types from @shared
 * - Uses mobile firebase.ts (initializeAuth + AsyncStorage persistence)
 * - Google Sign-In is NOT available in pure Expo Go (requires dev build)
 *   — the signInWithGoogle action is stubbed and will throw
 * - signInWithPopup is browser-only; mobile would use expo-auth-session for Google OAuth
 */
import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UserProfile } from '@shared/types/user';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  initializeAuth: () => () => void;
  login: (usernameOrEmail: string, password: string) => Promise<UserProfile>;
  register: (
    username: string,
    email: string,
    password: string,
    role?: string
  ) => Promise<UserProfile>;
  updateProfile: (data: Partial<UserProfile>) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ensure a Firestore user profile exists, creating one if not.
 * Mirrors authService.js ensureUserProfile() from the web.
 */
async function ensureUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  additionalData: Partial<UserProfile> = {}
): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    let username = additionalData.username;
    if (!username && email) {
      username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
    username = username || `user_${uid.substring(0, 5)}`;

    const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid,
      username,
      email,
      name: displayName || username,
      role: additionalData.role || 'fan',
      profilePic: photoURL || '',
      bio: '',
      genre: '',
      city: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      isOnline: true,
    };

    await setDoc(userDocRef, profile);
    await setDoc(doc(db, 'usernames', username), { uid });
    return profile as unknown as UserProfile;
  }

  return userSnap.data() as UserProfile;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const authStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  /**
   * Subscribe to Firebase auth state. Call this once in the root component.
   * Returns the unsubscribe function.
   */
  initializeAuth: () => {
    set({ isLoading: true });
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userSnap.exists()) {
            set({
              user: { uid: firebaseUser.uid, ...userSnap.data() } as UserProfile,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            const profile = await ensureUserProfile(
              firebaseUser.uid,
              firebaseUser.email,
              firebaseUser.displayName,
              firebaseUser.photoURL
            );
            set({ user: profile, isAuthenticated: true, isLoading: false });
          }
        } catch {
          set({
            user: { uid: firebaseUser.uid, email: firebaseUser.email } as unknown as UserProfile,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    });
    return unsubscribe;
  },

  login: async (usernameOrEmail, password) => {
    try {
      set({ isLoading: true, error: null });

      let email = usernameOrEmail;
      if (!usernameOrEmail.includes('@')) {
        const usernameSnap = await getDoc(
          doc(db, 'usernames', usernameOrEmail.toLowerCase().trim())
        );
        if (!usernameSnap.exists()) throw new Error('Username not found.');
        const uid = usernameSnap.data().uid;
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) throw new Error('User profile not found.');
        email = (userSnap.data() as UserProfile).email || '';
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userSnap = await getDoc(doc(db, 'users', credential.user.uid));
      const user = { uid: credential.user.uid, ...userSnap.data() } as UserProfile;
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Login failed.';
      set({ error: msg, isLoading: false });
      throw error;
    }
  },

  register: async (username, email, password, role = 'fan') => {
    try {
      set({ isLoading: true, error: null });

      // Check username availability
      const usernameSnap = await getDoc(
        doc(db, 'usernames', username.toLowerCase())
      );
      if (usernameSnap.exists()) throw new Error('Username is already taken.');

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = credential.user;

      try {
        await sendEmailVerification(firebaseUser);
      } catch {
        // Non-critical — continue
      }

      const profile = await ensureUserProfile(
        firebaseUser.uid,
        email,
        null,
        null,
        { username: username.toLowerCase(), role: role as UserProfile['role'] }
      );

      set({ user: profile, isAuthenticated: true, isLoading: false });
      return profile;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Registration failed.';
      set({ error: msg, isLoading: false });
      throw error;
    }
  },

  updateProfile: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const currentUser = get().user;
      if (!currentUser?.uid) throw new Error('Not logged in.');

      const userDocRef = doc(db, 'users', currentUser.uid);

      if (data.username && data.username !== currentUser.username) {
        const newUsername = data.username.toLowerCase().trim().replace(/\s/g, '_');
        const checkSnap = await getDoc(doc(db, 'usernames', newUsername));
        if (checkSnap.exists()) throw new Error('Username is already taken.');

        await setDoc(doc(db, 'usernames', newUsername), { uid: currentUser.uid });
        if (currentUser.username) {
          await deleteDoc(doc(db, 'usernames', currentUser.username.toLowerCase()));
        }
        data = { ...data, username: newUsername };
      }

      const cleanData: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined) cleanData[k] = v;
      });
      cleanData.updatedAt = serverTimestamp();

      await updateDoc(userDocRef, cleanData);
      const userSnap = await getDoc(userDocRef);
      const updatedUser = { uid: currentUser.uid, ...userSnap.data() } as UserProfile;
      set({ user: updatedUser, isLoading: false });
      return updatedUser;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Update failed.';
      set({ error: msg, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },

  logout: async () => {
    await firebaseSignOut(auth);
    set({ user: null, isAuthenticated: false, error: null });
  },
}));

export default authStore;
