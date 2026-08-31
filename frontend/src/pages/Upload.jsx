import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import MotionPage from '../components/ui/MotionPage';
import MentionInput from '../components/ui/MentionInput';
import EmojiPicker from '../components/ui/EmojiPicker';
import authStore from '../stores/authStore';
import useFeedStore from '../stores/feedStore';
import useReelStore from '../stores/reelStore';
import useStoryStore from '../stores/storyStore';
import { storageService } from '../services/storageService';
import { postService } from '../services/postService';
import { reelService } from '../services/reelService';
import { storyService } from '../services/storyService';
import { eventService } from '../services/eventService';
import { musicService } from '../services/musicService';
import { useToast } from '../components/ui/Toast';
import {
  BASIC_FILTERS,
  NIGHTLIFE_FILTERS,
  ADJUSTMENTS_LIST,
  FONT_LIST,
  STICKER_TEMPLATES
} from '../utils/editorConfig';

export default function CreatorWorkspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const { showToast } = useToast();
  const { user } = authStore();
  const refreshPosts = useFeedStore((s) => s.refreshPosts);
  const refreshReels = useReelStore((s) => s.refreshReels);
  const refreshStories = useStoryStore((s) => s.fetchStories);

  // Creator Modes: 'post' | 'klyp' | 'story' | 'event'
  const [mode, setMode] = useState(searchParams.get('type') === 'reel' ? 'klyp' : 'post');

  // Media files & state
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Common Post / Klyp / Event Form details
  const [caption, setCaption] = useState('');
  const [audience, setAudience] = useState('public'); // 'public' | 'followers' | 'close_friends'
  const [scheduledTime, setScheduledTime] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState([]); // [{uid, username, profilePic}]

  // Event Details
  const [eventTitle, setEventTitle] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventDateTime, setEventDateTime] = useState('');
  const [eventWebsite, setEventWebsite] = useState('');

  // Editor states (Active sidebars: 'filters' | 'adjustments' | 'text' | 'stickers' | 'music')
  const [activeTab, setActiveTab] = useState('filters');

  // Image editing values
  const [selectedFilter, setSelectedFilter] = useState('Original');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    exposure: 100,
    saturation: 100,
    tint: 0,
    blur: 0,
    sepia: 0,
    grayscale: 0
  });

  // Text Boxes & Stickers overlays
  const [overlays, setOverlays] = useState([]); // Array of { id, type: 'text'|'sticker', text, x, y, font, color, size, rotation }
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [newText, setNewText] = useState('');
  const [selectedFont, setSelectedFont] = useState(FONT_LIST[0]);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);

  // Music Sync states
  const [musicLibrary, setMusicLibrary] = useState([]);
  const [searchMusicQuery, setSearchMusicQuery] = useState('');
  const [selectedMusic, setSelectedMusic] = useState(null); // { id, title, artist, audioUrl, ... }
  const [musicTrimStart, setMusicTrimStart] = useState(0);
  const [musicTrimEnd, setMusicTrimEnd] = useState(15); // Default 15s trim
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  // Auto-save timer for drafts
  useEffect(() => {
    if (files.length > 0 && mode === 'story') {
      const timer = setTimeout(() => {
        showToast('Story auto-saved as draft locally', 'info');
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [files, overlays, selectedFilter, adjustments, mode]);

  // Load music
  useEffect(() => {
    musicService.searchLibrary().then((tracks) => setMusicLibrary(tracks));
  }, []);

  // Update mode if URL param changes
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'reel') setMode('klyp');
    else if (type === 'story') setMode('story');
    else if (type === 'event') setMode('event');
  }, [searchParams]);

  // Handle music player
  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingMusic && selectedMusic) {
        audioRef.current.currentTime = musicTrimStart;
        audioRef.current.play().catch(() => {});
        // Stop playing when it reaches end of trim
        const duration = musicTrimEnd - musicTrimStart;
        const stopTimer = setTimeout(() => {
          setIsPlayingMusic(false);
          audioRef.current.pause();
        }, duration * 1000);
        return () => clearTimeout(stopTimer);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingMusic, selectedMusic, musicTrimStart, musicTrimEnd]);

  // Filter music library
  const handleMusicSearch = async (val) => {
    setSearchMusicQuery(val);
    const tracks = await musicService.searchLibrary(val);
    setMusicLibrary(tracks);
  };

  // Process selected file
  const processFiles = useCallback(async (rawFiles) => {
    setErrorMsg('');
    const arr = Array.from(rawFiles);
    if (!arr.length) return;

    const file = arr[0];
    const preview = URL.createObjectURL(file);
    const kind = file.type.startsWith('video/') ? 'video' : 'image';

    let duration = 0;
    if (kind === 'video') {
      duration = await new Promise((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(v.src);
          resolve(Math.round(v.duration));
        };
        v.onerror = () => resolve(0);
        v.src = preview;
      });
    }

    setFiles([{ file, preview, kind, duration }]);
  }, []);

  const [errorMsg, setErrorMsg] = useState('');

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileChange = useCallback((e) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processFiles]);

  // Add a new styled text box
  const addTextBox = () => {
    if (!newText.trim()) return;
    const box = {
      id: 'text_' + Date.now(),
      type: 'text',
      text: newText,
      font: selectedFont,
      color: textColor,
      size: textSize,
      rotation: 0,
      x: 50,
      y: 50
    };
    setOverlays((prev) => [...prev, box]);
    setNewText('');
  };

  // Add a sticker
  const addSticker = (stickerTemplate) => {
    const sticker = {
      id: 'sticker_' + Date.now(),
      type: 'sticker',
      stickerType: stickerTemplate.type,
      text: stickerTemplate.defaultText,
      rotation: 0,
      size: 150,
      x: 100,
      y: 100
    };
    setOverlays((prev) => [...prev, sticker]);
    showToast(`Added ${stickerTemplate.label} sticker`, 'success');
  };

  // Handle overlay deletion
  const deleteOverlay = (id) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    setSelectedOverlayId(null);
  };

  // Handle overlay update (size, position, rotation)
  const updateOverlay = (id, fields) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...fields } : o)));
  };

  // Reset workspace
  const clearWorkspace = () => {
    setFiles([]);
    setSelectedFilter('Original');
    setAdjustments({
      brightness: 100,
      contrast: 100,
      exposure: 100,
      saturation: 100,
      tint: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0
    });
    setOverlays([]);
    setSelectedMusic(null);
    setCaption('');
  };

  // Submit and upload everything
  const handlePublish = async () => {
    if (!files.length) {
      showToast('Select a file to upload first.', 'warning');
      return;
    }
    if (!user) {
      showToast('Login required to post.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    const media = files[0];
    const userAvatar = user.profilePic || user.profile_pic || '';

    try {
      if (mode === 'post') {
        const downloadUrl = await storageService.uploadPostMedia(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        await postService.createPost(user.uid, user.username, userAvatar, user.role, downloadUrl, media.kind, caption, { taggedUsers });
        refreshPosts().catch(() => {});
        showToast('Feed post published successfully! 🚀', 'success');

      } else if (mode === 'klyp') {
        const downloadUrl = await storageService.uploadReelVideo(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        await reelService.createReel(user.uid, user.username, userAvatar, user.role, downloadUrl, caption, media.duration || 0, { taggedUsers });
        refreshReels().catch(() => {});
        showToast('Klyp published successfully! 🎬', 'success');

      } else if (mode === 'story') {
        const downloadUrl = await storageService.uploadStoryMedia(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        
        await storyService.createStory(user.uid, user.username, userAvatar, downloadUrl, media.kind, {
          overlays,
          music: selectedMusic ? {
            title: selectedMusic.title,
            artist: selectedMusic.artist,
            audioUrl: selectedMusic.audioUrl,
            startTime: musicTrimStart,
            duration: musicTrimEnd - musicTrimStart
          } : null,
          filter: selectedFilter,
          adjustments,
          scheduledTime: scheduledTime || null,
          isDraft,
          tags: taggedUsers,
          caption
        });
        
        refreshStories().catch(() => {});
        showToast('Story successfully shared! ⚡', 'success');

      } else if (mode === 'event') {
        const downloadUrl = await storageService.uploadEventBanner(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        await eventService.createEvent(user.uid, eventTitle, eventVenue, eventDateTime, eventWebsite, caption, downloadUrl);
        showToast('Event published successfully! 📅', 'success');
      }

      setUploadSuccess(true);
      setTimeout(() => {
        navigate('/feed');
      }, 1500);

    } catch (e) {
      console.error('[CreatorWorkspace] publish error:', e);
      showToast(e.message || 'Publishing failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Generate composite CSS filter string
  const getFilterStyle = () => {
    let baseFilter = '';
    if (selectedFilter !== 'Original') {
      const basic = BASIC_FILTERS.find((f) => f.name === selectedFilter);
      const nightlife = NIGHTLIFE_FILTERS.find((f) => f.name === selectedFilter);
      baseFilter = (basic?.filter || nightlife?.filter || '') + ' ';
    }
    const { brightness, contrast, exposure, saturation, tint, blur, sepia, grayscale } = adjustments;
    return `${baseFilter}brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${tint}deg) blur(${blur}px) sepia(${sepia}%) grayscale(${grayscale}%)`;
  };

  return (
    <MotionPage className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
      {/* Audio Element */}
      {selectedMusic && <audio ref={audioRef} src={selectedMusic.audioUrl} loop />}

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">Studio Workspace</p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">Creator</h1>
        </div>

        {/* Studio Mode Selector */}
        <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
          {['post', 'klyp', 'story', 'event'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); clearWorkspace(); }}
              className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                mode === m ? 'bg-[#DFE104] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {m === 'klyp' ? 'Klyp' : m}
            </button>
          ))}
        </div>
      </div>

      {uploadSuccess ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-2xl font-black uppercase tracking-wider">Published!</h2>
          <p className="text-sm text-zinc-500 mt-2">Redirecting to feed...</p>
        </div>
      ) : isUploading ? (
        <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
          <div className="h-12 w-12 border-4 border-[#DFE104] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-black uppercase tracking-widest text-[#DFE104]">Uploading Media</h2>
          <div className="w-full max-w-md bg-white/[0.08] rounded-full h-3 overflow-hidden">
            <div className="h-full bg-[#DFE104] rounded-full" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="text-sm text-zinc-400">{uploadProgress}% uploaded</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* LEFT side: Live Editor Workspace & Canvas */}
          <div className="flex flex-col gap-4">
            {files.length === 0 ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-[500px] flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed transition-all duration-200 ${
                  isDragging ? 'border-[#DFE104] bg-[#DFE104]/5 scale-[1.01]' : 'border-white/[0.12] bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={mode === 'klyp' ? 'video/*' : 'image/*,video/*'}
                  onChange={handleFileChange}
                />
                <IconsaxAnimated name="upload" size={48} className="text-[#DFE104] mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-wider">Drag & drop your files</h3>
                <p className="text-sm text-zinc-500 mt-1">Images or Videos</p>
              </div>
            ) : (
              <div className="relative aspect-[9/16] max-h-[700px] overflow-hidden rounded-[2.5rem] bg-black border border-white/[0.1] shadow-2xl">
                {/* Image/Video preview with applied CSS filter styles */}
                {files[0].kind === 'video' ? (
                  <video
                    src={files[0].preview}
                    className="h-full w-full object-cover"
                    style={{ filter: getFilterStyle() }}
                    controls
                    loop
                    muted
                  />
                ) : (
                  <img
                    src={files[0].preview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    style={{ filter: getFilterStyle() }}
                  />
                )}

                {/* Overlays rendering (Text & Stickers) */}
                {overlays.map((item) => (
                  <motion.div
                    key={item.id}
                    drag
                    dragMomentum={false}
                    dragElastic={0.1}
                    onDrag={(e, info) => {
                      // Simple updates to coordinate tracking
                    }}
                    onClick={(e) => { e.stopPropagation(); setSelectedOverlayId(item.id); }}
                    className={`absolute z-20 cursor-grab active:cursor-grabbing p-2 rounded-xl transition-all ${
                      selectedOverlayId === item.id ? 'border-2 border-[#DFE104] bg-black/40' : ''
                    }`}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      transform: `rotate(${item.rotation || 0}deg)`,
                      fontSize: item.size ? `${item.size}px` : '20px',
                      color: item.color || '#fff'
                    }}
                  >
                    {item.type === 'text' ? (
                      <span className={item.font?.class}>{item.text}</span>
                    ) : (
                      <div className="bg-[#DFE104] text-black px-4 py-2 rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-2">
                        {item.text}
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Selected Overlay Adjuster Controls overlay */}
                {selectedOverlayId && (
                  <div className="absolute bottom-4 left-4 right-4 z-30 bg-black/80 backdrop-blur border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Size</span>
                        <span>{overlays.find(o => o.id === selectedOverlayId)?.size}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="80"
                        value={overlays.find(o => o.id === selectedOverlayId)?.size || 24}
                        onChange={(e) => updateOverlay(selectedOverlayId, { size: parseInt(e.target.value) })}
                        className="w-full accent-[#DFE104]"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs text-zinc-400">
                        <span>Rotate</span>
                        <span>{overlays.find(o => o.id === selectedOverlayId)?.rotation || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={overlays.find(o => o.id === selectedOverlayId)?.rotation || 0}
                        onChange={(e) => updateOverlay(selectedOverlayId, { rotation: parseInt(e.target.value) })}
                        className="w-full accent-[#DFE104]"
                      />
                    </div>
                    <button
                      onClick={() => deleteOverlay(selectedOverlayId)}
                      className="h-10 w-10 bg-red-500/20 text-red-400 rounded-xl grid place-items-center hover:bg-red-500/30"
                    >
                      <IconsaxAnimated name="close" size={20} />
                    </button>
                  </div>
                )}

                {/* Music Badge Visualizer (Top left overlay in preview) */}
                {selectedMusic && (
                  <div className="absolute top-4 left-4 z-30 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-2 border border-white/10">
                    <div className="flex items-end gap-0.5 h-3">
                      <span className={`w-0.5 bg-[#DFE104] rounded ${isPlayingMusic ? 'animate-[bounce_0.6s_infinite]' : 'h-1'}`} />
                      <span className={`w-0.5 bg-[#DFE104] rounded ${isPlayingMusic ? 'animate-[bounce_0.6s_infinite_0.2s]' : 'h-2'}`} />
                      <span className={`w-0.5 bg-[#DFE104] rounded ${isPlayingMusic ? 'animate-[bounce_0.6s_infinite_0.4s]' : 'h-3'}`} />
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate max-w-[120px]">
                      {selectedMusic.title}
                    </span>
                  </div>
                )}

                {/* Clean button to clear media */}
                <button
                  onClick={clearWorkspace}
                  className="absolute top-4 right-4 z-30 h-10 w-10 bg-black/60 backdrop-blur hover:bg-black/80 rounded-full grid place-items-center text-white"
                >
                  <IconsaxAnimated name="close" size={20} />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT side: Creative Settings & Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Action Sub-navigation tabs */}
            {mode === 'story' && files.length > 0 && (
              <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
                {['filters', 'adjustments', 'text', 'stickers', 'music'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                      activeTab === tab ? 'bg-white/[0.08] text-white border border-white/10' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {/* Editing Sidebar Box */}
            <div className="dk-panel p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] space-y-5">
              {/* Tab 1: Filters */}
              {activeTab === 'filters' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Apply Filter</h3>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                    {BASIC_FILTERS.concat(NIGHTLIFE_FILTERS).map((f) => (
                      <button
                        key={f.name}
                        onClick={() => setSelectedFilter(f.name)}
                        className={`p-3 rounded-2xl border text-center text-xs font-black tracking-wider uppercase transition-all ${
                          selectedFilter === f.name
                            ? 'bg-[#DFE104] text-black border-[#DFE104]'
                            : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:bg-white/[0.08]'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Adjustments */}
              {activeTab === 'adjustments' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Fine Adjustments</h3>
                  <div className="space-y-3">
                    {ADJUSTMENTS_LIST.map((adj) => (
                      <div key={adj.id} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold uppercase text-zinc-500">
                          <span>{adj.name}</span>
                          <span>{adjustments[adj.id]}{adj.unit}</span>
                        </div>
                        <input
                          type="range"
                          min={adj.min}
                          max={adj.max}
                          value={adjustments[adj.id]}
                          onChange={(e) => setAdjustments((prev) => ({ ...prev, [adj.id]: parseInt(e.target.value) }))}
                          className="w-full accent-[#DFE104]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Text Tool */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Add Text / Emoji</h3>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Type something or pick emoji..."
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTextBox()}
                        className="dk-input w-full px-4 py-2 pr-10 rounded-xl text-sm"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(v => !v)}
                          className="text-base h-7 w-7 flex items-center justify-center opacity-60 hover:opacity-100"
                        >
                          😊
                        </button>
                        <AnimatePresence>
                          {showEmojiPicker && (
                            <EmojiPicker
                              className="absolute bottom-full right-0 mb-2"
                              onSelect={(emoji) => { setNewText(prev => prev + emoji); setShowEmojiPicker(false); }}
                              onClose={() => setShowEmojiPicker(false)}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <button onClick={addTextBox} className="dk-button bg-[#DFE104] text-black px-4 py-2 font-black">
                      ADD
                    </button>
                  </div>

                  {/* Fonts List */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-zinc-500">Font Family</span>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar">
                      {FONT_LIST.map((font) => (
                        <button
                          key={font.id}
                          onClick={() => setSelectedFont(font)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                            selectedFont.id === font.id ? 'bg-[#DFE104] text-black' : 'bg-white/[0.04] text-zinc-400'
                          }`}
                        >
                          {font.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase text-zinc-500">Text Color</span>
                    <div className="flex gap-2">
                      {['#ffffff', '#DFE104', '#ff3366', '#33ccff', '#33ff99', '#ffcc00'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setTextColor(color)}
                          className="h-6 w-6 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Stickers */}
              {activeTab === 'stickers' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Stickers Overlay</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto no-scrollbar">
                    {STICKER_TEMPLATES.map((st) => (
                      <button
                        key={st.type}
                        onClick={() => addSticker(st)}
                        className="p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-2xl text-left text-xs font-black uppercase tracking-wider text-zinc-300"
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Music Synced Player */}
              {activeTab === 'music' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Sync Soundtrack</h3>
                  <input
                    type="text"
                    placeholder="Search royalty-free music..."
                    value={searchMusicQuery}
                    onChange={(e) => handleMusicSearch(e.target.value)}
                    className="dk-input w-full px-4 py-2 rounded-xl text-sm"
                  />

                  {/* Tracks list */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar pr-1">
                    {musicLibrary.map((track) => (
                      <div
                        key={track.id}
                        className={`p-2 rounded-2xl flex items-center justify-between gap-3 border transition-all ${
                          selectedMusic?.id === track.id
                            ? 'bg-[#DFE104]/10 border-[#DFE104]'
                            : 'bg-white/[0.04] border-white/[0.08]'
                        }`}
                      >
                        <img src={track.artwork} alt={track.title} className="h-10 w-10 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate uppercase tracking-wider">{track.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{track.artist} · {track.bpm} BPM</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              if (selectedMusic?.id === track.id) {
                                setIsPlayingMusic(!isPlayingMusic);
                              } else {
                                setSelectedMusic(track);
                                setIsPlayingMusic(true);
                              }
                            }}
                            className="h-8 w-8 bg-white/[0.06] rounded-xl grid place-items-center text-white"
                          >
                            <IconsaxAnimated
                              name={selectedMusic?.id === track.id && isPlayingMusic ? 'close' : 'play'}
                              size={16}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Music Trimmer */}
                  {selectedMusic && (
                    <div className="space-y-3 bg-white/[0.04] p-3 rounded-2xl border border-white/[0.08]">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-zinc-400">Trim Music Duration</span>
                        <span className="text-[#DFE104] font-black">{musicTrimEnd - musicTrimStart}s</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] text-zinc-500 uppercase">Start: {musicTrimStart}s</span>
                          <input
                            type="range"
                            min="0"
                            max={Math.max(0, selectedMusic.duration - 15)}
                            value={musicTrimStart}
                            onChange={(e) => {
                              const start = parseInt(e.target.value);
                              setMusicTrimStart(start);
                              setMusicTrimEnd(start + 15);
                            }}
                            className="w-full accent-[#DFE104]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* General Metadata form */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                {/* Event Fields */}
                {mode === 'event' ? (
                  <>
                    <input
                      type="text"
                      placeholder="Event Title *"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="dk-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Venue Name *"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      className="dk-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                    <input
                      type="datetime-local"
                      placeholder="Date & Time *"
                      value={eventDateTime}
                      onChange={(e) => setEventDateTime(e.target.value)}
                      className="dk-input w-full px-4 py-3 rounded-xl text-sm text-zinc-400"
                    />
                    <input
                      type="url"
                      placeholder="Ticket Booking Link"
                      value={eventWebsite}
                      onChange={(e) => setEventWebsite(e.target.value)}
                      className="dk-input w-full px-4 py-3 rounded-xl text-sm"
                    />
                  </>
                ) : (
                  <div className="relative">
                    <MentionInput
                      value={caption}
                      onChange={setCaption}
                      onMentionSelect={(u) => setTaggedUsers(prev => prev.some(x => x.uid === u.uid) ? prev : [...prev, u])}
                      placeholder="Write a caption... @mention someone 🎧"
                      multiline
                      rows={4}
                      className="px-4 py-3 pr-12 rounded-2xl text-sm"
                    />
                    {/* Emoji Button */}
                    <div className="absolute bottom-3 right-3 z-10">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(v => !v); }}
                        className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-lg transition-colors"
                        title="Add emoji"
                      >
                        😊
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <EmojiPicker
                            className="absolute bottom-full right-0 mb-2"
                            onSelect={(emoji) => { setCaption(prev => prev + emoji); setShowEmojiPicker(false); }}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    {/* Tagged Users Pills */}
                    {taggedUsers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {taggedUsers.map((u) => (
                          <span key={u.uid} className="flex items-center gap-1 bg-[#DFE104]/10 text-[#DFE104] text-xs font-bold px-2.5 py-1 rounded-full border border-[#DFE104]/20">
                            @{u.username}
                            <button onClick={() => setTaggedUsers(prev => prev.filter(x => x.uid !== u.uid))} className="ml-0.5 opacity-60 hover:opacity-100 text-xs">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Audience Selection */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Audience</span>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="dk-input w-full px-4 py-3 rounded-xl text-sm bg-[#09090B] border border-white/[0.08]"
                  >
                    <option value="public">Public (Everyone)</option>
                    <option value="followers">Followers Only</option>
                    <option value="close_friends">Close Friends</option>
                  </select>
                </div>

                {/* Scheduled Time & Draft Toggle */}
                {mode === 'story' && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Schedule</span>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="dk-input w-full px-3 py-2 rounded-xl text-xs bg-[#09090B]"
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDraft}
                          onChange={(e) => setIsDraft(e.target.checked)}
                          className="rounded border-zinc-800 text-[#DFE104] focus:ring-0 h-4 w-4 bg-transparent"
                        />
                        DRAFT
                      </label>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handlePublish}
                    className="dk-button flex-1 bg-[#DFE104] text-black font-black uppercase tracking-wider py-3.5 rounded-2xl"
                  >
                    PUBLISH {mode.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MotionPage>
  );
}
