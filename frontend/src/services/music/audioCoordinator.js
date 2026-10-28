/**
 * DECKKNOB Audio Playback Coordinator
 * Enforces single-active-audio rule across Stories, Image Posts, Klyps, and Music Picker.
 * Prevents overlapping sound and ensures clean resource teardown on navigation or modal close.
 */

let activeSession = null; // { id: string, type: string, onStop: () => void }

export const audioCoordinator = {
  /**
   * Request permission to play an audio session.
   * If another session is already active, pauses/stops it first.
   *
   * @param {string} sessionId Unique ID of the component/item requesting playback
   * @param {string} type 'story' | 'post' | 'reel' | 'picker'
   * @param {Function} onStop Callback invoked when another session usurps playback or stopAll is called
   */
  startSession: (sessionId, type, onStop) => {
    if (activeSession && activeSession.id !== sessionId) {
      try {
        activeSession.onStop?.();
      } catch (err) {
        console.warn('[audioCoordinator] Error stopping previous session:', err);
      }
    }

    activeSession = {
      id: sessionId,
      type,
      onStop
    };
  },

  /**
   * Stop an active session by its ID
   */
  stopSession: (sessionId) => {
    if (activeSession && activeSession.id === sessionId) {
      try {
        activeSession.onStop?.();
      } catch (err) {
        console.warn('[audioCoordinator] Error in onStop callback:', err);
      }
      activeSession = null;
    }
  },

  /**
   * Stop any and all active audio playback globally
   */
  stopAll: () => {
    if (activeSession) {
      try {
        activeSession.onStop?.();
      } catch (err) {
        console.warn('[audioCoordinator] Error stopping all sessions:', err);
      }
      activeSession = null;
    }
  },

  /**
   * Check if a specific session is currently active
   */
  isSessionActive: (sessionId) => {
    return activeSession?.id === sessionId;
  },

  /**
   * Direct getter for the currently active session ID
   */
  get activeSessionId() {
    return activeSession?.id || null;
  },

  /**
   * Inspect current active session
   */
  getActiveSession: () => activeSession
};
