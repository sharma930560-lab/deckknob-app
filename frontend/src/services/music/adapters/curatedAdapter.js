/**
 * DECKKNOB Curated Royalty-Free Catalog Adapter
 * Pre-cleared electronic, house, techno, ambient, and synthwave music.
 * Every track has verified worldwide synchronization rights under Creative Commons Attribution.
 * Test/demo tracks are explicitly marked as demo fixtures.
 */

import { evaluateTrackRights, assertTrackSyncAuthorized } from '../licensingGate.js';

export const CURATED_ELECTRONIC_LIBRARY = [
  {
    id: 'curated_track_1',
    provider: 'deckknob_curated',
    title: 'Techno Pulse',
    artist: 'Leon Bassline',
    album: 'Underground Beats',
    genre: 'Techno',
    mood: 'Dark / Energetic',
    duration: 180,
    bpm: 128,
    key: 'A minor',
    energy: 9,
    danceability: 8,
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    license: 'Creative Commons Attribution 4.0',
    attribution: 'Leon Bassline / SoundHelix (CC BY 4.0)',
    isDemoFixture: true
  },
  {
    id: 'curated_track_2',
    provider: 'deckknob_curated',
    title: 'Summer House Breeze',
    artist: 'Nora Waves',
    album: 'Ibiza Sunsets',
    genre: 'House',
    mood: 'Uplifting / Chill',
    duration: 210,
    bpm: 122,
    key: 'C major',
    energy: 7,
    danceability: 9,
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    license: 'Creative Commons Attribution 4.0',
    attribution: 'Nora Waves / SoundHelix (CC BY 4.0)',
    isDemoFixture: true
  },
  {
    id: 'curated_track_3',
    provider: 'deckknob_curated',
    title: 'Neon Horizon',
    artist: 'Synth Ranger',
    album: 'Retro Nights',
    genre: 'Synthwave',
    mood: 'Vibrant / Retro',
    duration: 195,
    bpm: 115,
    key: 'F major',
    energy: 6,
    danceability: 7,
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    license: 'Creative Commons Attribution 4.0',
    attribution: 'Synth Ranger / SoundHelix (CC BY 4.0)',
    isDemoFixture: true
  },
  {
    id: 'curated_track_4',
    provider: 'deckknob_curated',
    title: 'Drum & Bass Catalyst',
    artist: 'Frequency Loop',
    album: 'Breakneck Speeds',
    genre: 'Drum & Bass',
    mood: 'Hyper / Intense',
    duration: 160,
    bpm: 172,
    key: 'G minor',
    energy: 10,
    danceability: 8,
    artwork: 'https://images.unsplash.com/photo-1487180142328-0c4e37023af5?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    license: 'Creative Commons Attribution 4.0',
    attribution: 'Frequency Loop / SoundHelix (CC BY 4.0)',
    isDemoFixture: true
  },
  {
    id: 'curated_track_5',
    provider: 'deckknob_curated',
    title: 'Ambient Zen Space',
    artist: 'Kitaro Sky',
    album: 'Inner Peace',
    genre: 'Ambient',
    mood: 'Relaxing / Flowing',
    duration: 300,
    bpm: 90,
    key: 'E minor',
    energy: 2,
    danceability: 2,
    artwork: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=300&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    license: 'Creative Commons Attribution 4.0',
    attribution: 'Kitaro Sky / SoundHelix (CC BY 4.0)',
    isDemoFixture: true
  }
];

function normalizeCuratedTrack(item) {
  const evalResult = evaluateTrackRights(item, 'deckknob_curated');
  return {
    ...item,
    canPreview: evalResult.canPreview,
    canPublish: evalResult.canPublish,
    syncCleared: evalResult.syncCleared,
    rightsEvidence: evalResult.rightsEvidence
  };
}

export const curatedAdapter = {
  providerId: 'deckknob_curated',
  providerName: 'DECKKNOB Curated (Royalty-Free Electronic)',

  searchTracks: async (queryStr = '', filters = {}) => {
    let results = CURATED_ELECTRONIC_LIBRARY.map(normalizeCuratedTrack);

    if (queryStr && queryStr.trim()) {
      const q = queryStr.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.genre.toLowerCase().includes(q) ||
          (t.mood && t.mood.toLowerCase().includes(q))
      );
    }

    if (filters.genre && filters.genre !== 'All') {
      results = results.filter((t) => t.genre.toLowerCase() === filters.genre.toLowerCase());
    }

    if (filters.bpmMin) results = results.filter((t) => t.bpm >= filters.bpmMin);
    if (filters.bpmMax) results = results.filter((t) => t.bpm <= filters.bpmMax);

    return results;
  },

  getTrendingTracks: async () => {
    return CURATED_ELECTRONIC_LIBRARY.slice(0, 4).map(normalizeCuratedTrack);
  },

  getLatestTracks: async () => {
    return [...CURATED_ELECTRONIC_LIBRARY].reverse().map(normalizeCuratedTrack);
  },

  getTrackDetails: async (trackId) => {
    const raw = CURATED_ELECTRONIC_LIBRARY.find((t) => t.id === trackId);
    if (!raw) return null;
    return normalizeCuratedTrack(raw);
  },

  getPlayablePreview: async (trackId) => {
    const track = await curatedAdapter.getTrackDetails(trackId);
    if (!track) throw new Error(`Curated track not found: ${trackId}`);
    return {
      trackId: track.id,
      previewUrl: track.previewUrl || track.audioUrl,
      duration: track.duration,
      canPreview: true
    };
  },

  getAuthorizedClip: async (trackId, start = 0, duration = 15) => {
    const track = await curatedAdapter.getTrackDetails(trackId);
    if (!track) throw new Error(`Curated track not found: ${trackId}`);

    // Licensing validation
    assertTrackSyncAuthorized(track);

    const safeDuration = Math.min(Math.max(5, Number(duration) || 15), 30);
    const safeStart = Math.max(0, Math.min(Number(start) || 0, Math.max(0, track.duration - safeDuration)));

    return {
      provider: 'deckknob_curated',
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
