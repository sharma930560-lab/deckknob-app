import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { storageService } from '../../services/storageService.js';
import { playlistService, validateAudioFile, getAudioDuration } from '../../services/playlistService.js';
import { audioCoordinator } from '../../services/music/audioCoordinator.js';

const GENRES = ['Techno', 'House', 'Melodic Techno', 'Drum & Bass', 'Trance', 'Electro', 'Deep House', 'Afro House', 'Ambient'];

export default function CreatePlaylistModal({ isOpen, onClose, onSaved, initialPlaylist = null, currentUser }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Techno');
  const [visibility, setVisibility] = useState('public');
  const [coverArtwork, setCoverArtwork] = useState('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600');
  const [tracks, setTracks] = useState([]);
  const [ownershipAttested, setOwnershipAttested] = useState(false);
  
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Track upload states: { [tempId]: { progress: number, error: string | null, uploading: boolean } }
  const [uploadStatus, setUploadStatus] = useState({});
  
  // In-modal preview audio state
  const [previewTrackId, setPreviewTrackId] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Initialize for edit or create
  useEffect(() => {
    if (initialPlaylist) {
      setTitle(initialPlaylist.title || '');
      setDescription(initialPlaylist.description || '');
      setGenre(initialPlaylist.genre || 'Techno');
      setVisibility(initialPlaylist.visibility || 'public');
      setCoverArtwork(initialPlaylist.coverArtwork || 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600');
      setTracks(initialPlaylist.tracks || []);
      setOwnershipAttested(Boolean(initialPlaylist.ownershipAttested));
    } else {
      setTitle('');
      setDescription('');
      setGenre('Techno');
      setVisibility('public');
      setCoverArtwork('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600');
      setTracks([]);
      setOwnershipAttested(false);
    }
    setError(null);
    setUploadStatus({});
    stopPreview();
  }, [initialPlaylist, isOpen]);

  // Teardown preview on unmount or close
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPreviewPlaying(false);
    setPreviewTrackId(null);
    audioCoordinator.stopSession('modal_preview');
  };

  const handleTogglePreview = (track) => {
    if (previewTrackId === track.id && previewPlaying) {
      stopPreview();
      return;
    }

    if (!track.audioUrl) return;

    audioCoordinator.startSession('modal_preview', 'preview', () => {
      stopPreview();
    });

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setPreviewPlaying(false);
        setPreviewTrackId(null);
      };
      audioRef.current.onerror = () => {
        setError('Preview unavailable for this track format or connection.');
        setPreviewPlaying(false);
        setPreviewTrackId(null);
      };
    }

    audioRef.current.src = track.audioUrl;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setPreviewPlaying(true);
      setPreviewTrackId(track.id);
    }).catch((err) => {
      console.warn('Preview play blocked:', err);
      setError('Autoplay restricted. Tap again to preview.');
    });
  };

  // Handle Cover Art Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP) for the cover.');
      return;
    }

    setIsUploadingCover(true);
    setError(null);
    try {
      const url = await storageService.uploadPlaylistCover(currentUser?.uid, file);
      setCoverArtwork(url);
    } catch (err) {
      console.error('Cover upload error:', err);
      setError(`Failed to upload cover: ${err.message}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Handle Audio Demo Files Selection
  const handleAudioFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);

    for (const file of files) {
      const validation = validateAudioFile(file);
      if (!validation.valid) {
        setError(validation.error);
        continue;
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      // Add placeholder track
      const newTrack = {
        id: tempId,
        title: cleanTitle,
        audioUrl: '',
        duration: 180,
        format: validation.format,
        size: file.size,
        bpm: null,
        key: null,
        order: tracks.length
      };

      setTracks(prev => [...prev, newTrack]);
      await uploadSingleTrack(file, tempId);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload single track helper with retry support
  const uploadSingleTrack = async (file, tempId) => {
    setUploadStatus(prev => ({
      ...prev,
      [tempId]: { progress: 0, error: null, uploading: true }
    }));

    try {
      // Extract duration in parallel
      const duration = await getAudioDuration(file);

      const downloadUrl = await storageService.uploadAudioDemo(
        currentUser?.uid,
        file,
        (progress) => {
          setUploadStatus(prev => ({
            ...prev,
            [tempId]: { progress, error: null, uploading: true }
          }));
        }
      );

      // Update track with real download URL and duration
      setTracks(prev => prev.map(t => {
        if (t.id === tempId) {
          return {
            ...t,
            audioUrl: downloadUrl,
            duration
          };
        }
        return t;
      }));

      setUploadStatus(prev => ({
        ...prev,
        [tempId]: { progress: 100, error: null, uploading: false }
      }));
    } catch (err) {
      console.error('Track upload error:', err);
      setUploadStatus(prev => ({
        ...prev,
        [tempId]: { progress: 0, error: err.message, uploading: false }
      }));
      setError(`Failed to upload "${file.name}": ${err.message}`);
    }
  };

  const handleRemoveTrack = (trackId) => {
    if (previewTrackId === trackId) stopPreview();
    setTracks(prev => prev.filter(t => t.id !== trackId));
    setUploadStatus(prev => {
      const copy = { ...prev };
      delete copy[trackId];
      return copy;
    });
  };

  const handleMoveTrack = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    setTracks(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return list.map((t, idx) => ({ ...t, order: idx }));
    });
  };

  const handleUpdateTrackMeta = (trackId, field, value) => {
    setTracks(prev => prev.map(t => {
      if (t.id === trackId) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please provide a playlist title.');
      return;
    }

    if (tracks.length === 0) {
      setError('Please add at least one audio demo track to this playlist.');
      return;
    }

    // Check if any track is still uploading
    const hasUploading = Object.values(uploadStatus).some(s => s.uploading);
    if (hasUploading) {
      setError('Please wait for all tracks to finish uploading before saving.');
      return;
    }

    // Check if any track lacks a valid audioUrl
    const incomplete = tracks.some(t => !t.audioUrl);
    if (incomplete) {
      setError('Some tracks failed to upload. Please retry or remove them.');
      return;
    }

    if (!ownershipAttested) {
      setError('You must attest ownership or authorization for this demo audio.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        id: initialPlaylist?.id || null,
        title: title.trim(),
        description: description.trim(),
        coverArtwork,
        genre,
        visibility,
        ownerUid: currentUser?.uid,
        ownerUsername: currentUser?.username || 'dj',
        ownerDisplayName: currentUser?.displayName || currentUser?.username || 'DJ',
        ownershipAttested: true,
        tracks: tracks.map((t, idx) => ({
          ...t,
          order: idx
        }))
      };

      const saved = await playlistService.savePlaylist(currentUser?.uid, payload);
      stopPreview();
      onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Save playlist error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0f0f13] text-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎧</span>
            <h2 className="text-lg font-bold tracking-tight">
              {initialPlaylist ? 'Edit Demo Playlist' : 'Create DJ Demo Playlist'}
            </h2>
          </div>
          <button
            onClick={() => { stopPreview(); onClose(); }}
            className="rounded-full p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400 flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <p className="flex-1 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Title & Visibility Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Playlist Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Tresor Club Promo Demo 2026"
                maxLength={80}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
              >
                <option value="public" className="bg-zinc-900">Public (Profile & Fans)</option>
                <option value="private" className="bg-zinc-900">Private (Only You)</option>
              </select>
            </div>
          </div>

          {/* Description & Genre Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Unreleased club cuts, promos, and festival demos..."
                maxLength={180}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                Primary Genre
              </label>
              <select
                value={genre}
                onChange={e => setGenre(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
              >
                {GENRES.map(g => (
                  <option key={g} value={g} className="bg-zinc-900">{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cover Artwork */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Cover Artwork
            </label>
            <div className="flex items-center gap-4">
              <img
                src={coverArtwork}
                alt="Playlist cover"
                className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-md"
              />
              <div className="flex-1 space-y-1">
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-white/10 transition-colors"
                >
                  {isUploadingCover ? 'Uploading Artwork...' : 'Upload Cover Image'}
                </button>
                <p className="text-[11px] text-zinc-500">Supports PNG, JPG, WebP.</p>
              </div>
            </div>
          </div>

          {/* Audio Tracks Section */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold tracking-tight">Audio Tracks ({tracks.length})</h3>
                <p className="text-[11px] text-zinc-400">Supported: MP3, WAV, M4A, OGG up to 25 MB per track.</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAudioFilesSelected}
                accept=".mp3,.wav,.m4a,.ogg,.aac,.flac,audio/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-[#DFE104] text-black px-4 py-2 text-xs font-bold hover:bg-[#c9cb03] transition-colors flex items-center gap-1.5"
              >
                <span>+</span> Add Audio Files
              </button>
            </div>

            {/* Track List */}
            {tracks.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-white/10 p-6 text-center hover:border-white/20 transition-colors bg-white/[0.01]"
              >
                <span className="text-2xl block mb-1">🎵</span>
                <p className="text-xs font-semibold text-zinc-300">Click to select MP3 or WAV demo audio</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Maximum file size: 25MB per demo</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tracks.map((track, idx) => {
                  const status = uploadStatus[track.id];
                  const isUploading = status?.uploading;
                  const isPlaying = previewTrackId === track.id && previewPlaying;

                  return (
                    <div
                      key={track.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-3">
                        {/* Play / Preview Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePreview(track)}
                          disabled={!track.audioUrl || isUploading}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isPlaying
                              ? 'bg-[#DFE104] text-black font-bold'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          } ${(!track.audioUrl || isUploading) ? 'opacity-40 cursor-not-allowed' : ''}`}
                          aria-label={isPlaying ? 'Pause preview' : 'Preview track'}
                        >
                          {isPlaying ? '⏸' : '▶'}
                        </button>

                        {/* Title & Metadata inputs */}
                        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={track.title}
                            onChange={e => handleUpdateTrackMeta(track.id, 'title', e.target.value)}
                            placeholder="Track title"
                            className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#DFE104]"
                          />
                          <input
                            type="number"
                            value={track.bpm || ''}
                            onChange={e => handleUpdateTrackMeta(track.id, 'bpm', e.target.value)}
                            placeholder="BPM (opt)"
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#DFE104]"
                          />
                          <input
                            type="text"
                            value={track.key || ''}
                            onChange={e => handleUpdateTrackMeta(track.id, 'key', e.target.value)}
                            placeholder="Key (e.g. 8A)"
                            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#DFE104]"
                          />
                        </div>

                        {/* Reorder and Delete controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(idx, -1)}
                            disabled={idx === 0}
                            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveTrack(idx, 1)}
                            disabled={idx === tracks.length - 1}
                            className="p-1.5 text-zinc-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrack(track.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 ml-1"
                            title="Remove"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {/* Upload Progress Bar if actively uploading */}
                      {isUploading && (
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#DFE104] h-full transition-all duration-300"
                            style={{ width: `${status?.progress || 10}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mandatory Ownership & Licensing Attestation */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={ownershipAttested}
                onChange={e => setOwnershipAttested(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 text-[#DFE104] focus:ring-0"
              />
              <div className="text-xs leading-relaxed text-zinc-300">
                <span className="font-bold text-white">Ownership & Distribution Attestation: </span>
                I attest that I own or am legally authorized to upload and stream this demo audio.
                I understand that uploading a demo playlist does <span className="text-amber-400 underline font-semibold">NOT</span> clear synchronization rights for public video/Stories without separate sync authorization.
              </div>
            </label>
            <p className="text-[11px] text-zinc-500 pl-7">
              Streaming audio on DECKKNOB is intended for web profile playback. Standard browser playback does not guarantee client-side capture prevention.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4 bg-white/[0.02] flex items-center justify-between">
          <button
            type="button"
            onClick={() => { stopPreview(); onClose(); }}
            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !ownershipAttested || tracks.length === 0 || !title.trim()}
            className="rounded-xl bg-[#DFE104] text-black px-6 py-2.5 text-xs font-bold hover:bg-[#c9cb03] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? 'Saving Playlist...' : initialPlaylist ? 'Save Changes' : 'Publish Demo Playlist'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
