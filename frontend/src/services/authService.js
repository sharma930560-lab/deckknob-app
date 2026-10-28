import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { normalizeEmail } from '../utils/passwordPolicy';

const googleProvider = new GoogleAuthProvider();

export function formatAuthError(error) {
  if (!error) return 'An error occurred. Please try again.';
  const code = error.code || '';
  
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account may already exist for this email. Please log in or recover your password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 12 characters with uppercase, lowercase, numbers, and symbols.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid username/email or password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/expired-action-code':
      return 'This password reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This link is invalid or has already been used. Please request a new link.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

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
      email: normalizeEmail(user.email),
      name: additionalData.name || user.displayName || username || '',
      role: additionalData.role || 'fan',
      profilePic: user.photoURL || '',
      profile_pic: user.photoURL || '',
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
    await setDoc(doc(db, 'usernames', profile.username.toLowerCase()), { uid: user.uid });
    return profile;
  }
  
  return userSnap.data();
};

export const authService = {
  // Sign up with email
  signUpWithEmail: async (email, password, username, role = 'fan', name = '') => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error('Valid email address is required.');
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');

    // 1. Check username reservation in Firestore
    const usernameDocRef = doc(db, 'usernames', cleanUsername);
    const usernameSnap = await getDoc(usernameDocRef);
    if (usernameSnap.exists()) {
      throw new Error('Username is already taken. Please choose another.');
    }

    // 2. Authoritative creation via Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    // 3. Send email verification
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('[authService] Could not send initial verification email:', e);
    }

    // 4. Create authoritative Firestore profile
    try {
      await ensureUserProfile(user, { username: cleanUsername, role, name });
    } catch (profileError) {
      console.error('[authService] Profile creation failed after user auth:', profileError);
      // Profile can be re-established on next login via ensureUserProfile
    }

    return user;
  },

  // Sign in with email or username
  signInWithEmail: async (usernameOrEmail, password) => {
    let email = normalizeEmail(usernameOrEmail);

    // If identifier doesn't contain '@', look up email from usernames index
    if (!usernameOrEmail.includes('@')) {
      const cleanUsername = usernameOrEmail.toLowerCase().trim();
      const usernameDocRef = doc(db, 'usernames', cleanUsername);
      const usernameSnap = await getDoc(usernameDocRef);
      if (usernameSnap.exists()) {
        const uid = usernameSnap.data().uid;
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists() && userSnap.data().email) {
          email = normalizeEmail(userSnap.data().email);
        } else {
          throw new Error('User profile record not found.');
        }
      } else {
        throw new Error('Invalid username/email or password.');
      }
    }

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

  // Request password reset email
  resetPassword: async (email) => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) throw new Error('Please enter a valid email address.');
    await sendPasswordResetEmail(auth, cleanEmail);
  },

  // Verify password reset code from email link
  verifyResetCode: async (oobCode) => {
    if (!oobCode) throw new Error('Missing password reset verification code.');
    return await verifyPasswordResetCode(auth, oobCode);
  },

  // Confirm new password with reset code
  confirmNewPassword: async (oobCode, newPassword) => {
    if (!oobCode || !newPassword) throw new Error('Reset code and new password are required.');
    await confirmPasswordReset(auth, oobCode, newPassword);
  },

  // Send or resend email verification
  sendVerificationEmail: async (user = auth.currentUser) => {
    if (!user) throw new Error('No authenticated user session found.');
    await sendEmailVerification(user);
  },

  // Reload current user state to refresh emailVerified
  reloadUser: async (user = auth.currentUser) => {
    if (!user) return false;
    await user.reload();
    return user.emailVerified;
  },

  // Auth state listener subscription
  onAuthChange: (callback) => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          const profile = userSnap.exists() ? userSnap.data() : await ensureUserProfile(user);
          callback({ ...user, ...profile, emailVerified: user.emailVerified });
        } catch {
          callback(user);
        }
      } else {
        callback(null);
      }
    });
  }
};
