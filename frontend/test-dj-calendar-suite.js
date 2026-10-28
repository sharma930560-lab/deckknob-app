/**
 * DECKKNOB DJ Calendar & Follow-Only Privacy Test Suite
 */

import assert from 'assert';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  DECKKNOB DJ CALENDAR & PRIVACY ACCEPTANCE SUITE');
console.log('═══════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    failCount++;
  }
}

// In-memory simulation of the DJ Calendar security engine
function createMockCalendarStore() {
  const settings = new Map(); // djUid -> { privacy: 'private' | 'followers' | 'public', djUid }
  const entries = new Map(); // djUid -> [ entries ]
  const follows = new Set(); // `${followerUid}_${targetUid}`
  const publicEvents = new Map(); // eventId -> event

  return {
    setFollow: (followerUid, targetUid, isFollowing) => {
      const key = `${followerUid}_${targetUid}`;
      if (isFollowing) follows.add(key);
      else follows.delete(key);
    },
    isFollowing: (followerUid, targetUid) => follows.has(`${followerUid}_${targetUid}`),
    
    getSettings: (djUid) => {
      return settings.get(djUid) || { privacy: 'private', djUid };
    },
    updateSettings: (djUid, newSettings, callerUid) => {
      if (callerUid !== djUid) throw new Error('Unauthorized');
      settings.set(djUid, { privacy: newSettings.privacy || 'private', djUid });
    },
    
    addEntry: (djUid, entryData, callerUid) => {
      if (callerUid !== djUid) throw new Error('Unauthorized');
      const list = entries.get(djUid) || [];
      const newEntry = { id: `entry_${Date.now()}_${Math.random()}`, djUid, ...entryData };
      list.push(newEntry);
      entries.set(djUid, list);
      return newEntry;
    },
    
    deleteEntry: (djUid, entryId, callerUid) => {
      if (callerUid !== djUid) throw new Error('Unauthorized');
      const list = entries.get(djUid) || [];
      entries.set(djUid, list.filter(e => e.id !== entryId));
      return true;
    },

    getEntries: (djUid, viewerUid) => {
      const djSettings = settings.get(djUid) || { privacy: 'private', djUid };
      const isOwner = viewerUid && viewerUid === djUid;

      // 1. Owner always has full access with private notes
      if (isOwner) {
        return {
          status: 'authorized',
          isOwner: true,
          privacy: djSettings.privacy,
          entries: entries.get(djUid) || []
        };
      }

      // 2. Private calendar: Fail closed
      if (djSettings.privacy === 'private') {
        return {
          status: 'restricted',
          reason: 'private',
          privacy: 'private',
          isOwner: false,
          entries: []
        };
      }

      const userFollows = viewerUid ? follows.has(`${viewerUid}_${djUid}`) : false;

      // 3. Followers Only: verify follow relationship
      if (djSettings.privacy === 'followers' && !userFollows) {
        return {
          status: 'restricted',
          reason: 'followers_only',
          privacy: 'followers',
          isOwner: false,
          entries: []
        };
      }

      // 4. Authorized follower or public: sanitize & filter
      const rawList = entries.get(djUid) || [];
      const sanitized = [];

      for (const e of rawList) {
        const vis = e.visibility || 'private';
        if (vis === 'private') continue;
        if (djSettings.privacy === 'public' && !userFollows && vis !== 'public') continue;

        // Omit private rider/notes
        sanitized.push({
          id: e.id,
          djUid: e.djUid,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          venue: e.venue,
          city: e.city,
          entryType: e.entryType,
          visibility: vis,
          linkedEventId: e.linkedEventId || null,
          isSanitized: true
        });
      }

      return {
        status: 'authorized',
        isOwner: false,
        privacy: djSettings.privacy,
        entries: sanitized
      };
    },

    addPublicEvent: (event) => publicEvents.set(event.id, event),
    getPublicEvent: (id) => publicEvents.get(id)
  };
}

// ── Test Cases ─────────────────────────────────────────────────────────────

test('1. Default calendar privacy for newly initialized DJ is "private" (Only Me)', () => {
  const store = createMockCalendarStore();
  const settings = store.getSettings('dj_charlotte');
  assert.strictEqual(settings.privacy, 'private');
});

