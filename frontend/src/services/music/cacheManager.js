/**
 * DECKKNOB Client-Side Music Catalog Cache
 * 1-Hour TTL with safe storage handling, cache invalidation, and fallback logic.
 */

const CACHE_PREFIX = 'dk_music_cache_';
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const memoryStore = new Map();
const getStorage = () => {
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: (k) => memoryStore.get(k) || null,
    setItem: (k, v) => memoryStore.set(k, String(v)),
    removeItem: (k) => memoryStore.delete(k),
    clear: () => memoryStore.clear(),
    get length() { return memoryStore.size; },
    key: (i) => Array.from(memoryStore.keys())[i] || null
  };
};

export const cacheManager = {
  /**
   * Get cached data if present and not expired
   */
  get: (key) => {
    try {
      const storage = getStorage();
      const raw = storage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.timestamp !== 'number') return null;

      const isExpired = Date.now() - parsed.timestamp > (parsed.ttl || DEFAULT_TTL_MS);
      if (isExpired) {
        return null;
      }
      return parsed.data;
    } catch (e) {
      console.warn('[cacheManager] Read error:', e);
      return null;
    }
  },

  /**
   * Check if non-expired cache key exists
   */
  has: (key) => {
    return cacheManager.get(key) !== null;
  },

  /**
   * Set cached data with timestamp and TTL
   */
  set: (key, data, ttlMs = DEFAULT_TTL_MS) => {
    try {
      const storage = getStorage();
      const payload = {
        timestamp: Date.now(),
        ttl: ttlMs,
        data
      };
      storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
    } catch (e) {
      console.warn('[cacheManager] Write failed (quota or disabled):', e);
    }
  },

  /**
   * Get stale data as a fallback if network fails
   */
  getStale: (key) => {
    try {
      const storage = getStorage();
      const raw = storage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Invalidate specific cache key or all keys matching a provider
   */
  invalidate: (pattern) => {
    try {
      const storage = getStorage();
      const keysToRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          if (!pattern || k.includes(pattern)) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k));
    } catch (e) {
      console.warn('[cacheManager] Invalidate error:', e);
    }
  }
};
