/**
 * DECKKNOB Unified Music Service
 * Provider-independent interface orchestrating discovery, preview,
 * fail-closed licensing validation, client caching, and clip authorization.
 */

import axios from 'axios';
import { db, storage } from '../../config/firebase.js';
import { collection, doc, getDocs, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { audiusAdapter } from './adapters/audiusAdapter.js';
import { curatedAdapter } from './adapters/curatedAdapter.js';
import { hooprStubAdapter, epidemicSoundStubAdapter } from './adapters/commercialStubs.js';
import { evaluateTrackRights, assertTrackSyncAuthorized, LicensingValidationError } from './licensingGate.js';
import { cacheManager } from './cacheManager.js';
import { audioCoordinator } from './audioCoordinator.js';

// Cloudinary config for original creator sound uploads
const _env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {});
const _CLD_CLOUD = _env?.VITE_CLOUDINARY_CLOUD_NAME || '';
const _CLD_PRESET = _env?.VITE_CLOUDINARY_UPLOAD_PRESET || '';
const _CLD_READY = Boolean(_CLD_CLOUD && _CLD_PRESET);

// Registry of adapters
const ADAPTERS = {
  audius: audiusAdapter,
  deckknob_curated: curatedAdapter,
  hoopr: hooprStubAdapter,
  epidemic: epidemicSoundStubAdapter
};

