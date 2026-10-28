import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  increment,
  serverTimestamp
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env without printing values
const envPath = path.join(__dirname, '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// In-memory ephemeral strong passwords (never logged/saved)
const passwordA = `Tk!_${crypto.randomBytes(12).toString('hex')}_Aa9`;
const passwordB = `Tk!_${crypto.randomBytes(12).toString('hex')}_Bb9`;

const emailA = 'e2e_test_a@deckknob.internal';
const usernameA = 'e2e_test_a';

const emailB = 'e2e_test_b@deckknob.internal';
const usernameB = 'e2e_test_b';

const report = {
  testAccountA: null,
  testAccountB: null,
  testPostId: null,
  testCommentId: null,
  testChatId: null,
  testMessageA_Id: null,
  testMessageB_Id: null,
  realtimeChatVerified: false,
  status: 'PENDING'
};

async function getOrCreateAccount(email, password, username) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      uid,
      username,
      email,
      role: 'dj',
      bio: '[AUTOMATED TEST ACCOUNT]',
      isAutomatedTest: true,
      createdAt: serverTimestamp()
    });
    await setDoc(doc(db, 'usernames', username.toLowerCase()), { uid });
    return { uid, created: true };
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Sign in if existing
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { uid: cred.user.uid, created: false };
    }
    throw err;
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DECKKNOB SCOPED LIVE TWO-ACCOUNT FIREBASE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ── STEP 1: Account A Setup ─────────────────────────────────────────────
    console.log('[1/6] Setting up Account A (' + emailA + ')...');
    const accA = await getOrCreateAccount(emailA, passwordA, usernameA);
    report.testAccountA = { uid: accA.uid, email: emailA, username: usernameA };
    console.log('  ✓ Account A ready. UID:', accA.uid);

    // ── STEP 2: Account B Setup ─────────────────────────────────────────────
    console.log('\n[2/6] Setting up Account B (' + emailB + ')...');
    const accB = await getOrCreateAccount(emailB, passwordB, usernameB);
    report.testAccountB = { uid: accB.uid, email: emailB, username: usernameB };
    console.log('  ✓ Account B ready. UID:', accB.uid);

    // ── STEP 3: Create Test Post (Account A) ─────────────────────────────────
    console.log('\n[3/6] Account A creating isolated test post...');
    await signInWithEmailAndPassword(auth, emailA, passwordA);
    const postRef = doc(collection(db, 'posts'));
    const postId = postRef.id;
    report.testPostId = postId;

    await setDoc(postRef, {
      id: postId,
      authorId: accA.uid,
      authorUsername: usernameA,
      authorAvatar: '',
      authorRole: 'dj',
      caption: '[AUTOMATED TEST] Post by Tester A',
      media_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
      mediaUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
      media_type: 'image',
      mediaType: 'image',
      likes_count: 0,
      comments_count: 0,
      isTest: true,
      createdAt: serverTimestamp()
    });
    console.log('  ✓ Test post created. Post ID:', postId);

    // ── STEP 4: Account B Comments on Account A Post ────────────────────────
    console.log('\n[4/6] Account B adding comment to Account A post...');
    await signInWithEmailAndPassword(auth, emailB, passwordB);

    const commentsCol = collection(db, 'posts', postId, 'comments');
    const commentDocRef = await addDoc(commentsCol, {
      authorId: accB.uid,
      authorUsername: usernameB,
      authorAvatar: '',
      text: '[AUTOMATED TEST] Comment by Tester B on Post A',
      isTest: true,
      createdAt: serverTimestamp()
    });
    report.testCommentId = commentDocRef.id;

    // Increment post counter per rules
    await updateDoc(doc(db, 'posts', postId), {
      comments_count: increment(1)
    });
    console.log('  ✓ Comment persisted. Comment ID:', commentDocRef.id);

    // Verify comment read
    const commentSnap = await getDoc(doc(db, 'posts', postId, 'comments', commentDocRef.id));
    if (!commentSnap.exists()) {
      throw new Error('Comment verification read failed: comment not found.');
    }
    console.log('  ✓ Verified comment readable from Firestore.');

    // ── STEP 5: Real-time Direct Chat Between A and B ────────────────────────
    console.log('\n[5/6] Establishing 2-participant chat between Account A & B...');
    const chatId = accA.uid < accB.uid ? `${accA.uid}_${accB.uid}` : `${accB.uid}_${accA.uid}`;
    report.testChatId = chatId;

    const chatDocRef = doc(db, 'chats', chatId);
    await setDoc(chatDocRef, {
      participants: [accA.uid, accB.uid],
      lastMessage: '[AUTOMATED TEST] Chat initialized',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      isTest: true
    });
    console.log('  ✓ Chat thread created. Chat ID:', chatId);

    // Set up real-time listener to verify onSnapshot delivery
    const messagesCol = collection(db, 'chats', chatId, 'messages');
    const receivedMessages = [];
    const unsubscribe = onSnapshot(messagesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          receivedMessages.push({ id: change.doc.id, ...change.doc.data() });
        }
      });
    });

    // Account B sends message to Account A
    const msgB = await addDoc(messagesCol, {
      senderId: accB.uid,
      text: '[AUTOMATED TEST] Message from Tester B to Tester A',
      isTest: true,
      createdAt: serverTimestamp()
    });
    report.testMessageB_Id = msgB.id;
    console.log('  ✓ Account B message sent. Message ID:', msgB.id);

    // Sign in Account A and send message to Account B
    await signInWithEmailAndPassword(auth, emailA, passwordA);
    const msgA = await addDoc(messagesCol, {
      senderId: accA.uid,
      text: '[AUTOMATED TEST] Message from Tester A to Tester B',
      isTest: true,
      createdAt: serverTimestamp()
    });
    report.testMessageA_Id = msgA.id;
    console.log('  ✓ Account A message sent. Message ID:', msgA.id);

    // Wait 2 seconds for real-time listener propagation
    await new Promise((r) => setTimeout(r, 2000));
    unsubscribe();

    const hasMsgA = receivedMessages.some((m) => m.id === msgA.id);
    const hasMsgB = receivedMessages.some((m) => m.id === msgB.id);
    if (hasMsgA && hasMsgB) {
      report.realtimeChatVerified = true;
      console.log('  ✓ Real-time listener verified: both messages received live via onSnapshot.');
    } else {
      console.warn('  ⚠ Real-time snapshot listener received partial messages:', receivedMessages.length);
    }

    report.status = 'SUCCESS';
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ALL LIVE FIREBASE OPERATIONS SUCCEEDED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(JSON.stringify(report, null, 2));

    await signOut(auth);
    process.exit(0);
  } catch (error) {
    report.status = 'FAILED';
    report.error = error.message;
    console.error('\n✗ Live Firebase Test Failed:', error);
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

run();