test('2. Owner can add confirmed gig, tentative hold, and personal schedule entry with confidential notes', () => {
  const store = createMockCalendarStore();
  const gig = store.addEntry('dj_charlotte', {
    title: 'Berghain Headline',
    date: '2026-11-15',
    startTime: '02:00',
    endTime: '06:00',
    venue: 'Berghain / Panorama Bar',
    city: 'Berlin',
    entryType: 'gig',
    notes: 'Hospitality rider: Club-Mate & Pioneer CDJ-3000s; contact Klaus +49...',
    visibility: 'followers'
  }, 'dj_charlotte');

  const result = store.getEntries('dj_charlotte', 'dj_charlotte');
  assert.strictEqual(result.status, 'authorized');
  assert.strictEqual(result.entries.length, 1);
  assert.ok(result.entries[0].notes.includes('Hospitality rider'));
});

test('3. Non-owner / unrelated user receives restricted "private" status and 0 entries when calendar is private', () => {
  const store = createMockCalendarStore();
  store.addEntry('dj_charlotte', {
    title: 'Secret Warehouse Rave',
    date: '2026-11-20',
    visibility: 'followers'
  }, 'dj_charlotte');

  const result = store.getEntries('dj_charlotte', 'random_user_123');
  assert.strictEqual(result.status, 'restricted');
  assert.strictEqual(result.reason, 'private');
  assert.strictEqual(result.entries.length, 0);
});

test('4. When calendar is "followers", verified follower can view entries but private notes are strictly stripped', () => {
  const store = createMockCalendarStore();
  store.updateSettings('dj_charlotte', { privacy: 'followers' }, 'dj_charlotte');
  store.addEntry('dj_charlotte', {
    title: 'Fabric London All-Nighter',
    date: '2026-12-05',
    venue: 'Fabric',
    city: 'London',
    entryType: 'gig',
    notes: 'Private backstage code: 8492. Fee: 5000 EUR.',
    visibility: 'followers'
  }, 'dj_charlotte');

  store.setFollow('fan_dan', 'dj_charlotte', true);
  const result = store.getEntries('dj_charlotte', 'fan_dan');
  assert.strictEqual(result.status, 'authorized');
  assert.strictEqual(result.entries.length, 1);
  assert.strictEqual(result.entries[0].title, 'Fabric London All-Nighter');
  assert.strictEqual(result.entries[0].notes, undefined); // Strictly omitted
  assert.strictEqual(result.entries[0].isSanitized, true);
});

test('5. Non-follower receives restricted "followers_only" status when calendar is "followers"', () => {
  const store = createMockCalendarStore();
  store.updateSettings('dj_charlotte', { privacy: 'followers' }, 'dj_charlotte');
  store.addEntry('dj_charlotte', {
    title: 'Fabric London All-Nighter',
    date: '2026-12-05',
    visibility: 'followers'
  }, 'dj_charlotte');

  const result = store.getEntries('dj_charlotte', 'unfollowed_user');
  assert.strictEqual(result.status, 'restricted');
  assert.strictEqual(result.reason, 'followers_only');
  assert.strictEqual(result.entries.length, 0);
});

test('6. Unfollowing a DJ revokes subsequent calendar access immediately', () => {
  const store = createMockCalendarStore();
  store.updateSettings('dj_charlotte', { privacy: 'followers' }, 'dj_charlotte');
  store.setFollow('fan_dan', 'dj_charlotte', true);

  let result = store.getEntries('dj_charlotte', 'fan_dan');
  assert.strictEqual(result.status, 'authorized');

  // Unfollow
  store.setFollow('fan_dan', 'dj_charlotte', false);
  result = store.getEntries('dj_charlotte', 'fan_dan');
  assert.strictEqual(result.status, 'restricted');
  assert.strictEqual(result.reason, 'followers_only');
});

test('7. Switching calendar from "followers" back to "private" revokes follower access immediately', () => {
  const store = createMockCalendarStore();
  store.updateSettings('dj_charlotte', { privacy: 'followers' }, 'dj_charlotte');
  store.setFollow('fan_dan', 'dj_charlotte', true);

  assert.strictEqual(store.getEntries('dj_charlotte', 'fan_dan').status, 'authorized');

  store.updateSettings('dj_charlotte', { privacy: 'private' }, 'dj_charlotte');
  const result = store.getEntries('dj_charlotte', 'fan_dan');
  assert.strictEqual(result.status, 'restricted');
  assert.strictEqual(result.reason, 'private');
});

