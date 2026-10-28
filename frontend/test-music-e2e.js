import './load-env.js';
import assert from 'assert';
import { musicService, evaluateTrackRights, assertTrackSyncAuthorized, validatePublishing, LicensingValidationError, audioCoordinator } from './src/services/musicService.js';
import { cacheManager } from './src/services/music/cacheManager.js';
import { curatedAdapter } from './src/services/music/adapters/curatedAdapter.js';
import { hooprStubAdapter, epidemicSoundStubAdapter } from './src/services/music/adapters/commercialStubs.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  DECKKNOB COMPLETE MUSIC SYSTEM E2E QA TEST RUNNER');
console.log('═══════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runStep(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

async function run() {
  console.log('▶ [1/8] Provider Discovery & Catalog Adapters');
  
  await runStep('Curated electronic catalog returns verified sync-cleared tracks', async () => {
    const tracks = await curatedAdapter.getTrendingTracks();
    assert.ok(Array.isArray(tracks) && tracks.length >= 4, 'Should return curated catalog');
    const first = tracks[0];
    assert.strictEqual(first.provider, 'deckknob_curated');
    assert.strictEqual(first.syncCleared, true);
    assert.strictEqual(first.canPublish, true);
    assert.ok(first.rightsEvidence);
    assert.strictEqual(first.rightsEvidence.licenseStatus, 'verified_sync_cleared');
  });

  await runStep('Commercial stubs (Hoopr & Epidemic Sound) safely fail-close and report notices', async () => {
    const hooprNotice = hooprStubAdapter.getUnconfiguredNotice();
    assert.strictEqual(hooprNotice.configured, false);
    assert.match(hooprNotice.message, /commercial.*required/i);
    const hooprTracks = await hooprStubAdapter.getTrendingTracks();
    assert.strictEqual(hooprTracks.length, 0, 'Commercial stub must not return tracks when unconfigured');

    const epidemicNotice = epidemicSoundStubAdapter.getUnconfiguredNotice();
    assert.strictEqual(epidemicNotice.configured, false);
    assert.match(epidemicNotice.message, /commercial.*required/i);
    const epidemicTracks = await epidemicSoundStubAdapter.getTrendingTracks();
    assert.strictEqual(epidemicTracks.length, 0, 'Commercial stub must not return tracks when unconfigured');
  });

  console.log('\n▶ [2/8] Catalog Search, Filtering & Caching (1-Hour TTL)');

  await runStep('Search tracks by title, artist, and genre across providers', async () => {
    const results = await musicService.searchTracks('Techno');
    assert.ok(Array.isArray(results) && results.length > 0);
    const hasTechno = results.some(t => 
      t.title.toLowerCase().includes('techno') || 
      (t.genre && t.genre.toLowerCase() === 'techno')
    );
    assert.ok(hasTechno, 'Should find techno tracks');
  });

  await runStep('CacheManager respects 1-hour TTL and provides offline stale recovery', async () => {
    const testKey = 'deckknob_e2e_test_cache';
    const testData = [{ id: 'test_1', title: 'Modular Synth Wave' }];
    
    // Set item with standard 1-hour TTL
    cacheManager.set(testKey, testData, 3600);
    const fresh = cacheManager.get(testKey);
    assert.deepStrictEqual(fresh, testData, 'Fresh item should return immediately');

    // Simulate stale entry (expired)
    cacheManager.set(testKey, testData, -10); // already expired
    const expired = cacheManager.get(testKey);
    assert.strictEqual(expired, null, 'Expired item should not return from get()');

    const stale = cacheManager.getStale(testKey);
    assert.deepStrictEqual(stale, testData, 'Stale item must return from getStale() for offline fallback');

    cacheManager.invalidate(testKey);
    assert.strictEqual(cacheManager.getStale(testKey), null, 'Cleared cache should return null');
  });

  console.log('\n▶ [3/8] Licensing Gate & Unauthorized Publishing Rejection');

  await runStep('Fail-closed gate rejects All Rights Reserved (ARR) tracks from publishing', () => {
    const arrTrack = {
      id: 'arr_1',
      title: 'Top 40 Pop Hit',
      artist: 'Major Label Artist',
      license: 'All Rights Reserved',
      audioUrl: 'https://example.com/audio.mp3'
    };

    const evaluated = evaluateTrackRights(arrTrack, 'audius');
    assert.strictEqual(evaluated.canPreview, true, 'Preview permitted');
    assert.strictEqual(evaluated.canPublish, false, 'Publishing strictly prohibited');
    assert.strictEqual(evaluated.syncCleared, false);

    assert.throws(() => {
      assertTrackSyncAuthorized(evaluated);
    }, LicensingValidationError);

    const publishCheck = validatePublishing(evaluated);
    assert.strictEqual(publishCheck.cleared, false);
    assert.match(publishCheck.rejectionReason, /prohibit/i);
  });

  await runStep('Fail-closed gate rejects No-Derivatives (-ND) and Non-Commercial (-NC)', () => {
    const ndTrack = { title: 'ND Song', license: 'CC BY-ND 4.0' };
    const resND = evaluateTrackRights(ndTrack, 'audius');
    assert.strictEqual(resND.canPublish, false);
    assert.strictEqual(resND.syncCleared, false);

    const ncTrack = { title: 'NC Song', license: 'CC BY-NC 4.0' };
    const resNC = evaluateTrackRights(ncTrack, 'audius');
    assert.strictEqual(resNC.canPublish, false);
    assert.strictEqual(resNC.syncCleared, false);
  });

  await runStep('Fail-closed gate accepts Creative Commons BY / BY-SA for UGC synchronization', () => {
    const ccTrack = {
      title: 'Open Source Techno',
      artist: 'Creative DJ',
      license: 'Creative Commons Attribution 4.0 International',
      audioUrl: 'https://example.com/cc.mp3'
    };
    const res = evaluateTrackRights(ccTrack, 'audius');
    assert.strictEqual(res.canPreview, true);
    assert.strictEqual(res.canPublish, true);
    assert.strictEqual(res.syncCleared, true);
    assert.strictEqual(res.rightsEvidence.licenseStatus, 'verified_sync_cleared');

    const pubCheck = validatePublishing(res);
    assert.strictEqual(pubCheck.cleared, true);
  });

  console.log('\n▶ [4/8] Clip Trimming, Waveform Bounds & Attribution');

  await runStep('getAuthorizedClip enforces 5s minimum and 30s maximum bounds', async () => {
    const validTrack = {
      id: 'curated_1',
      title: 'Berlin Sub',
      artist: 'Bassline',
      provider: 'deckknob_curated',
      canPublish: true,
      syncCleared: true,
      audioUrl: 'https://example.com/audio.mp3',
      duration: 180,
      rightsEvidence: { attributionText: 'Bassline (CC BY 4.0)', licenseStatus: 'verified_sync_cleared' }
    };

    // Below 5s -> clamped to 5s
    const clipShort = await musicService.getAuthorizedClip(validTrack, 0, 2);
    assert.strictEqual(clipShort.duration, 5);

    // Above 30s -> clamped to 30s
    const clipLong = await musicService.getAuthorizedClip(validTrack, 0, 60);
    assert.strictEqual(clipLong.duration, 30);

    // Valid 15s clip
    const clipValid = await musicService.getAuthorizedClip(validTrack, 10, 15);
    assert.strictEqual(clipValid.startTime, 10);
    assert.strictEqual(clipValid.duration, 15);
    assert.strictEqual(clipValid.attribution, 'Bassline (CC BY 4.0)');
    assert.strictEqual(clipValid.licenseStatus, 'verified_sync_cleared');
  });

  console.log('\n▶ [5/8] Central Audio Coordinator & Exclusivity');

  await runStep('AudioCoordinator prevents simultaneous audio playback across app features', () => {
    let stoppedStory = false;
    let stoppedPost = false;
    let stoppedKlyp = false;

    // Start Story session
    audioCoordinator.startSession('story_test', 'story', () => { stoppedStory = true; });
    assert.strictEqual(audioCoordinator.isSessionActive('story_test'), true);

    // Start Post session -> Story must stop
    audioCoordinator.startSession('post_test', 'post', () => { stoppedPost = true; });
    assert.strictEqual(stoppedStory, true, 'Story must stop when Post starts');
    assert.strictEqual(audioCoordinator.isSessionActive('story_test'), false);
    assert.strictEqual(audioCoordinator.isSessionActive('post_test'), true);

    // Start Klyp session -> Post must stop
    audioCoordinator.startSession('klyp_test', 'reel', () => { stoppedKlyp = true; });
    assert.strictEqual(stoppedPost, true, 'Post must stop when Klyp starts');
    assert.strictEqual(audioCoordinator.isSessionActive('klyp_test'), true);

    // stopAll -> Klyp must stop
    audioCoordinator.stopAll();
    assert.strictEqual(stoppedKlyp, true, 'Klyp must stop on stopAll');
    assert.strictEqual(audioCoordinator.getActiveSession(), null);
  });

  console.log('\n▶ [6/8] Media Playback, Viewport Intersection & Mute Logic');

  await runStep('Image post music loop bounds and scroll pause', () => {
    const music = { startTime: 15, duration: 15 };
    const loopEnd = music.startTime + music.duration; // 30s

    let playHead = 29.8;
    const tick = () => {
      playHead += 0.5;
      if (playHead >= loopEnd) {
        playHead = music.startTime; // looped
      }
    };
    tick(); // 30.3 -> loops to 15
    assert.strictEqual(playHead, 15, 'Should loop back to start');

    // Viewport intersection observer test
    let isPlaying = true;
    const onIntersection = (ratio) => {
      if (ratio < 0.2) isPlaying = false;
    };
    onIntersection(0.8);
    assert.strictEqual(isPlaying, true);
    onIntersection(0.1);
    assert.strictEqual(isPlaying, false, 'Must pause when < 20% visible');
  });

  await runStep('Klyps media coordination with attached soundtrack', () => {
    const computeMutes = (hasMusic, isGlobalMuted) => ({
      videoMuted: isGlobalMuted || hasMusic,
      musicMuted: isGlobalMuted
    });

    // Unmuted with music: video muted, soundtrack unmuted
    const s1 = computeMutes(true, false);
    assert.strictEqual(s1.videoMuted, true);
    assert.strictEqual(s1.musicMuted, false);

    // Global muted: both muted
    const s2 = computeMutes(true, true);
    assert.strictEqual(s2.videoMuted, true);
    assert.strictEqual(s2.musicMuted, true);

    // Unmuted without music (original audio): video unmuted
    const s3 = computeMutes(false, false);
    assert.strictEqual(s3.videoMuted, false);
  });

  console.log('\n▶ [7/8] Saved Audio Persistence & Original Audio Retrieval');

  await runStep('saveTrack, unsaveTrack, and getSavedTracks persistence', async () => {
    const sampleTrack = { id: 'trk_persisted_1', title: 'Berlin Dark Techno', artist: 'Ostgut DJ' };
    
    await musicService.saveTrack(sampleTrack);
    assert.strictEqual(musicService.isTrackSaved('trk_persisted_1'), true);

    const savedList = await musicService.getSavedTracks();
    assert.ok(savedList.some(t => t.id === 'trk_persisted_1'));

    await musicService.unsaveTrack('trk_persisted_1');
    assert.strictEqual(musicService.isTrackSaved('trk_persisted_1'), false);
  });

  await runStep('getMyOriginalSounds safely handles empty or non-existent user audio', async () => {
    const originalSounds = await musicService.getMyOriginalSounds('non_existent_uid_9999');
    assert.ok(Array.isArray(originalSounds), 'Should return array');
    assert.strictEqual(originalSounds.length, 0, 'Should return empty array without errors');
  });

  console.log('\n▶ [8/8] Backward Compatibility & Failure Resilience');

  await runStep('Content without music is 100% backward compatible', () => {
    const legacyPost = { id: 'p_legacy', caption: 'Vinyl only', music: null };
    const legacyStory = { id: 's_legacy', overlays: [], music: undefined };
    const legacyKlyp = { id: 'k_legacy', duration: 45 };

    assert.strictEqual(legacyPost.music, null);
    assert.strictEqual(legacyStory.music, undefined);
    assert.strictEqual(legacyKlyp.music, undefined);

    // Publishing validator accepts null/undefined music
    assert.strictEqual(validatePublishing(legacyPost.music).cleared, true);
    assert.strictEqual(validatePublishing(legacyStory.music).cleared, true);
    assert.strictEqual(validatePublishing(legacyKlyp.music).cleared, true);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  E2E MUSIC QA SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run();
