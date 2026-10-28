/**
 * DECKKNOB Music Service (Main Entrypoint)
 * Exports the unified music service facade with provider adapters and licensing gate.
 */

export { unifiedMusicService as musicService, unifiedMusicService } from './music/musicService.js';
export { evaluateTrackRights, assertTrackSyncAuthorized, validatePublishing, LicensingValidationError } from './music/licensingGate.js';
export { cacheManager } from './music/cacheManager.js';
export { audiusAdapter } from './music/adapters/audiusAdapter.js';
export { curatedAdapter } from './music/adapters/curatedAdapter.js';
export { hooprStubAdapter, epidemicSoundStubAdapter } from './music/adapters/commercialStubs.js';
export { audioCoordinator } from './music/audioCoordinator.js';
export { playlistService, validateAudioFile, getAudioDuration, MAX_AUDIO_FILE_SIZE, SUPPORTED_AUDIO_FORMATS } from './playlistService.js';

import { unifiedMusicService } from './music/musicService.js';
export default unifiedMusicService;