test('8. Individual entry marked "private" remains hidden from followers even on a "followers" calendar', () => {
  const store = createMockCalendarStore();
  store.updateSettings('dj_charlotte', { privacy: 'followers' }, 'dj_charlotte');
  store.setFollow('fan_dan', 'dj_charlotte', true);

  store.addEntry('dj_charlotte', {
    title: 'Personal Studio Rehearsal',
    date: '2026-11-10',
    visibility: 'private' // Owner marked this entry private
  }, 'dj_charlotte');

  store.addEntry('dj_charlotte', {
    title: 'Public Festival Slot',
    date: '2026-11-12',
    visibility: 'followers'
  }, 'dj_charlotte');

  const result = store.getEntries('dj_charlotte', 'fan_dan');
  assert.strictEqual(result.entries.length, 1);
  assert.strictEqual(result.entries[0].title, 'Public Festival Slot');
});

test('9. Deleting a calendar entry does not delete a linked public event', () => {
  const store = createMockCalendarStore();
  store.addPublicEvent({ id: 'pub_event_42', title: 'Awakenings 2026', venue: 'Gashouder' });
  
  const entry = store.addEntry('dj_charlotte', {
    title: 'Awakenings Slot',
    date: '2026-10-31',
    linkedEventId: 'pub_event_42'
  }, 'dj_charlotte');

  store.deleteEntry('dj_charlotte', entry.id, 'dj_charlotte');
  
  // Verify calendar entry is deleted
  const calResult = store.getEntries('dj_charlotte', 'dj_charlotte');
  assert.strictEqual(calResult.entries.length, 0);

  // Verify public event in /events remains completely untouched!
  const publicEv = store.getPublicEvent('pub_event_42');
  assert.ok(publicEv);
  assert.strictEqual(publicEv.title, 'Awakenings 2026');
});

test('10. Non-owner cannot update calendar settings or delete calendar entries', () => {
  const store = createMockCalendarStore();
  assert.throws(() => {
    store.updateSettings('dj_charlotte', { privacy: 'public' }, 'malicious_user');
  }, /Unauthorized/);

  const entry = store.addEntry('dj_charlotte', { title: 'Gig' }, 'dj_charlotte');
  assert.throws(() => {
    store.deleteEntry('dj_charlotte', entry.id, 'malicious_user');
  }, /Unauthorized/);
});

// ── FIRESTORE SECURITY RULES EVALUATOR TEST SUITE ──────────────────────────
console.log('\n───────────────────────────────────────────────────────────────');
console.log('  PROPOSED FIRESTORE SECURITY RULES VERIFICATION (/djCalendars)');
console.log('───────────────────────────────────────────────────────────────\n');

/**
 * Exact simulation of the proposed Firestore security rules for:
 * match /djCalendars/{djUid}
 * match /djCalendars/{djUid}/entries/{entryId}
 */
function evaluateFirestoreCalendarRules({
  path,
  operation,
  auth,
  calendarDoc,
  entryDoc,
  followerSet
}) {
  const isAuthenticated = auth !== null && !!auth.uid;
  const isOwner = (uid) => isAuthenticated && auth.uid === uid;
  const isFollower = (djUid) => isAuthenticated && followerSet.has(`${djUid}_${auth.uid}`);

  const matchCalendar = path.match(/^\/djCalendars\/([^\/]+)$/);
  const matchEntry = path.match(/^\/djCalendars\/([^\/]+)\/entries\/([^\/]+)$/);

  if (matchCalendar) {
    const djUid = matchCalendar[1];
    if (operation === 'read') {
      return isAuthenticated; // Authenticated users can inspect calendar privacy status
    }
    if (operation === 'write') {
      return isOwner(djUid); // Only owner can write calendar settings
    }
    return false;
  }

  if (matchEntry) {
    const djUid = matchEntry[1];
    if (operation === 'write') {
      return isOwner(djUid); // Only owner can write entries
    }
    if (operation === 'read') {
      if (isOwner(djUid)) return true;
      if (!isAuthenticated) return false;
      if (!calendarDoc || calendarDoc.privacy === 'private') return false;
      if (!entryDoc || entryDoc.visibility === 'private') return false;

      // Follower access
      if (
        ['followers', 'public'].includes(calendarDoc.privacy) &&
        ['followers', 'public'].includes(entryDoc.visibility) &&
        isFollower(djUid)
      ) {
        return true;
      }

      // Public access
      if (
        calendarDoc.privacy === 'public' &&
        entryDoc.visibility === 'public'
      ) {
        return true;
      }

      return false;
    }
    return false;
  }

  return false;
}

