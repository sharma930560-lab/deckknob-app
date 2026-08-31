import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export const ensureUserProfile = async (user, additionalData = {}) => {
  const userDocRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userDocRef);
  
  if (!userSnap.exists()) {
    let username = additionalData.username;
    if (!username && user.email) {
      const base = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
      username = base;
      let count = 0;
      let isAvailable = false;
      while (!isAvailable && count < 10) {
        const testName = count === 0 ? username : `${username}${Math.floor(Math.random() * 1000)}`;
        const testDocSnap = await getDoc(doc(db, 'usernames', testName));
        if (!testDocSnap.exists()) {
          username = testName;
          isAvailable = true;
        }
        count++;
      }
    }
    
    const profile = {
      uid: user.uid,
      username: username || `user_${user.uid.substring(0, 5)}`,
      email: user.email,
      name: user.displayName || username || '',
      role: additionalData.role || 'fan',
      profilePic: user.photoURL || '',
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
    await setDoc(doc(db, 'usernames', profile.username), { uid: user.uid });
    return profile;
  }
  
  return userSnap.data();
};

export const authService = {
  // Sign up
  signUpWithEmail: async (email, password, username, role = 'fan') => {
    // 1. Check username availability first
    const usernameDocRef = doc(db, 'usernames', username.toLowerCase());
    const usernameSnap = await getDoc(usernameDocRef);
    if (usernameSnap.exists()) {
      throw new Error('Username is already taken.');
    }

    // 2. Create the user credential
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3. Send email verification
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not send verification email on signup:', e);
    }

    // 4. Create the Firestore profile
    await ensureUserProfile(user, { username, role });
    return user;
  },

  // Sign in
  signInWithEmail: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Google Sign-In
  signInWithGoogle: async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    await ensureUserProfile(user);
    return user;
  },

  // Sign out
  signOut: async () => {
    await firebaseSignOut(auth);
  },

  // Password reset
  resetPassword: async (email) => {
    await sendPasswordResetEmail(auth, email);
  },

  // Auth state listener subscription
  onAuthChange: (callback) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch full profile info from DB
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        const profile = userSnap.exists() ? userSnap.data() : await ensureUserProfile(user);
        callback({ ...user, ...profile });
      } else {
        callback(null);
      }
    });
  }
};
