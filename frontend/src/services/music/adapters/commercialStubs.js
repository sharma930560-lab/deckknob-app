/**
 * DECKKNOB Commercial Provider Stubs: Hoopr & Epidemic Sound
 * Explicitly reports unconfigured state and required commercial sync agreements.
 * Does not make unauthorized API calls or invent fake credentials.
 */

export const hooprStubAdapter = {
  providerId: 'hoopr',
  providerName: 'Hoopr (Commercial Sync Catalog)',
  isConfigured: false,
  status: 'credentials_required',
  commercialAgreementRequired: true,
  description: 'Hoopr sync licensing catalog for Indian and global regional music synchronization.',

  getUnconfiguredNotice: () => ({
    configured: false,
    provider: 'hoopr',
    message: 'Hoopr commercial integration is inactive. An active Hoopr API Key and commercial UGC sync licensing agreement are required before tracks can be searched or attached.',
    documentationUrl: 'https://hoopr.in',
    actionRequired: 'Configure VITE_HOOPR_API_KEY in server environment and execute enterprise sync rights contract.'
  }),

  searchTracks: async () => {
    return [];
  },

  getTrendingTracks: async () => {
    return [];
  },

  getLatestTracks: async () => {
    return [];
  },

  getTrackDetails: async () => {
    return null;
  },

  getPlayablePreview: async () => {
    throw new Error('Hoopr preview unavailable: commercial credentials and sync agreement required.');
  },

  getAuthorizedClip: async () => {
    throw new Error('Hoopr synchronization prohibited: Commercial credentials and sync agreement are not configured.');
  }
};

export const epidemicSoundStubAdapter = {
  providerId: 'epidemic',
  providerName: 'Epidemic Sound (Commercial Catalog)',
  isConfigured: false,
  status: 'credentials_required',
  commercialAgreementRequired: true,
  description: 'Epidemic Sound commercial sync catalog for content creators and social platforms.',

  getUnconfiguredNotice: () => ({
    configured: false,
    provider: 'epidemic',
    message: 'Epidemic Sound integration is inactive. An active Client ID, Client Secret, and commercial enterprise sync subscription are required.',
    documentationUrl: 'https://www.epidemicsound.com',
    actionRequired: 'Configure VITE_EPIDEMIC_CLIENT_ID in server environment and obtain commercial platform synchronization rights.'
  }),

  searchTracks: async () => {
    return [];
  },

  getTrendingTracks: async () => {
    return [];
  },

  getLatestTracks: async () => {
    return [];
  },

  getTrackDetails: async () => {
    return null;
  },

  getPlayablePreview: async () => {
    throw new Error('Epidemic Sound preview unavailable: commercial credentials required.');
  },

  getAuthorizedClip: async () => {
    throw new Error('Epidemic Sound synchronization prohibited: Commercial credentials and sync agreement are not configured.');
  }
};