test('11. [Rule Test] Owner has full read and write access to /djCalendars/{djUid}', () => {
  const auth = { uid: 'dj_carl' };
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'private' },
    followerSet: new Set()
  });
  const canWrite = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl',
    operation: 'write',
    auth,
    calendarDoc: { privacy: 'private' },
    followerSet: new Set()
  });
  assert.strictEqual(canRead, true);
  assert.strictEqual(canWrite, true);
});

test('12. [Rule Test] Non-owner write to /djCalendars/{djUid} is strictly DENIED', () => {
  const auth = { uid: 'attacker_1' };
  const canWrite = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl',
    operation: 'write',
    auth,
    calendarDoc: { privacy: 'private' },
    followerSet: new Set()
  });
  assert.strictEqual(canWrite, false);
});

test('13. [Rule Test] Owner has full read and write access to /djCalendars/{djUid}/entries/{entryId} even if marked private', () => {
  const auth = { uid: 'dj_carl' };
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/e1',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'private' },
    entryDoc: { visibility: 'private', title: 'Studio Rehearsal' },
    followerSet: new Set()
  });
  const canWrite = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/e1',
    operation: 'write',
    auth,
    calendarDoc: { privacy: 'private' },
    entryDoc: { visibility: 'private', title: 'Studio Rehearsal' },
    followerSet: new Set()
  });
  assert.strictEqual(canRead, true);
  assert.strictEqual(canWrite, true);
});

test('14. [Rule Test] Non-owner write to /djCalendars/{djUid}/entries/{entryId} is strictly DENIED', () => {
  const auth = { uid: 'fan_dan' };
  const followers = new Set(['dj_carl_fan_dan']);
  const canWrite = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/e1',
    operation: 'write',
    auth,
    calendarDoc: { privacy: 'followers' },
    entryDoc: { visibility: 'followers' },
    followerSet: followers
  });
  assert.strictEqual(canWrite, false);
});

test('15. [Rule Test] Verified follower reading followers-visible entry when calendar is "followers" is ALLOWED', () => {
  const auth = { uid: 'fan_dan' };
  const followers = new Set(['dj_carl_fan_dan']);
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/e1',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'followers' },
    entryDoc: { visibility: 'followers', title: 'Club Space Miami' },
    followerSet: followers
  });
  assert.strictEqual(canRead, true);
});

test('16. [Rule Test] Non-follower reading followers-visible entry when calendar is "followers" is DENIED', () => {
  const auth = { uid: 'stranger_bob' };
  const followers = new Set(['dj_carl_fan_dan']);
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/e1',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'followers' },
    entryDoc: { visibility: 'followers', title: 'Club Space Miami' },
    followerSet: followers
  });
  assert.strictEqual(canRead, false);
});

test('17. [Rule Test] Verified follower reading entry when calendar is "private" is DENIED (fail-closed)', () => {
  const auth = { uid: 'fan_dan' };
  const followers = new Set(['dj_carl_fan_dan']);
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/e1',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'private' },
    entryDoc: { visibility: 'followers' },
    followerSet: followers
  });
  assert.strictEqual(canRead, false);
});

test('18. [Rule Test] Verified follower reading individual "private" entry on "followers" calendar is DENIED', () => {
  const auth = { uid: 'fan_dan' };
  const followers = new Set(['dj_carl_fan_dan']);
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/secret_gig',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'followers' },
    entryDoc: { visibility: 'private' },
    followerSet: followers
  });
  assert.strictEqual(canRead, false);
});

test('19. [Rule Test] Public viewer reading public entry when calendar is "public" is ALLOWED', () => {
  const auth = { uid: 'stranger_bob' };
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/festival_slot',
    operation: 'read',
    auth,
    calendarDoc: { privacy: 'public' },
    entryDoc: { visibility: 'public' },
    followerSet: new Set()
  });
  assert.strictEqual(canRead, true);
});

test('20. [Rule Test] Unauthenticated request attempting to read any calendar entries is DENIED', () => {
  const canRead = evaluateFirestoreCalendarRules({
    path: '/djCalendars/dj_carl/entries/festival_slot',
    operation: 'read',
    auth: null,
    calendarDoc: { privacy: 'public' },
    entryDoc: { visibility: 'public' },
    followerSet: new Set()
  });
  assert.strictEqual(canRead, false);
});

console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
if (failCount > 0) process.exit(1);

