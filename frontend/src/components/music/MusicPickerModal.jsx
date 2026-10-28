import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { musicService, LicensingValidationError } from '../../services/musicService';
import { auth } from '../../config/firebase';
import WaveformTrimmer from './WaveformTrimmer';
import MusicTrackItem from './MusicTrackItem';

const GENRE_LIST = ['All', 'Techno', 'House', 'Synthwave', 'Drum & Bass', 'Ambient', 'Hip-Hop', 'EDM'];
const SAVED_TRACKS_KEY = 'dk_saved_audio_tracks';

export default function MusicPickerModal({
  isOpen = false,
  onClose,
  onSelectMusic,
  initialSelectedTrack = null,
  initialStartTime = 0,
  initialDuration = 15
}) {
  // Navigation & Section state: 'trending' | 'latest' | 'genres' | 'saved' | 'original'
  const [activeSection, setActiveSection] = useState('trending');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [providerFilter, setProviderFilter] = useState('all');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Catalog data & loading states
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  // Saved audio list in localStorage
  const [savedTrackIds, setSavedTrackIds] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_TRACKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Selected track for trimming & clip extraction
  const [selectedTrack, setSelectedTrack] = useState(initialSelectedTrack);
  const [clipStart, setClipStart] = useState(initialStartTime || 0);
  const [clipDuration, setClipDuration] = useState(initialDuration || 15);
  const [licensingError, setLicensingError] = useState('');

  // Audio Playback Engine
  const audioRef = useRef(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(180);

  // Debounce search query (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Stop and clean up audio
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setPlayingTrackId(null);
    setAudioCurrentTime(0);
  }, []);

  // Modal lifecycle: keyboard listener & audio cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      return undefined;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopAudio();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      stopAudio();
    };
  }, [isOpen, onClose, stopAudio]);

  // Audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);

      // Loop clip segment if previewing trimmed selected track
      if (selectedTrack && playingTrackId === selectedTrack.id) {
        const loopEnd = clipStart + clipDuration;
        if (audio.currentTime >= loopEnd) {
          audio.currentTime = clipStart;
        }
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setPlayingTrackId(null);
    };

    const onError = () => {
      setIsPlaying(false);
      setPlayingTrackId(null);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [selectedTrack, playingTrackId, clipStart, clipDuration]);

  // Fetch catalog tracks based on active filters
  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    setIsOfflineFallback(false);

    try {
      let results = [];

      if (debouncedQuery) {
        results = await musicService.searchTracks(debouncedQuery, {
          provider: providerFilter !== 'all' ? providerFilter : undefined,
          genre: selectedGenre !== 'All' ? selectedGenre : undefined
        });
      } else if (activeSection === 'trending') {
        results = await musicService.getTrendingTracks(providerFilter);
      } else if (activeSection === 'latest') {
        results = await musicService.getLatestTracks(providerFilter);
      } else if (activeSection === 'genres') {
        results = await musicService.searchTracks('', {
          genre: selectedGenre !== 'All' ? selectedGenre : undefined,
          provider: providerFilter !== 'all' ? providerFilter : undefined
        });
      } else if (activeSection === 'saved') {
        // Retrieve persistent saved tracks with full metadata
        results = await musicService.getSavedTracks();
      } else if (activeSection === 'original') {
        // Retrieve real creator sounds from Firestore
        const uid = auth.currentUser?.uid;
        results = await musicService.getMyOriginalSounds(uid);
      }

      // Filter by genre client-side if applicable
      if (selectedGenre !== 'All' && activeSection !== 'genres') {
        results = results.filter((t) => !t.genre || t.genre.toLowerCase() === selectedGenre.toLowerCase());
      }

      setTracks(results);
    } catch (err) {
      console.warn('[MusicPickerModal] Network error, attempting offline/cached results:', err);
      // Attempt cached fallback
      try {
        const cached = await musicService.getTrendingTracks('deckknob_curated');
        if (cached && cached.length) {
          setTracks(cached);
          setIsOfflineFallback(true);
        } else {
          setErrorMsg('Unable to reach music catalog. Check network connection and retry.');
        }
      } catch {
        setErrorMsg('Unable to load music catalog. Please retry.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, activeSection, selectedGenre, providerFilter, savedTrackIds]);

  useEffect(() => {
    if (isOpen) {
      loadTracks();
    }
  }, [isOpen, loadTracks]);

  // Toggle track preview playback
  const handleTogglePlay = (track) => {
    if (!track.canPreview) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (playingTrackId === track.id && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const streamUrl = track.audioUrl || track.previewUrl;
    if (!streamUrl) return;

    try {
      if (audio.src !== streamUrl) {
        audio.src = streamUrl;
      }

      // If playing the currently trimmed track, seek to clip start
      const startPos = selectedTrack?.id === track.id ? clipStart : 0;
      audio.currentTime = startPos;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setPlayingTrackId(track.id);
          })
          .catch((err) => {
            console.warn('[MusicPickerModal] Audio play blocked or format unsupported:', err);
            setIsPlaying(false);
            setPlayingTrackId(null);
          });
      }
    } catch (e) {
      console.warn('[MusicPickerModal] Audio playback exception:', e);
      setIsPlaying(false);
    }
  };

  // Toggle bookmarking / saved audio with persistent storage
  const handleToggleSave = async (track) => {
    const trackId = track.id;
    const isCurrentlySaved = savedTrackIds.includes(trackId);
    if (isCurrentlySaved) {
      await musicService.unsaveTrack(trackId);
      setSavedTrackIds((prev) => prev.filter((id) => id !== trackId));
      if (activeSection === 'saved') {
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      }
    } else {
      await musicService.saveTrack(track);
      setSavedTrackIds((prev) => [...prev, trackId]);
    }
  };

  // Select a track for synchronization and trimming
  const handleSelectTrack = (track) => {
    setLicensingError('');

    // Fail-closed verification
    if (!track.syncCleared || !track.canPublish) {
      setLicensingError(
        track.rightsEvidence?.rejectionReason ||
          'Synchronization permission denied: track lacks verified commercial or Creative Commons sync rights.'
      );
      return;
    }

    setSelectedTrack(track);
    setClipStart(0);
    setClipDuration(15);

    // If already playing audio, reposition playback to clip start
    if (audioRef.current && playingTrackId === track.id) {
      audioRef.current.currentTime = 0;
    }
  };

  // Confirm clip selection and return authorized metadata
  const handleConfirmClip = async () => {
    if (!selectedTrack) return;
    setLicensingError('');

    try {
      // Authorize clip with existing fail-closed licensing gate
      const authorizedClip = await musicService.getAuthorizedClip(
        selectedTrack.id,
        clipStart,
        clipDuration,
        selectedTrack.provider
      );

      stopAudio();
      onSelectMusic?.(authorizedClip);
      onClose();
    } catch (err) {
      if (err instanceof LicensingValidationError) {
        setLicensingError(`Sync Denied: ${err.message}`);
      } else {
        setLicensingError(err.message || 'Failed to authorize audio clip.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 backdrop-blur-md bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="music-picker-title"
    >
      {/* Hidden Singleton Audio Element */}
      <audio ref={audioRef} preload="none" />

      {/* Modal Surface */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative flex h-[92vh] sm:h-[85vh] w-full max-w-2xl flex-col rounded-t-[2rem] sm:rounded-3xl border border-white/10 bg-[#0c0c0e] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#DFE104]/10 text-[#DFE104]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <h2 id="music-picker-title" className="text-lg font-black tracking-tight text-white">
                Add Music & Soundtracks
              </h2>
              <p className="text-xs text-zinc-400">
                Verified royalty-free & Creative Commons synchronization
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close music picker"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar & Provider Filter */}
        <div className="space-y-2 border-b border-white/[0.06] p-4 shrink-0 bg-white/[0.01]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks, artists, genres..."
                className="w-full rounded-xl bg-white/[0.05] pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 border border-white/10 focus:border-[#DFE104] focus:outline-none transition-colors"
                aria-label="Search music catalog"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  aria-label="Clear search query"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Provider Filter Selector */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="rounded-xl bg-white/[0.05] px-3 py-2 text-xs font-semibold text-zinc-300 border border-white/10 focus:border-[#DFE104] focus:outline-none"
              aria-label="Filter by music provider"
            >
              <option value="all" className="bg-zinc-900">All Providers</option>
              <option value="deckknob_curated" className="bg-zinc-900">DECKKNOB Curated</option>
              <option value="audius" className="bg-zinc-900">Audius Catalog</option>
              <option value="hoopr" className="bg-zinc-900">Hoopr (Commercial)</option>
              <option value="epidemic" className="bg-zinc-900">Epidemic Sound</option>
            </select>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs">
            {[
              { id: 'trending', label: 'Trending 🔥' },
              { id: 'latest', label: 'Latest ⚡' },
              { id: 'genres', label: 'Genres 🎛️' },
              { id: 'saved', label: `Saved (${savedTrackIds.length}) ⭐` },
              { id: 'original', label: 'My Audio 🎙️' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSection(tab.id);
                  setSearchQuery('');
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                  activeSection === tab.id
                    ? 'bg-[#DFE104] text-black shadow-sm'
                    : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Genre Sub-tabs (when Genres section is selected) */}
          {activeSection === 'genres' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-[11px]">
              {GENRE_LIST.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    selectedGenre === genre
                      ? 'bg-white/20 text-[#DFE104] border border-[#DFE104]/40'
                      : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Offline / Cache Fallback Notification Banner */}
        {isOfflineFallback && (
          <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300">
            <span>⚠️ Network slow or offline: displaying verified cached catalog.</span>
            <button
              type="button"
              onClick={loadTracks}
              className="underline font-bold hover:text-white ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* Licensing Rejection Alert */}
        {licensingError && (
          <div className="flex items-start gap-2 bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-xs text-red-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1">
              <span className="font-bold">Licensing Restriction: </span>
              {licensingError}
            </div>
            <button
              type="button"
              onClick={() => setLicensingError('')}
              className="text-red-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Area: Catalog List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
              <p className="text-xs text-zinc-400 font-medium">Scanning catalog & validating sync rights...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-400 grid place-items-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white">{errorMsg}</p>
              <button
                type="button"
                onClick={loadTracks}
                className="mt-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 text-xs font-bold text-white transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
              </svg>
              <p className="text-sm font-semibold text-zinc-400">
                {activeSection === 'saved'
                  ? 'No saved tracks yet'
                  : activeSection === 'original'
                  ? 'No original creator sounds found'
                  : 'No tracks found'}
              </p>
              <p className="text-xs text-zinc-600 max-w-xs">
                {activeSection === 'saved'
                  ? 'Bookmark tracks in the catalog to quickly access them here.'
                  : activeSection === 'original'
                  ? 'Original tracks and mixes uploaded to your profile will appear here.'
                  : 'Try searching for a different keyword or provider.'}
              </p>
            </div>
          ) : (
            tracks.map((track) => (
              <MusicTrackItem
                key={track.id}
                track={track}
                isSelected={selectedTrack?.id === track.id}
                isPlaying={playingTrackId === track.id && isPlaying}
                onSelect={handleSelectTrack}
                onTogglePlay={() => handleTogglePlay(track)}
                isSaved={savedTrackIds.includes(track.id)}
                onToggleSave={() => handleToggleSave(track)}
              />
            ))
          )}
        </div>

        {/* Waveform Trimmer Panel (Rendered when a valid cleared track is chosen) */}
        {selectedTrack && (
          <div className="border-t border-white/10 bg-[#070708] p-4 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[#DFE104] animate-pulse" />
                <p className="text-xs font-bold text-white truncate">
                  Configuring Clip: <span className="text-[#DFE104]">{selectedTrack.title}</span> — {selectedTrack.artist}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrack(null)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            {/* Trimmer */}
            <WaveformTrimmer
              track={selectedTrack}
              startTime={clipStart}
              duration={clipDuration}
              onChange={({ startTime, duration }) => {
                setClipStart(startTime);
                setClipDuration(duration);
              }}
              isPlaying={isPlaying && playingTrackId === selectedTrack.id}
              onTogglePlay={() => handleTogglePlay(selectedTrack)}
              currentTime={audioCurrentTime}
              audioDuration={audioDuration}
            />

            {/* Confirm & Attach Action */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-zinc-500">
                <span>Start: </span>
                <span className="font-mono font-bold text-white">{clipStart}s</span>
                <span className="mx-1">•</span>
                <span>Length: </span>
                <span className="font-mono font-bold text-[#DFE104]">{clipDuration}s</span>
              </div>

              <button
                type="button"
                onClick={handleConfirmClip}
                className="flex items-center gap-2 rounded-xl bg-[#DFE104] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-[0_0_15px_rgba(223,225,4,0.3)] transition-transform hover:scale-105 active:scale-95"
              >
                <span>Attach Soundtrack</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
