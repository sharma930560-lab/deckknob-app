/**
 * DECKKNOB Audius Music Provider Adapter
 * Integrates official Audius API with dynamic discovery node selection,
 * stream resolution, client-side caching, and fail-closed licensing evaluation.
 */

import axios from 'axios';
import { evaluateTrackRights, assertTrackSyncAuthorized } from '../licensingGate.js';
import { cacheManager } from '../cacheManager.js';

const APP_NAME = 'DECKKNOB';
const FALLBACK_DISCOVERY_NODES = [
  'https://discoveryprovider.audius.co',
  'https://audius-dp.amsterdam.creatorseed.com',
  'https://discoveryprovider2.audius.co'
];

let cachedDiscoveryHost = null;
let lastDiscoveryHostCheck = 0;
const HOST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Dynamically select an active Audius discovery provider host
 */
async function getDiscoveryHost() {
  const now = Date.now();
  if (cachedDiscoveryHost && now - lastDiscoveryHostCheck < HOST_CACHE_TTL) {
    return cachedDiscoveryHost;
  }

  try {
    const res = await axios.get('https://api.audius.co', { timeout: 4000 });
    const hosts = res.data?.data;
    if (Array.isArray(hosts) && hosts.length > 0) {
      cachedDiscoveryHost = hosts[0];
      lastDiscoveryHostCheck = now;
      return cachedDiscoveryHost;
    }
  } catch (err) {
    console.warn('[AudiusAdapter] Discovery host resolution fallback:', err?.message || err);
  }

  // Use reliable fallback
  cachedDiscoveryHost = FALLBACK_DISCOVERY_NODES[0];
  lastDiscoveryHostCheck = now;
  return cachedDiscoveryHost;
}

/**
 * Convert raw Audius track payload to normalized DECKKNOB track object
 */
