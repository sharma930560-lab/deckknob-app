import type { FirestoreTimestamp } from './user';

/**
 * MusicTrack — represents a track in the music library.
 * Reverse-engineered from musicService.js STATIC_LIBRARY and Firestore 'music' collection.
 */
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  mood: string;
  duration: number;
  bpm: number;
  key: string;
  energy: number;
  danceability: number;
  artwork: string;
  audioUrl: string;
  licenseType: string;
  attribution: string;
  createdAt?: FirestoreTimestamp | null;
}

/** Filters for musicService.searchLibrary(). */
export interface MusicSearchFilters {
  genre?: string;
  bpmMin?: number;
  bpmMax?: number;
  mood?: string;
}