export const unifiedMusicService = {
  LicensingValidationError,

  /**
   * List all known providers and their operational status
   */
  getProviders: () => [
    {
      id: 'deckknob_curated',
      name: 'DECKKNOB Curated (Royalty-Free Electronic)',
      status: 'active',
      isConfigured: true,
      description: 'Pre-cleared electronic, house, techno, ambient tracks with verified sync licenses.'
    },
    {
      id: 'audius',
      name: 'Audius Decentralized Catalog',
      status: 'active',
      isConfigured: true,
      description: 'Decentralized music network with real-time sync-rights filtering.'
    },
    {
      id: 'hoopr',
      name: 'Hoopr Commercial Sync',
      status: 'credentials_required',
      isConfigured: false,
      description: 'Commercial regional and electronic catalog (requires enterprise credentials).'
    },
    {
      id: 'epidemic',
      name: 'Epidemic Sound Commercial',
      status: 'credentials_required',
      isConfigured: false,
      description: 'Global commercial UGC sync library (requires enterprise credentials).'
    }
  ],

  /**
   * Search tracks across providers or for a specific provider
   */
  searchTracks: async (queryStr = '', filters = {}) => {
    const targetProvider = filters.provider;

    if (targetProvider && ADAPTERS[targetProvider]) {
      return ADAPTERS[targetProvider].searchTracks(queryStr, filters);
    }

    // Default: Aggregate Curated + Audius results
    try {
      const [curatedTracks, audiusTracks] = await Promise.all([
        curatedAdapter.searchTracks(queryStr, filters).catch(() => []),
        audiusAdapter.searchTracks(queryStr, filters).catch(() => [])
      ]);

      return [...curatedTracks, ...audiusTracks];
    } catch (err) {
      console.warn('[unifiedMusicService] searchTracks error, using curated fallback:', err);
      return curatedAdapter.searchTracks(queryStr, filters);
    }
  },

  /**
   * Get trending tracks
   */
  getTrendingTracks: async (provider = 'all') => {
    if (provider === 'deckknob_curated') return curatedAdapter.getTrendingTracks();
    if (provider === 'audius') return audiusAdapter.getTrendingTracks();

    try {
      const [curated, audius] = await Promise.all([
        curatedAdapter.getTrendingTracks().catch(() => []),
        audiusAdapter.getTrendingTracks().catch(() => [])
      ]);
      return [...curated, ...audius];
    } catch {
      return curatedAdapter.getTrendingTracks();
    }
  },

  /**
   * Get latest releases
   */
  getLatestTracks: async (provider = 'all') => {
    if (provider === 'deckknob_curated') return curatedAdapter.getLatestTracks();
    if (provider === 'audius') return audiusAdapter.getLatestTracks();

    try {
      const [curated, audius] = await Promise.all([
        curatedAdapter.getLatestTracks().catch(() => []),
        audiusAdapter.getLatestTracks().catch(() => [])
      ]);
      return [...curated, ...audius];
    } catch {
      return curatedAdapter.getLatestTracks();
    }
  },

  /**
   * Get full details of a specific track by ID
   */
  getTrackDetails: async (trackId, providerHint = null) => {
    if (!trackId) return null;

    if (trackId.startsWith('curated_') || providerHint === 'deckknob_curated') {
      return curatedAdapter.getTrackDetails(trackId);
    }
    if (trackId.startsWith('audius_') || providerHint === 'audius') {
      return audiusAdapter.getTrackDetails(trackId);
    }

    // Check Firestore user uploads if trackId looks like a Firestore ID
    try {
      const customSnap = await getDocs(collection(db, 'music'));
      const found = customSnap.docs.find((d) => d.id === trackId);
      if (found) {
        const raw = { id: found.id, ...found.data() };
        const rights = evaluateTrackRights(raw, 'creator_upload');
        return {
          ...raw,
          canPreview: rights.canPreview,
          canPublish: rights.canPublish,
          syncCleared: rights.syncCleared,
          rightsEvidence: rights.rightsEvidence
        };
      }
    } catch { /* non-critical */ }

    // Fallback try both curated and audius
    const fromCurated = await curatedAdapter.getTrackDetails(trackId);
    if (fromCurated) return fromCurated;
    return audiusAdapter.getTrackDetails(trackId);
  },

  /**
   * Get playable audio preview for listening in discovery/picker UI
   */
  getPlayablePreview: async (trackId, providerHint = null) => {
    const track = await unifiedMusicService.getTrackDetails(trackId, providerHint);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }
    return {
      trackId: track.id,
      previewUrl: track.previewUrl || track.audioUrl,
      duration: track.duration,
      canPreview: Boolean(track.canPreview)
    };
  },

  /**
   * Authorize a track segment for synchronization in a Story or Post.
   * Strictly validates rights through the fail-closed licensing gate!
   */
  getAuthorizedClip: async (trackOrId, start = 0, duration = 15, providerHint = null) => {
    let track = null;
    if (typeof trackOrId === 'object' && trackOrId !== null) {
      track = trackOrId;
    } else {
      track = await unifiedMusicService.getTrackDetails(trackOrId, providerHint);
    }
    if (!track) {
      throw new Error(`Track not found: ${trackOrId}`);
    }

    // Fail-closed licensing assertion: throws LicensingValidationError if unauthorized
    assertTrackSyncAuthorized(track);

    const safeDuration = Math.min(Math.max(5, Number(duration) || 15), 30);
    const trackDuration = Number(track.duration) || 180;
    const safeStart = Math.max(0, Math.min(Number(start) || 0, Math.max(0, trackDuration - safeDuration)));

    return {
      provider: track.provider,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      audioUrl: track.audioUrl || track.previewUrl,
      startTime: safeStart,
      duration: safeDuration,
      genre: track.genre || 'Electronic',
      bpm: track.bpm || 0,
      licenseType: track.rightsEvidence?.licenseType || 'CC BY 4.0',
      licenseStatus: track.rightsEvidence?.licenseStatus || 'verified_sync_cleared',
      attribution: track.rightsEvidence?.attributionText || `${track.artist} (CC BY 4.0)`,
      territory: track.rightsEvidence?.territory || 'worldwide',
      rightsEvidence: track.rightsEvidence || null
    };
  },

  /**
   * Direct rights inspection helper
   */
  verifyTrackRights: (track, provider) => {
    return evaluateTrackRights(track, provider || track?.provider || 'unknown');
  },

  /**
   * Invalidate client-side music cache
   */
  invalidateCache: (provider) => {
    cacheManager.invalidate(provider);
  },

  /* ─────────────────────────────────────────────────────────────
     BACKWARD-COMPATIBLE API METHODS FOR EXISTING CODEBASE
  ───────────────────────────────────────────────────────────── */

  /**
   * Preserves backward compatibility with existing searchLibrary calls in Upload.jsx
   */
  searchLibrary: async (queryStr = '', filters = {}) => {
    try {
      const results = await unifiedMusicService.searchTracks(queryStr, filters);

      // Include custom user uploads from Firestore 'music' collection
      try {
        const userUploadsSnap = await getDocs(collection(db, 'music'));
        userUploadsSnap.forEach((d) => {
          const raw = { id: d.id, ...d.data(), provider: 'creator_upload' };
          const evaluated = evaluateTrackRights(raw, 'creator_upload');
          results.push({
            ...raw,
            canPreview: evaluated.canPreview,
            canPublish: evaluated.canPublish,
            syncCleared: evaluated.syncCleared,
            rightsEvidence: evaluated.rightsEvidence
          });
        });
      } catch { /* non-critical */ }

      return results;
    } catch (e) {
      console.error('[musicService] searchLibrary error:', e);
      return curatedAdapter.searchTracks(queryStr, filters);
    }
  },

  /**
   * Preserves backward compatibility with existing uploadOriginalSound in Upload.jsx
   */
  uploadOriginalSound: async (userId, file, title, metadata = {}, onProgress = null) => {
    try {
      let audioUrl;

      if (_CLD_READY) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', _CLD_PRESET);
        formData.append('folder', `deckknob/music/${userId}`);

        const endpoint = `https://api.cloudinary.com/v1_1/${_CLD_CLOUD}/video/upload`;
        const response = await axios.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total && onProgress) {
              onProgress(Math.round((evt.loaded * 100) / evt.total));
            }
          }
        });

        if (!response.data?.secure_url) {
          throw new Error('Cloudinary did not return a secure_url for the audio file.');
        }
        audioUrl = response.data.secure_url;
      } else {
        const storageRef = ref(storage, `music/${userId}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        audioUrl = await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              if (onProgress) onProgress(Math.round(progress));
            },
            (error) => reject(error),
            async () => {
              resolve(await getDownloadURL(uploadTask.snapshot.ref));
            }
          );
        });
      }

      const trackData = {
        title: title || file.name.split('.')[0],
        artist: metadata.artist || 'Original Mix',
        album: metadata.album || 'Single',
        genre: metadata.genre || 'Electronic',
        duration: metadata.duration || 60,
        bpm: metadata.bpm || 120,
        key: metadata.key || 'C minor',
        artwork: metadata.artwork || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=300&q=80',
        audioUrl,
        provider: 'creator_upload',
        licenseType: 'Original Creator Sound',
        attribution: 'Uploaded by user ' + userId,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'music'), trackData);
      return { id: docRef.id, ...trackData };
    } catch (e) {
      console.error('[musicService] uploadOriginalSound error:', e);
      throw e;
    }
  },

  /* ── Saved Audio Management ── */
  getSavedTrackIds: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('dk_saved_audio_tracks');
        return raw ? JSON.parse(raw) : [];
      }
      return Array.from(cacheManager.get('dk_saved_track_ids') || []);
    } catch {
      return [];
    }
  },

  saveTrack: (trackOrId) => {
    try {
      const trackId = (typeof trackOrId === 'object' && trackOrId?.id) ? trackOrId.id : trackOrId;
      const current = unifiedMusicService.getSavedTrackIds();
      if (!current.includes(trackId)) {
        current.push(trackId);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('dk_saved_audio_tracks', JSON.stringify(current));
        } else {
          cacheManager.set('dk_saved_track_ids', current, 30 * 24 * 3600 * 1000);
        }
      }
      if (typeof trackOrId === 'object' && trackOrId?.id) {
        cacheManager.set(`saved_track_${trackId}`, trackOrId, 30 * 24 * 3600 * 1000);
      }
      return true;
    } catch {
      return false;
    }
  },

  unsaveTrack: (trackId) => {
    try {
      const current = unifiedMusicService.getSavedTrackIds().filter((id) => id !== trackId);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dk_saved_audio_tracks', JSON.stringify(current));
      } else {
        cacheManager.set('dk_saved_track_ids', current, 30 * 24 * 3600 * 1000);
      }
      cacheManager.remove(`saved_track_${trackId}`);
      return true;
    } catch {
      return false;
    }
  },

  isTrackSaved: (trackId) => {
    return unifiedMusicService.getSavedTrackIds().includes(trackId);
  },

  getSavedTracks: async () => {
    const ids = unifiedMusicService.getSavedTrackIds();
    if (!ids.length) return [];

    const fetched = await Promise.all(
      ids.map(async (id) => {
        try {
          const cached = cacheManager.get(`saved_track_${id}`);
          if (cached) return cached;
          return await unifiedMusicService.getTrackDetails(id);
        } catch {
          return null;
        }
      })
    );
    return fetched.filter(Boolean);
  },

  /* ── My Original Sounds ── */
  getMyOriginalSounds: async (userId) => {
    try {
      const musicSnap = await getDocs(collection(db, 'music'));
      const results = [];
      musicSnap.forEach((d) => {
        const data = d.data();
        if (!userId || data.userId === userId || data.attribution?.includes(userId)) {
          const raw = { id: d.id, ...data, provider: 'creator_upload' };
          const evaluated = evaluateTrackRights(raw, 'creator_upload');
          results.push({
            ...raw,
            canPreview: evaluated.canPreview,
            canPublish: evaluated.canPublish,
            syncCleared: evaluated.syncCleared,
            rightsEvidence: evaluated.rightsEvidence
          });
        }
      });
      return results;
    } catch (err) {
      console.warn('[unifiedMusicService] getMyOriginalSounds error:', err);
      return [];
    }
  },

  deleteOriginalSound: async (trackId) => {
    try {
      const docRef = doc(db, 'music', trackId);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error('[unifiedMusicService] deleteOriginalSound error:', err);
      throw err;
    }
  }
};

export const musicService = unifiedMusicService;
export default unifiedMusicService;
