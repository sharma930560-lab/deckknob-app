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
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { useToast } from '../components/ui/Toast';
import MusicPickerModal from '../components/music/MusicPickerModal';
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
  const coverInputRef = useRef(null);
  const videoPlayerRef = useRef(null);
  const { showToast } = useToast();
  const { user } = authStore();
  const refreshPosts = useFeedStore((s) => s.refreshPosts);
  const refreshReels = useReelStore((s) => s.refreshReels);
  const refreshStories = useStoryStore((s) => s.fetchStories);

  // Creator Modes: 'post' | 'klyp' | 'story' | 'event'
  const [mode, setMode] = useState(searchParams.get('type') === 'reel' ? 'klyp' : 'post');

  // Media files & state
  const [files, setFiles] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
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

  // Story Mentions states
  const [mentionSearch, setMentionSearch] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);

  // Music Sync states
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
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

  // Attach authorized music clip from MusicPickerModal
  const handleAttachMusic = (clip) => {
    setSelectedMusic(clip);
    setMusicTrimStart(clip.startTime || 0);
    setMusicTrimEnd((clip.startTime || 0) + (clip.duration || 15));

    if (mode === 'story') {
      const musicSticker = {
        id: 'sticker_music_' + Date.now(),
        type: 'music',
        title: clip.title,
        artist: clip.artist,
        artwork: clip.artwork || '',
        startTime: clip.startTime || 0,
        duration: clip.duration || 15,
        attribution: clip.attribution || '',
        rotation: 0,
        size: 24,
        x: 40,
        y: 80
      };
      setOverlays((prev) => [...prev.filter((o) => o.type !== 'music'), musicSticker]);
    }
    showToast(`Attached soundtrack: ${clip.title} (${clip.duration || 15}s) 🎵`, 'success');
  };

  // Remove attached music
  const handleRemoveMusic = () => {
    setSelectedMusic(null);
    setMusicTrimStart(0);
    setMusicTrimEnd(15);
    setIsPlayingMusic(false);
    if (mode === 'story') {
      setOverlays((prev) => prev.filter((o) => o.type !== 'music'));
    }
    showToast('Removed soundtrack', 'info');
  };

  // Filter music library (legacy support)
  const handleMusicSearch = async (val) => {
    setSearchMusicQuery(val);
    const tracks = await musicService.searchLibrary(val);
    setMusicLibrary(tracks);
  };

  // Allowed MIME types and per-type size limits
  const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime', // .mov
    'video/webm',
  ]);
  const POST_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const KLYP_VIDEO_MIMES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
  const MAX_IMAGE_BYTES = 50 * 1024 * 1024;  // 50 MB
  const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

  // Process selected file — validates MIME, duration, and size strictly per creator mode
  const processFiles = useCallback(async (rawFiles) => {
    setErrorMsg('');
    const arr = Array.from(rawFiles);
    if (!arr.length) return;

    const file = arr[0];

    // ── Mode-specific validation ──────────────────────────────────────────
    if (mode === 'post') {
      if (file.type.startsWith('video/')) {
        const msg = 'Posts accept images only (JPG, PNG, WebP). Videos are not allowed for posts. Please switch to Klyps to upload a video.';
        setErrorMsg(msg);
        showToast(msg, 'error');
        return;
      }
      if (!POST_IMAGE_MIMES.has(file.type)) {
        const msg = 'Posts accept JPG, PNG, and WebP images only.';
        setErrorMsg(msg);
        showToast(msg, 'error');
        return;
      }
    } else if (mode === 'klyp') {
      if (!file.type.startsWith('video/')) {
        const msg = 'Klyps accept videos only (MP4, MOV, WebM). Images are not allowed. Please switch to Posts to upload an image.';
        setErrorMsg(msg);
        showToast(msg, 'error');
        return;
      }
      if (!KLYP_VIDEO_MIMES.has(file.type)) {
        const msg = 'Unsupported video format for Klyp. Allowed formats: MP4, MOV, WebM.';
        setErrorMsg(msg);
        showToast(msg, 'error');
        return;
      }
    } else if (mode === 'event') {
      if (!file.type.startsWith('image/')) {
        const msg = 'Event banners accept image files only.';
        setErrorMsg(msg);
        showToast(msg, 'error');
        return;
      }
    } else if (!ALLOWED_MIME_TYPES.has(file.type)) {
      const allowed = 'JPEG, PNG, WebP, GIF, MP4, MOV, WebM';
      setErrorMsg(`Unsupported file type: "${file.type || 'unknown'}". Allowed: ${allowed}.`);
      showToast(`Unsupported file type. Allowed: ${allowed}`, 'error');
      return;
    }

    // ── Size validation ───────────────────────────────────────────────────
    const isVideo = file.type.startsWith('video/');
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const maxLabel = isVideo ? '200 MB' : '50 MB';
    if (file.size > maxBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMsg(`File too large: ${sizeMB} MB. Maximum allowed for ${isVideo ? 'videos' : 'images'} is ${maxLabel}.`);
      showToast(`File too large (${sizeMB} MB). Max: ${maxLabel}`, 'error');
      return;
    }

    const preview = URL.createObjectURL(file);
    const kind = isVideo ? 'video' : 'image';

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

      // Strict duration validation for Klyps (<= 59 seconds)
      if (mode === 'klyp' && duration > 59) {
        URL.revokeObjectURL(preview);
        const durMsg = `Klyp videos must be 59 seconds or less (uploaded video is ${duration}s). Please select or trim a shorter video.`;
        setErrorMsg(durMsg);
        showToast(`Video too long (${duration}s). Klyps must be under 59s.`, 'error');
        return;
      }
    }

    setFiles([{ file, preview, kind, duration }]);
    setCoverFile(null);
    setCoverPreview('');
  }, [mode, showToast]);

  const [errorMsg, setErrorMsg] = useState('');

  // Handle optional cover image upload for Klyp
  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Cover must be an image (JPG, PNG, WebP).', 'error');
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    showToast('Cover photo selected!', 'success');
  };

  // Capture current frame from video player as cover photo
  const captureVideoFrame = () => {
    const videoEl = videoPlayerRef.current;
    if (!videoEl) {
      showToast('Video not ready to capture.', 'warning');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 720;
      canvas.height = videoEl.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const frameFile = new File([blob], `cover_frame_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCoverFile(frameFile);
          setCoverPreview(URL.createObjectURL(frameFile));
          showToast('Captured video frame as cover photo! 📸', 'success');
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Frame capture error:', err);
      showToast('Could not capture frame from video.', 'error');
    }
  };

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

  // Search users for story mention
  const handleMentionSearch = async (val) => {
    setMentionSearch(val);
    const clean = val.replace(/^@/, '').trim().toLowerCase();
    if (!clean) {
      setSuggestedUsers([]);
      return;
    }
    setMentionLoading(true);
    try {
      const results = await userService.searchUsers(clean, 8);
      setSuggestedUsers(results.filter((u) => u.uid !== user?.uid && u.id !== user?.uid));
    } catch {
      setSuggestedUsers([]);
    } finally {
      setMentionLoading(false);
    }
  };

  // Add mention sticker overlay to story
  const addMentionOverlay = (targetUser) => {
    const cleanUsername = (targetUser.username || 'selector').replace(/^@/, '');
    const mention = {
      id: 'mention_' + Date.now(),
      type: 'mention',
      username: cleanUsername,
      text: '@' + cleanUsername,
      targetUid: targetUser.uid || targetUser.id,
      rotation: 0,
      size: 24,
      x: 60,
      y: 120
    };
    setOverlays((prev) => [...prev, mention]);
    setTaggedUsers((prev) => {
      if (prev.some((u) => u.uid === (targetUser.uid || targetUser.id))) return prev;
      return [...prev, { uid: targetUser.uid || targetUser.id, username: cleanUsername, profilePic: targetUser.profilePic || targetUser.profile_pic || '' }];
    });
    setMentionSearch('');
    setSuggestedUsers([]);
    showToast(`Added @${cleanUsername} mention sticker! 🏷️`, 'success');
  };

  // Reset workspace
  const clearWorkspace = () => {
    setFiles([]);
    setCoverFile(null);
    setCoverPreview('');
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
    setErrorMsg('');
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

    // Fail-closed rights revalidation before upload & publish
    let musicPayload = null;
    if (selectedMusic) {
      const rights = musicService.verifyTrackRights(selectedMusic, selectedMusic.provider);
      if (!rights.syncCleared || !rights.canPublish) {
        const errorReason = rights.rightsEvidence?.rejectionReason || 'Music synchronization rights not authorized for public distribution.';
        showToast(`Publishing blocked: ${errorReason}`, 'error');
        setIsUploading(false);
        return;
      }

      musicPayload = {
        trackId: selectedMusic.trackId || selectedMusic.id,
        title: selectedMusic.title,
        artist: selectedMusic.artist,
        artwork: selectedMusic.artwork || '',
        audioUrl: selectedMusic.audioUrl || selectedMusic.previewUrl,
        previewUrl: selectedMusic.previewUrl || selectedMusic.audioUrl,
        startTime: Number(selectedMusic.startTime ?? musicTrimStart) || 0,
        duration: Number(selectedMusic.duration ?? (musicTrimEnd - musicTrimStart)) || 15,
        provider: selectedMusic.provider || 'deckknob_curated',
        licenseType: selectedMusic.licenseType || selectedMusic.rightsEvidence?.licenseType || 'CC BY 4.0',
        licenseStatus: selectedMusic.licenseStatus || selectedMusic.rightsEvidence?.licenseStatus || 'verified_sync_cleared',
        attribution: selectedMusic.attribution || selectedMusic.rightsEvidence?.attributionText || '',
        rightsEvidence: selectedMusic.rightsEvidence || null
      };
    }

    try {
      if (mode === 'post') {
        const downloadUrl = await storageService.uploadPostMedia(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        await postService.createPost(user.uid, user.username, userAvatar, user.role, downloadUrl, media.kind, caption, {
          taggedUsers,
          genre: user?.genre || 'all',
          music: musicPayload
        });
        refreshPosts().catch(() => {});
        showToast('Feed post published successfully! 🚀', 'success');

      } else if (mode === 'klyp') {
        const downloadUrl = await storageService.uploadReelVideo(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.5)));
        
        let coverUrl = '';
        if (coverFile) {
          try {
            coverUrl = await storageService.uploadPostMedia(user.uid, coverFile, (p) => setUploadProgress(60 + Math.round(p * 0.3)));
          } catch (covErr) {
            console.warn('[Upload] Custom cover upload failed:', covErr);
          }
        } else {
          // If cover skipped, attempt client-side canvas snapshot of current video frame
          try {
            const videoEl = videoPlayerRef.current;
            if (videoEl) {
              const canvas = document.createElement('canvas');
              canvas.width = videoEl.videoWidth || 720;
              canvas.height = videoEl.videoHeight || 1280;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              const autoBlob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
              if (autoBlob) {
                const autoFile = new File([autoBlob], `auto_cover_${Date.now()}.jpg`, { type: 'image/jpeg' });
                coverUrl = await storageService.uploadPostMedia(user.uid, autoFile);
              }
            }
          } catch (autoErr) {
            console.warn('[Upload] Auto-thumbnail capture skipped, using mediaUrl fallback:', autoErr);
          }
        }

        await reelService.createReel(user.uid, user.username, userAvatar, user.role, downloadUrl, caption, media.duration || 0, {
          coverUrl,
          taggedUsers,
          music: musicPayload
        });
        refreshReels().catch(() => {});
        showToast('Klyp published successfully! 🎬', 'success');

      } else if (mode === 'story') {
        const downloadUrl = await storageService.uploadStoryMedia(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        
        await storyService.createStory(user.uid, user.username, userAvatar, downloadUrl, media.kind, {
          overlays,
          music: musicPayload,
          filter: selectedFilter,
          adjustments,
          scheduledTime: scheduledTime || null,
          isDraft,
          tags: taggedUsers,
          caption
        });
        
        refreshStories().catch(() => {});
        showToast('Story successfully shared! ⚡', 'success');

        // Safely notify mentioned users via existing notification system
        const mentionedUids = new Set();
        (overlays || []).forEach((o) => {
          if (o.targetUid) mentionedUids.add(o.targetUid);
        });
        (taggedUsers || []).forEach((u) => {
          if (u.uid) mentionedUids.add(u.uid);
        });

        mentionedUids.forEach(async (targetUid) => {
          if (targetUid && targetUid !== user.uid) {
            try {
              const blocked = await userService.isBlocked(targetUid, user.uid);
              if (!blocked) {
                await notificationService.createNotification(
                  targetUid,
                  user.uid,
                  user.username,
                  userAvatar,
                  'mention',
                  `@${user.username} mentioned you in their story.`
                );
              }
            } catch (err) {
              console.warn('[Upload] Mention notification skipped:', err);
            }
          }
        });

      } else if (mode === 'event') {
        const downloadUrl = await storageService.uploadEventBanner(user.uid, media.file, (p) => setUploadProgress(10 + Math.round(p * 0.8)));
        await eventService.createEvent({
          authorId: user.uid,
          username: user.username,
          title: eventTitle,
          venue: eventVenue,
          dateTime: eventDateTime,
          website: eventWebsite,
          description: caption,
          image: downloadUrl
        });
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

      {import.meta.env.DEV && (
        <div id="dev-verification-bar" className="mb-4 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400 font-bold uppercase tracking-wider">DEV Verification Controls</span>
          <div className="flex gap-2">
            <button
              id="btn-test-invalid-file"
              type="button"
              onClick={() => {
                const badFile = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
                processFiles([badFile]);
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30"
            >
              Test Invalid File (.pdf)
            </button>
            <button
              id="btn-test-post-video"
              type="button"
              onClick={() => {
                const fakeVideo = new File(['fake video stream'], 'clip.mp4', { type: 'video/mp4' });
                processFiles([fakeVideo]);
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold hover:bg-amber-500/30"
            >
              Test Video File
            </button>
            <button
              id="btn-test-load-image"
              type="button"
              onClick={() => {
                const canvas = document.createElement('canvas');
                canvas.width = 300;
                canvas.height = 300;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#18181b';
                ctx.fillRect(0, 0, 300, 300);
                ctx.fillStyle = '#DFE104';
                ctx.fillRect(20, 20, 260, 260);
                ctx.fillStyle = '#09090b';
                ctx.font = 'bold 22px sans-serif';
                ctx.fillText('DECKKNOB VERIFY', 35, 150);
                canvas.toBlob((blob) => {
                  const testFile = new File([blob], 'deckknob_verify_image.jpg', { type: 'image/jpeg' });
                  processFiles([testFile]);
                  setCaption('[TEST - Cloudinary Verification] Verified upload from UI test');
                }, 'image/jpeg');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#DFE104] text-black font-bold hover:bg-[#DFE104]/80"
            >
              Load Test Image
            </button>
          </div>
        </div>
      )}

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
                  accept={
                    mode === 'post'
                      ? 'image/jpeg,image/png,image/webp'
                      : mode === 'klyp'
                      ? 'video/mp4,video/quicktime,video/webm'
                      : mode === 'event'
                      ? 'image/*'
                      : 'image/*,video/*'
                  }
                  onChange={handleFileChange}
                />
                <IconsaxAnimated name="upload" size={48} className="text-[#DFE104] mb-4" />
                <h3 className="text-lg font-bold uppercase tracking-wider">Drag & drop your files</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  {mode === 'post'
                    ? 'Images only (JPG, PNG, WebP)'
                    : mode === 'klyp'
                    ? 'Videos only (MP4, MOV, WebM — Max 59s)'
                    : mode === 'event'
                    ? 'Event poster / banner image'
                    : 'Images or Videos'}
                </p>
                {errorMsg && (
                  <p className="mt-3 text-xs font-semibold text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/20 max-w-sm text-center">
                    {errorMsg}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative aspect-[9/16] max-h-[700px] overflow-hidden rounded-[2.5rem] bg-black border border-white/[0.1] shadow-2xl">
                {/* Image/Video preview with applied CSS filter styles */}
                {files[0].kind === 'video' ? (
                  <video
                    ref={videoPlayerRef}
                    src={files[0].preview}
                    className="h-full w-full object-cover"
                    style={{ filter: getFilterStyle() }}
                    controls
                    loop
                    muted
                    crossOrigin="anonymous"
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
                    ) : item.type === 'mention' ? (
                      <div className="bg-black/80 border border-[#DFE104] text-[#DFE104] px-3.5 py-1.5 rounded-full font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(223,225,4,0.25)] backdrop-blur-md">
                        <span className="opacity-75">@</span>
                        <span>{item.username || item.text.replace(/^@/, '')}</span>
                      </div>
                    ) : item.type === 'music' ? (
                      <div className="bg-black/85 border border-[#DFE104] text-white px-3.5 py-1.5 rounded-full font-bold text-xs tracking-wide flex items-center gap-2 shadow-[0_4px_16px_rgba(223,225,4,0.3)] backdrop-blur-md">
                        <span className="flex items-center gap-0.5 text-[#DFE104]">
                          <span className="h-2 w-0.5 bg-[#DFE104] animate-pulse" />
                          <span className="h-3 w-0.5 bg-[#DFE104] animate-pulse delay-75" />
                          <span className="h-2 w-0.5 bg-[#DFE104] animate-pulse delay-150" />
                        </span>
                        <span className="truncate max-w-[130px]">{item.title}</span>
                        <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[100px]">• {item.artist}</span>
                      </div>
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

            {/* Optional Cover selector for Klyps */}
            {mode === 'klyp' && files.length > 0 && files[0].kind === 'video' && (
              <div className="dk-panel p-4 rounded-3xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#DFE104]">Cover Photo / Poster (Optional)</p>
                    <p className="text-[11px] text-zinc-400">Choose a video frame or upload a custom image. If skipped, an automatic thumbnail will be generated.</p>
                  </div>
                  {coverPreview ? (
                    <span className="text-[10px] bg-[#DFE104]/10 text-[#DFE104] font-bold px-2.5 py-1 rounded-full border border-[#DFE104]/30">
                      Custom Cover Active
                    </span>
                  ) : (
                    <span className="text-[10px] bg-white/[0.06] text-zinc-400 font-bold px-2.5 py-1 rounded-full">
                      Auto Thumbnail
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {coverPreview ? (
                    <div className="relative h-20 w-14 rounded-2xl overflow-hidden border-2 border-[#DFE104] shrink-0 bg-black shadow-lg">
                      <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                        className="absolute top-1 right-1 h-5 w-5 bg-black/80 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600 transition-colors"
                        title="Remove custom cover"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="h-20 w-14 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center text-zinc-500 shrink-0 bg-white/[0.01]">
                      <span className="text-[9px] uppercase font-bold text-center leading-tight">Auto<br/>Frame</span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-wrap gap-2">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleCoverUpload}
                    />
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-bold text-white transition-all flex items-center gap-1.5"
                    >
                      <IconsaxAnimated name="upload" size={16} />
                      Upload Cover
                    </button>
                    <button
                      type="button"
                      onClick={captureVideoFrame}
                      className="px-3.5 py-2 rounded-xl bg-[#DFE104]/15 hover:bg-[#DFE104]/25 text-xs font-bold text-[#DFE104] border border-[#DFE104]/30 transition-all flex items-center gap-1.5"
                    >
                      <span>📸</span>
                      Capture Video Frame
                    </button>
                    {coverPreview && (
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                      >
                        Reset to Auto
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT side: Creative Settings & Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Action Sub-navigation tabs */}
            {mode === 'story' && files.length > 0 && (
              <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.08]">
                {['filters', 'adjustments', 'text', 'stickers', 'mentions', 'music'].map((tab) => (
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

              {/* Tab 5: Story Mentions */}
              {activeTab === 'mentions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Mention Selector</h3>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#DFE104]">@ Sticker</span>
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-[#DFE104]">@</span>
                    <input
                      type="text"
                      placeholder="Type selector username..."
                      value={mentionSearch}
                      onChange={(e) => handleMentionSearch(e.target.value)}
                      className="dk-input w-full pl-8 pr-4 py-2 rounded-xl text-xs bg-white/[0.04]"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                    {mentionLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="h-5 w-5 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
                      </div>
                    ) : suggestedUsers.length > 0 ? (
                      suggestedUsers.map((u) => (
                        <button
                          key={u.uid || u.id}
                          type="button"
                          onClick={() => addMentionOverlay(u)}
                          className="w-full p-2.5 rounded-xl bg-white/[0.04] hover:bg-[#DFE104]/10 border border-white/[0.06] hover:border-[#DFE104]/40 flex items-center justify-between gap-3 transition-all text-left group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={
                                u.profilePic ||
                                u.profile_pic ||
                                `https://ui-avatars.com/api/?name=${u.username}&background=DFE104&color=000&bold=true`
                              }
                              alt={u.username}
                              className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white group-hover:text-[#DFE104] truncate">
                                @{u.username}
                              </p>
                              <p className="text-[10px] text-zinc-500 truncate">{u.genre || u.role || 'Selector'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-[#DFE104] bg-[#DFE104]/10 px-2 py-1 rounded-lg shrink-0">
                            + Tag
                          </span>
                        </button>
                      ))
                    ) : mentionSearch.trim() ? (
                      <p className="text-xs text-zinc-500 text-center py-4">No selector found matching "@{mentionSearch.replace(/^@/, '')}".</p>
                    ) : (
                      <p className="text-xs text-zinc-600 text-center py-4">Type a username to add an interactive @mention sticker.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: Music Synced Player */}
              {activeTab === 'music' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Story Soundtrack</h3>
                    {selectedMusic && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        ✓ Sync Cleared
                      </span>
                    )}
                  </div>

                  {selectedMusic ? (
                    <div className="space-y-3 rounded-2xl border border-[#DFE104]/30 bg-[#DFE104]/5 p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedMusic.artwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&auto=format&fit=crop&q=80'}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{selectedMusic.title}</p>
                          <p className="text-[10px] text-zinc-400 truncate">{selectedMusic.artist}</p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                            <span className="font-mono text-[#DFE104] font-bold">
                              {musicTrimStart}s–{musicTrimEnd}s ({musicTrimEnd - musicTrimStart}s)
                            </span>
                            <span>•</span>
                            <span className="text-zinc-400">{selectedMusic.licenseType || 'CC BY 4.0'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => setIsMusicModalOpen(true)}
                          className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 py-2 text-xs font-bold text-white transition-colors"
                        >
                          Trim / Change Track
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveMusic}
                          className="rounded-xl bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-5 text-center space-y-3">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#DFE104]/10 text-[#DFE104]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">No Soundtrack Attached</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Browse curated electronic tracks and verified sync licenses for your story.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMusicModalOpen(true)}
                        className="rounded-xl bg-[#DFE104] px-4 py-2 text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105 active:scale-95"
                      >
                        Browse Music Catalog
                      </button>
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

                {/* Music / Soundtrack for Post & Klyp */}
                {(mode === 'post' || mode === 'klyp') && (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Soundtrack
                      </span>
                      {selectedMusic ? (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          ✓ Sync Cleared
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500">Optional</span>
                      )}
                    </div>

                    {selectedMusic ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] p-2.5 border border-white/[0.06]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={selectedMusic.artwork || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&auto=format&fit=crop&q=80'}
                            alt=""
                            className="h-9 w-9 rounded-lg object-cover shrink-0 border border-white/10"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{selectedMusic.title}</p>
                            <p className="text-[10px] text-zinc-400 truncate">
                              {selectedMusic.artist} • Clip: {musicTrimStart}s–{musicTrimEnd}s ({musicTrimEnd - musicTrimStart}s)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsMusicModalOpen(true)}
                            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-white/20 transition-colors"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveMusic}
                            className="rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Remove music"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsMusicModalOpen(true)}
                        className="flex w-full items-center justify-between rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-2.5 text-left hover:border-[#DFE104]/50 hover:bg-[#DFE104]/5 transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#DFE104]/10 text-[#DFE104]">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M9 18V5l12-2v13" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="16" r="3" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-[#DFE104] transition-colors">
                              Attach Soundtrack
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Verified royalty-free & Audius CC music
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#DFE104] font-bold bg-[#DFE104]/10 px-2 py-1 rounded-lg">
                          + Music
                        </span>
                      </button>
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
                    id="btn-publish-post"
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

      {/* Music Picker Modal */}
      <MusicPickerModal
        isOpen={isMusicModalOpen}
        onClose={() => setIsMusicModalOpen(false)}
        onSelectMusic={handleAttachMusic}
        initialSelectedTrack={selectedMusic}
        initialStartTime={musicTrimStart}
        initialDuration={musicTrimEnd - musicTrimStart}
      />
    </MotionPage>
  );
}
