import type { FirestoreTimestamp } from './user';

/** Crowd level descriptor for a venue. */
export type CrowdLevel = 'Low' | 'Moderate' | 'Busy' | 'Packed' | 'Full Capacity';

/** Currently playing music at a venue. */
export interface VenueCurrentMusic {
  dj: string;
  genre: string;
  bpm: number;
  key: string;
  song: string;
  energy: number;
}

/** DJ/artist in a venue lineup slot. */
export interface VenueLineupEntry {
  dj: string;
  time: string;
  stage: string;
}

/**
 * Venue — matches Firestore 'venues' collection and MOCK_VENUES shape.
 * Reverse-engineered from locationService.js.
 */
export interface Venue {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  rating: number;
  bannerUrl: string;
  logoUrl: string;
  description: string;
  phone?: string;
  website?: string;
  timezone?: string;
  operatingHours?: string;
  amenities: string[];
  crowdLevel: CrowdLevel;
  currentMusic: VenueCurrentMusic;
  lineup: VenueLineupEntry[];
  createdAt?: FirestoreTimestamp | null;
}

/** CheckIn — Firestore 'venueCheckins' document shape. */
export interface VenueCheckin {
  id?: string;
  venueId: string;
  userId: string;
  username: string;
  createdAt: FirestoreTimestamp | null;
}

/** Location prediction from places autocomplete. */
export interface LocationPrediction {
  id: string;
  name: string;
  address?: string;
  city?: string;
}
