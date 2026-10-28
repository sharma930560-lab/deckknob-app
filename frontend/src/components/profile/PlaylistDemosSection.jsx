import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playlistService } from '../../services/playlistService.js';
import { audioCoordinator } from '../../services/music/audioCoordinator.js';
import CreatePlaylistModal from './CreatePlaylistModal.jsx';

function formatDuration(seconds) {
  const s = Math.round(seconds || 0);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function PlaylistDemosSection({ profileUser, currentUser, isOwnProfile }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState(null);

  // Active audio player state
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(null);

  const audioRef = useRef(null);

  // Load playlists for profileUser
  const loadPlaylists = async () => {
    if (!profileUser?.uid) return;
    setLoading(true);
    try {
      const data = await playlistService.getUserPlaylists(profileUser.uid, currentUser?.uid);
      setPlaylists(data);
      if (data.length > 0 && !expandedPlaylistId) {
        setExpandedPlaylistId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [profileUser?.uid, currentUser?.uid]);

  // Teardown audio on component unmount
  useEffect(() => {
    return () => {
      stopAudioPlayback();
    };
  }, []);

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setIsBuffering(false);
    audioCoordinator.stopSession('profile_playlist');
  };

  const currentTrack = activePlaylist?.tracks?.[currentTrackIndex] || null;

  // Start playing a track in a playlist
  const handlePlayTrack = (playlist, trackIndex) => {
    if (activePlaylist?.id === playlist.id && currentTrackIndex === trackIndex && isPlaying) {
      // Toggle pause
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (activePlaylist?.id === playlist.id && currentTrackIndex === trackIndex && !isPlaying && audioRef.current?.src) {
      // Resume playback
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }

    const track = playlist.tracks?.[trackIndex];
    if (!track?.audioUrl) {
      setPlaybackError('Audio URL unavailable for this track.');
      return;
    }

    setPlaybackError(null);
    setActivePlaylist(playlist);
    setCurrentTrackIndex(trackIndex);
    setCurrentTime(0);
    setDuration(track.duration || 180);
    setIsBuffering(true);

    // Coordinate exclusivity
    audioCoordinator.startSession('profile_playlist', 'playlist', () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    });

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = track.audioUrl;
    audio.currentTime = 0;

    audio.onwaiting = () => setIsBuffering(true);
    audio.oncanplay = () => setIsBuffering(false);
    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    audio.onended = () => {
      handleNextTrack(playlist, trackIndex);
    };
    audio.onerror = (e) => {
      console.warn('Audio playback error:', e);
      setIsBuffering(false);
      setIsPlaying(false);
      setPlaybackError('Playback error: Audio stream unavailable or format unsupported in this browser.');
    };

    audio.play().then(() => {
      setIsPlaying(true);
      setIsBuffering(false);
    }).catch(err => {
      console.warn('Autoplay restricted or play failed:', err);
      setIsBuffering(false);
      setIsPlaying(false);
      setPlaybackError('Browser restricted audio autoplay. Tap play to listen.');
    });
  };

  const handleNextTrack = (playlist = activePlaylist, currentIndex = currentTrackIndex) => {
    if (!playlist?.tracks) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx < playlist.tracks.length) {
      handlePlayTrack(playlist, nextIdx);
    } else {
      stopAudioPlayback();
    }
  };

  const handlePrevTrack = () => {
    if (!activePlaylist?.tracks) return;
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevIdx = currentTrackIndex - 1;
    if (prevIdx >= 0) {
      handlePlayTrack(activePlaylist, prevIdx);
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm('Are you sure you want to delete this demo playlist?')) return;
    try {
      if (activePlaylist?.id === playlistId) {
        stopAudioPlayback();
        setActivePlaylist(null);
      }
      await playlistService.deletePlaylist(profileUser.uid, playlistId);
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    } catch (err) {
      alert(`Failed to delete playlist: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">DJ Demo Playlists</h3>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300">
              {playlists.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Original demos, unreleased cuts, and promo sets by {profileUser?.displayName || 'DJ'}.
          </p>
        </div>

        {isOwnProfile && (
          <button
            onClick={() => { setEditingPlaylist(null); setModalOpen(true); }}
            className="rounded-xl bg-[#DFE104] text-black px-4 py-2.5 text-xs font-bold hover:bg-[#c9cb03] transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <span>+</span> Create Demo Playlist
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          Loading demo playlists...
        </div>
      ) : playlists.length === 0 ? (
        <div className="rounded-3xl border border-white/5 bg-white/[0.015] p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-2xl">
            🎧
          </div>
          <h4 className="text-sm font-bold text-white">No demo playlists available</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {isOwnProfile
              ? 'Upload your unreleased tracks and club demos to showcase your sound to fans and event promoters.'
              : `${profileUser?.displayName || 'This DJ'} hasn't published any public demo playlists yet.`}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => { setEditingPlaylist(null); setModalOpen(true); }}
              className="mt-2 rounded-xl bg-[#DFE104] text-black px-5 py-2 text-xs font-bold hover:bg-[#c9cb03] transition-colors"
            >
              Upload Your First Demo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {playlists.map((pl) => {
            const isExpanded = expandedPlaylistId === pl.id;
            const totalDurationSecs = (pl.tracks || []).reduce((acc, t) => acc + (t.duration || 0), 0);
            const isCurrentlyPlayingThisPlaylist = activePlaylist?.id === pl.id && isPlaying;

            return (
              <div
                key={pl.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all duration-200"
              >
                {/* Playlist Summary Card */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={pl.coverArtwork || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600'}
                      alt={pl.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                          {pl.genre || 'Electronic'}
                        </span>
                        {pl.visibility === 'private' && (
                          <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            🔒 Private
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500 font-medium">
                          {pl.tracks?.length || 0} tracks • {formatDuration(totalDurationSecs)}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white truncate">
                        {pl.title}
                      </h4>
                      {pl.description && (
                        <p className="text-xs text-zinc-400 line-clamp-1">{pl.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {/* Play whole playlist button */}
                    <button
                      onClick={() => {
                        if (isCurrentlyPlayingThisPlaylist) {
                          audioRef.current?.pause();
                          setIsPlaying(false);
                        } else {
                          handlePlayTrack(pl, 0);
                        }
                      }}
                      className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      aria-label={isCurrentlyPlayingThisPlaylist ? 'Pause playlist' : 'Play playlist'}
                    >
                      <span>{isCurrentlyPlayingThisPlaylist ? '⏸ Pause' : '▶ Play'}</span>
                    </button>

                    {/* Expand/Collapse tracklist */}
                    <button
                      onClick={() => setExpandedPlaylistId(isExpanded ? null : pl.id)}
                      className="rounded-xl border border-white/10 p-2 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                      title={isExpanded ? 'Hide tracks' : 'Show tracks'}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>

                    {/* Owner controls */}
                    {isOwnProfile && (
                      <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                        <button
                          onClick={() => { setEditingPlaylist(pl); setModalOpen(true); }}
                          className="rounded-lg p-2 text-zinc-400 hover:text-amber-400 hover:bg-white/5 transition-colors text-xs"
                          title="Edit Playlist"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePlaylist(pl.id)}
                          className="rounded-lg p-2 text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors text-xs"
                          title="Delete Playlist"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tracklist table if expanded */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/20 p-3 sm:p-4 space-y-1">
                    {pl.tracks?.map((track, idx) => {
                      const isThisPlaying = activePlaylist?.id === pl.id && currentTrackIndex === idx && isPlaying;
                      return (
                        <div
                          key={track.id || idx}
                          onClick={() => handlePlayTrack(pl, idx)}
                          className={`rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isThisPlaying
                              ? 'bg-[#DFE104]/10 border border-[#DFE104]/30'
                              : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 text-center text-xs font-bold text-zinc-500">
                              {isThisPlaying ? '🔊' : idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm font-semibold truncate ${isThisPlaying ? 'text-[#DFE104]' : 'text-white'}`}>
                                {track.title}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <span>{pl.ownerDisplayName || 'DJ'}</span>
                                {track.bpm && <span>• {track.bpm} BPM</span>}
                                {track.key && <span>• Key {track.key}</span>}
                              </div>
                            </div>
                          </div>

                          <span className="text-xs font-medium text-zinc-400 shrink-0">
                            {formatDuration(track.duration)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Dedicated Demo Player */}
      <AnimatePresence>
        {activePlaylist && currentTrack && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 rounded-2xl border border-white/20 bg-[#16161c]/95 backdrop-blur-xl p-3.5 shadow-2xl space-y-2.5"
          >
            {playbackError && (
              <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-2 text-[11px] text-red-300 flex items-center justify-between">
                <span>{playbackError}</span>
                <button
                  onClick={() => handlePlayTrack(activePlaylist, currentTrackIndex)}
                  className="underline font-bold text-white ml-2"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={activePlaylist.coverArtwork}
                  alt={currentTrack.title}
                  className="w-11 h-11 rounded-lg object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {activePlaylist.title} • {activePlaylist.ownerDisplayName}
                  </p>
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrevTrack}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white"
                  title="Previous Track"
                  aria-label="Previous Track"
                >
                  ⏮
                </button>
                <button
                  onClick={() => handlePlayTrack(activePlaylist, currentTrackIndex)}
                  className="w-10 h-10 rounded-full bg-[#DFE104] text-black font-bold flex items-center justify-center hover:bg-[#c9cb03] transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isBuffering ? '⏳' : isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => handleNextTrack()}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white"
                  title="Next Track"
                  aria-label="Next Track"
                >
                  ⏭
                </button>
                <button
                  onClick={stopAudioPlayback}
                  className="w-7 h-7 rounded-full text-zinc-400 hover:text-white text-xs ml-1"
                  title="Close player"
                  aria-label="Close player"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Seek bar and time */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 180}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#DFE104]"
                aria-label="Seek track"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create / Edit Modal */}
      <CreatePlaylistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialPlaylist={editingPlaylist}
        currentUser={currentUser}
        onSaved={(saved) => {
          loadPlaylists();
        }}
      />
    </div>
  );
}
