/**
 * DECKKNOB DJ Playlist Demos Service
 * Manages audio demo uploads, playlist creation, track ordering, privacy,
 * and fail-closed licensing separation for DJ profiles.
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';

export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'];

/**
 * Validate an audio file before upload
 */
export function validateAudioFile(file) {
  if (!file) {
    return { valid: false, error: 'No audio file selected.' };
  }

  // Size validation
  if (file.size && file.size > MAX_AUDIO_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 25 MB limit for demo tracks.`
    };
  }

  // Format validation
  const ext = (file.name || '').split('.').pop()?.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const isAudioMime = mime.startsWith('audio/') || mime === 'video/mp4'; // m4a sometimes reports video/mp4

  const isSupportedExt = ext && SUPPORTED_AUDIO_FORMATS.includes(ext);

  if (!isSupportedExt && !isAudioMime) {
    return {
      valid: false,
      error: `Unsupported audio format "${ext || 'unknown'}". Supported formats: ${SUPPORTED_AUDIO_FORMATS.map(f => f.toUpperCase()).join(', ')}.`
    };
  }

  return {
    valid: true,
    format: ext || 'mp3',
    size: file.size
  };
}

/**
 * Extract audio duration (in seconds) from a File or URL in the browser
 */
export async function getAudioDuration(fileOrUrl) {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return 180; // Default estimate in non-browser test environment
  }

  return new Promise((resolve) => {
    let audioUrl = fileOrUrl;
    let isCreatedUrl = false;

    if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
      audioUrl = URL.createObjectURL(fileOrUrl);
      isCreatedUrl = true;
    }

    const audio = new Audio();
    const cleanup = () => {
      if (isCreatedUrl && audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      audio.src = '';
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration) || 0;
      cleanup();
      resolve(dur > 0 ? dur : 180);
    };

    audio.onerror = () => {
      cleanup();
      resolve(180); // Fallback if format is not decodable in current browser engine
    };

    audio.src = audioUrl;
  });
}

export const playlistService = {
  /**
   * Retrieve demo playlists for a given profile UID.
   * If viewer is not the profile owner, private playlists are strictly filtered out.
   */
  getUserPlaylists: async (targetUid, viewerUid = null) => {
    if (!targetUid) return [];

    try {
      const userRef = doc(db, 'users', targetUid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return [];

      const data = snap.data();
      const rawPlaylists = Array.isArray(data.demoPlaylists) ? data.demoPlaylists : [];

      const currentViewer = viewerUid || auth.currentUser?.uid || null;
      const isOwner = currentViewer && currentViewer === targetUid;

      // Filter: only owner sees private playlists
      const filtered = rawPlaylists.filter((pl) => {
        if (pl.visibility === 'private') {
          return isOwner;
        }
        return true;
      });

      return filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (err) {
      console.warn('[playlistService] Error loading playlists:', err);
      return [];
    }
  },

  /**
   * Create or update a demo playlist in the user's profile document.
   * Enforces ownership attestation and fail-closed demo licensing boundaries.
   */
  savePlaylist: async (uid, playlistData) => {
    const activeUid = auth.currentUser?.uid || uid;
    if (!activeUid || activeUid !== uid) {
      throw new Error('Unauthorized: You can only create or edit demo playlists on your own profile.');
    }

    if (!playlistData.title || !playlistData.title.trim()) {
      throw new Error('Playlist title is required.');
    }

    // MANDATORY Ownership Attestation check
    if (!playlistData.ownershipAttested) {
      throw new Error(
        'Ownership declaration required: You must attest that you own or are legally authorized to distribute this audio.'
      );
    }

    const playlistId = playlistData.id || `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // Sanitize tracks with strict licensing separation
    const sanitizedTracks = (playlistData.tracks || []).map((t, idx) => ({
      id: t.id || `trk_${playlistId}_${idx + 1}`,
      title: (t.title || 'Untitled Track').trim(),
      audioUrl: t.audioUrl,
      duration: Number(t.duration) || 180,
      format: t.format || 'mp3',
      size: Number(t.size) || 0,
      order: typeof t.order === 'number' ? t.order : idx,
      bpm: t.bpm ? Number(t.bpm) : null,
      key: t.key ? String(t.key).trim() : null,
      genre: t.genre || playlistData.genre || 'Electronic',
      // Strict demo licensing evidence: Demo listening permission does NOT equal sync clearance!
      rightsEvidence: {
        licenseType: 'DJ Original Demo (Profile Stream Only)',
        attributionText: `${t.title || 'Demo'} - ${playlistData.ownerDisplayName || 'DJ'}`,
        canPreview: true,
        canPublish: false, // Must remain false unless cleared for sync
        syncCleared: false,
        ownershipAttested: true,
        attestationDate: nowIso,
        uploaderUid: activeUid
      }
    }));

    const cleanPlaylist = {
      id: playlistId,
      title: playlistData.title.trim(),
      description: (playlistData.description || '').trim(),
      coverArtwork: playlistData.coverArtwork || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600',
      genre: playlistData.genre || 'Electronic',
      visibility: playlistData.visibility === 'private' ? 'private' : 'public',
      ownerUid: activeUid,
      ownerUsername: playlistData.ownerUsername || 'dj',
      ownerDisplayName: playlistData.ownerDisplayName || 'DJ',
      ownershipAttested: true,
      attestationDate: nowIso,
      tracks: sanitizedTracks,
      createdAt: playlistData.createdAt || nowIso,
      updatedAt: nowIso
    };

    const userRef = doc(db, 'users', activeUid);
    const snap = await getDoc(userRef);
    const currentList = snap.exists() && Array.isArray(snap.data().demoPlaylists)
      ? snap.data().demoPlaylists
      : [];

    const existingIndex = currentList.findIndex((p) => p.id === playlistId);
    let updatedList = [];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = cleanPlaylist;
    } else {
      updatedList = [cleanPlaylist, ...currentList];
    }

    await updateDoc(userRef, {
      demoPlaylists: updatedList,
      updatedAt: nowIso
    });

    return cleanPlaylist;
  },

  /**
   * Delete a demo playlist from the user's profile document.
   */
  deletePlaylist: async (uid, playlistId) => {
    const activeUid = auth.currentUser?.uid || uid;
    if (!activeUid || activeUid !== uid) {
      throw new Error('Unauthorized: You can only delete demo playlists from your own profile.');
    }

    const userRef = doc(db, 'users', activeUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return false;

    const currentList = Array.isArray(snap.data().demoPlaylists) ? snap.data().demoPlaylists : [];
    const updatedList = currentList.filter((p) => p.id !== playlistId);

    await updateDoc(userRef, {
      demoPlaylists: updatedList,
      updatedAt: new Date().toISOString()
    });

    return true;
  },

  /**
   * Reorder tracks within a playlist
   */
  reorderTracks: async (uid, playlistId, newOrderedTrackIds) => {
    const activeUid = auth.currentUser?.uid || uid;
    if (!activeUid || activeUid !== uid) {
      throw new Error('Unauthorized: You can only reorder tracks in your own playlists.');
    }

    const userRef = doc(db, 'users', activeUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return false;

    const currentList = Array.isArray(snap.data().demoPlaylists) ? snap.data().demoPlaylists : [];
    const plIndex = currentList.findIndex((p) => p.id === playlistId);
    if (plIndex === -1) throw new Error('Playlist not found');

    const playlist = currentList[plIndex];
    const trackMap = new Map((playlist.tracks || []).map((t) => [t.id, t]));

    const reorderedTracks = [];
    newOrderedTrackIds.forEach((id, idx) => {
      const trk = trackMap.get(id);
      if (trk) {
        reorderedTracks.push({ ...trk, order: idx });
        trackMap.delete(id);
      }
    });

    // Add any tracks not mentioned in newOrderedTrackIds
    trackMap.forEach((trk) => {
      reorderedTracks.push({ ...trk, order: reorderedTracks.length });
    });

    const updatedPlaylist = {
      ...playlist,
      tracks: reorderedTracks,
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...currentList];
    updatedList[plIndex] = updatedPlaylist;

    await updateDoc(userRef, {
      demoPlaylists: updatedList,
      updatedAt: new Date().toISOString()
    });

    return updatedPlaylist;
  }
};

export default playlistService;