function normalizeAudiusTrack(raw, host) {
  const trackId = String(raw.id);
  const evalResult = evaluateTrackRights(raw, 'audius');

  // Audius artwork object has 150x150, 480x480, 1000x1000
  let artwork = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80';
  if (raw.artwork) {
    artwork = raw.artwork['480x480'] || raw.artwork['150x150'] || raw.artwork['1000x1000'] || artwork;
  }

  const streamUrl = `${host}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;

  return {
    id: `audius_${trackId}`,
    rawId: trackId,
    provider: 'audius',
    title: raw.title || 'Untitled Track',
    artist: raw.user?.name || raw.user?.handle || 'Unknown Artist',
    artistHandle: raw.user?.handle || '',
    album: raw.album_name || 'Audius Single',
    genre: raw.genre || 'Electronic',
    mood: raw.mood || '',
    duration: Number(raw.duration) || 180,
    bpm: Number(raw.bpm) || 0,
    artwork,
    audioUrl: streamUrl,
    previewUrl: streamUrl,
    canPreview: evalResult.canPreview,
    canPublish: evalResult.canPublish,
    syncCleared: evalResult.syncCleared,
    rightsEvidence: evalResult.rightsEvidence
  };
}

export const audiusAdapter = {
  providerId: 'audius',
  providerName: 'Audius Decentralized Music',

  /**
   * Search tracks on Audius with query and filters
   */
  searchTracks: async (queryStr = '', filters = {}) => {
    if (!queryStr || !queryStr.trim()) {
      return audiusAdapter.getTrendingTracks();
    }

    const cacheKey = `audius_search_${queryStr.trim().toLowerCase()}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
      const host = await getDiscoveryHost();
      const endpoint = `${host}/v1/tracks/search`;
      const res = await axios.get(endpoint, {
        params: {
          query: queryStr.trim(),
          app_name: APP_NAME
        },
        timeout: 6000
      });

      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      let results = items.map((raw) => normalizeAudiusTrack(raw, host));

      // Filter by genre if requested
      if (filters.genre && filters.genre !== 'All') {
        results = results.filter((t) => t.genre.toLowerCase() === filters.genre.toLowerCase());
      }

      cacheManager.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[AudiusAdapter] Search error, using stale or empty:', err?.message || err);
      const stale = cacheManager.getStale(cacheKey);
      if (stale) return stale;
      return [];
    }
  },

  /**
   * Retrieve trending electronic / general music from Audius
   */
  getTrendingTracks: async () => {
    const cacheKey = 'audius_trending';
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
      const host = await getDiscoveryHost();
      const endpoint = `${host}/v1/tracks/trending`;
      const res = await axios.get(endpoint, {
        params: { app_name: APP_NAME },
        timeout: 6000
      });

      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      const results = items.map((raw) => normalizeAudiusTrack(raw, host));

      cacheManager.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[AudiusAdapter] Trending error, using stale or empty:', err?.message || err);
      const stale = cacheManager.getStale(cacheKey);
      if (stale) return stale;
      return [];
    }
  },

  /**
   * Retrieve latest release tracks from Audius
   */
  getLatestTracks: async () => {
    const cacheKey = 'audius_latest';
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
      const host = await getDiscoveryHost();
      // Search for recent EDM / electronic tracks
      const endpoint = `${host}/v1/tracks/search`;
      const res = await axios.get(endpoint, {
        params: {
          query: 'electronic',
          sort_method: 'release_date',
          app_name: APP_NAME
        },
        timeout: 6000
      });

      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      const results = items.map((raw) => normalizeAudiusTrack(raw, host));

      cacheManager.set(cacheKey, results);
      return results;
    } catch (err) {
      console.warn('[AudiusAdapter] Latest error, using stale or empty:', err?.message || err);
      const stale = cacheManager.getStale(cacheKey);
      if (stale) return stale;
      return [];
    }
  },

  /**
   * Retrieve full track details by trackId
   */
  getTrackDetails: async (trackId) => {
    const rawId = String(trackId).replace(/^audius_/, '');
    const cacheKey = `audius_track_${rawId}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
      const host = await getDiscoveryHost();
      const endpoint = `${host}/v1/tracks/${rawId}`;
      const res = await axios.get(endpoint, {
        params: { app_name: APP_NAME },
        timeout: 5000
      });

      const raw = res.data?.data;
      if (!raw) return null;
      const normalized = normalizeAudiusTrack(raw, host);
      cacheManager.set(cacheKey, normalized);
      return normalized;
    } catch (err) {
      console.warn('[AudiusAdapter] getTrackDetails error:', err?.message || err);
      return cacheManager.getStale(cacheKey) || null;
    }
  },

  /**
   * Get playable preview for listening/evaluating in the picker
   */
  getPlayablePreview: async (trackId) => {
    const track = await audiusAdapter.getTrackDetails(trackId);
    if (!track) throw new Error(`Audius track not found: ${trackId}`);
    return {
      trackId: track.id,
      previewUrl: track.previewUrl || track.audioUrl,
      duration: track.duration,
      canPreview: true
    };
  },

  /**
   * Authorize a clip for publishing in a Story or Image Post.
   * Strictly enforces fail-closed licensing gate!
   */
  getAuthorizedClip: async (trackId, start = 0, duration = 15) => {
    const track = await audiusAdapter.getTrackDetails(trackId);
    if (!track) throw new Error(`Audius track not found: ${trackId}`);

    // Fail-closed licensing check: throws LicensingValidationError if track is not sync-cleared!
    assertTrackSyncAuthorized(track);

    const safeDuration = Math.min(Math.max(5, Number(duration) || 15), 30);
    const safeStart = Math.max(0, Math.min(Number(start) || 0, Math.max(0, track.duration - safeDuration)));

    return {
      provider: 'audius',
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      audioUrl: track.audioUrl,
      startTime: safeStart,
      duration: safeDuration,
      genre: track.genre,
      bpm: track.bpm,
      licenseType: track.rightsEvidence.licenseType,
      licenseStatus: track.rightsEvidence.licenseStatus,
      attribution: track.rightsEvidence.attributionText,
      territory: track.rightsEvidence.territory,
      rightsEvidence: track.rightsEvidence
    };
  }
};
