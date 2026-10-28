import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import { useToast } from '../ui/Toast';
import { auth } from '../../config/firebase';
import authStore from '../../stores/authStore';
import { storageService } from '../../services/storageService';
import { postService } from '../../services/postService';
import { storyService } from '../../services/storyService';
import { reelService } from '../../services/reelService';

const MODES = [
  { id: 'story', label: 'Story', subtitle: '24-hour underground signal' },
  { id: 'post', label: 'Post', subtitle: 'Permanent photo signal' },
  { id: 'klyp', label: 'Klyp', subtitle: 'Short vertical video' }
];

export default function CameraModal({ open, onClose, defaultMode = 'story' }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState(defaultMode);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // Recording & Capture States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState(null); // { url, blob, type: 'image'|'video' }
  const [caption, setCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera when open
  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [open, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera API is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCamera(true);
    } catch (err) {
      console.warn('[CameraModal] Camera access error:', err);
      // Try video-only fallback (no microphone permission)
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
        streamRef.current = videoOnlyStream;
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream;
          videoRef.current.play().catch(() => {});
        }
        setHasCamera(true);
      } catch (err2) {
        setHasCamera(false);
        setCameraError(err2.message || 'Camera permission denied or camera unavailable.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetState = () => {
    setCapturedMedia(null);
    setCaption('');
    setIsRecording(false);
    setRecordingSeconds(0);
    setIsPublishing(false);
  };

  const toggleLens = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Photo Capture via Canvas
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext('2d');

    // Flip horizontally if front camera for natural selfie look
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const previewUrl = URL.createObjectURL(blob);
        setCapturedMedia({
          url: previewUrl,
          blob,
          type: 'image'
        });
      }
    }, 'image/jpeg', 0.92);
  };

  // Video Recording via MediaRecorder
  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
      }
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, options);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const previewUrl = URL.createObjectURL(blob);
        setCapturedMedia({
          url: previewUrl,
          blob,
          type: 'video'
        });
        setIsRecording(false);
        setRecordingSeconds(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 59;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      showToast('Could not start video recorder: ' + e.message, 'error');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Gallery File Selection Fallback
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const previewUrl = URL.createObjectURL(file);
    setCapturedMedia({
      url: previewUrl,
      blob: file,
      type: isVideo ? 'video' : 'image'
    });
  };

  // Direct Media Publishing
  const handlePublish = async () => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      showToast('You must be logged in to publish signals.', 'error');
      return;
    }

    if (!capturedMedia) return;

    setIsPublishing(true);
    try {
      const user = authStore.getState().user;
      const me = auth.currentUser;
      const username = user?.username || me?.displayName || 'selector';
      const avatar = user?.profilePic || user?.profile_pic || me?.photoURL || '';
      const role = user?.role || 'dj';

      if (mode === 'story') {
        const mediaUrl = await storageService.uploadStoryMedia(currentUid, capturedMedia.blob);
        await storyService.createStory(
          currentUid,
          username,
          avatar,
          mediaUrl,
          capturedMedia.type,
          { caption: caption.trim() }
        );
        showToast('Story broadcasted to underground radar! 🔥', 'success');
      } else if (mode === 'post') {
        const mediaUrl = await storageService.uploadPostMedia(currentUid, capturedMedia.blob);
        await postService.createPost(
          currentUid,
          username,
          avatar,
          role,
          mediaUrl,
          capturedMedia.type,
          caption.trim()
        );
        showToast('Post live on global feed! 🔥', 'success');
      } else if (mode === 'klyp') {
        const videoUrl = await storageService.uploadReelVideo(currentUid, capturedMedia.blob);
        await reelService.createReel(
          currentUid,
          username,
          avatar,
          role,
          videoUrl,
          caption.trim(),
          { durationSeconds: recordingSeconds || 15 }
        );
        showToast('Klyp dropped into underground stream! 🔥', 'success');
      }

      onClose();
    } catch (err) {
      console.error('[CameraModal] Publish error:', err);
      showToast(err.message || 'Could not publish media.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 sm:p-4 backdrop-blur-md select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-[#09090B] sm:h-[90vh] sm:rounded-3xl sm:border sm:border-white/10"
      >
        {/* Header Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/80"
            aria-label="Close"
          >
            <IconsaxAnimated name="close" size={20} />
          </button>

          {isRecording && (
            <div className="flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-xs font-black uppercase text-white shadow-lg animate-pulse">
              <span className="h-2 w-2 rounded-full bg-white" />
              <span>00:{String(recordingSeconds).padStart(2, '0')}</span>
            </div>
          )}

          {!capturedMedia && hasCamera && (
            <button
              onClick={toggleLens}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/80"
              aria-label="Flip Camera Lens"
              title="Flip Camera"
            >
              <IconsaxAnimated name="refresh" size={20} />
            </button>
          )}
        </div>

        {/* Viewfinder or Media Preview */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {capturedMedia ? (
            <div className="relative h-full w-full flex items-center justify-center bg-black">
              {capturedMedia.type === 'video' ? (
                <video
                  src={capturedMedia.url}
                  className="h-full w-full object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={capturedMedia.url}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          ) : hasCamera ? (
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
              playsInline
              autoPlay
              muted
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
              <div className="h-16 w-16 rounded-full bg-[#DFE104]/10 text-[#DFE104] grid place-items-center mb-4">
                <IconsaxAnimated name="camera" size={32} />
              </div>
              <h3 className="text-lg font-black uppercase text-white">Live Camera Unavailable</h3>
              <p className="mt-2 text-xs text-zinc-400">
                {cameraError || 'Allow camera permission or select photos/videos directly from your device.'}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 rounded-2xl bg-[#DFE104] px-6 py-3 text-xs font-black uppercase text-black hover:bg-[#c2c403] active:scale-95 transition-all"
              >
                Select Media from Device
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Picker Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept={mode === 'klyp' ? 'video/*' : 'image/*,video/*'}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Bottom Panel */}
        <div className="relative z-20 bg-gradient-to-t from-black via-black/90 to-transparent p-4 sm:p-5">
          {capturedMedia ? (
            /* Review & Publish Controls */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#DFE104]/20 border border-[#DFE104]/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#DFE104]">
                  Ready to post to {mode}
                </span>
                <button
                  onClick={resetState}
                  className="text-xs font-bold text-zinc-400 hover:text-white underline"
                >
                  Retake / Cancel
                </button>
              </div>

              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption or credit underground artists..."
                className="w-full rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#DFE104] focus:outline-none"
              />

              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#DFE104] py-3.5 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-[#c2c403] active:scale-95 disabled:opacity-50"
              >
                {isPublishing ? (
                  <div className="h-5 w-5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Publish {mode.toUpperCase()}</span>
                    <span>🔥</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Camera Live Capture Controls */
            <div className="space-y-4">
              {/* Shutter row */}
              <div className="flex items-center justify-between px-6">
                {/* Gallery Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 active:scale-90 transition-transform"
                  aria-label="Pick from gallery"
                  title="Gallery upload"
                >
                  <IconsaxAnimated name="gallery" size={22} />
                </button>

                {/* Shutter Button */}
                <div className="relative">
                  {mode === 'klyp' ? (
                    /* Video record button */
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${
                        isRecording ? 'border-red-500 animate-pulse' : 'border-[#DFE104]'
                      } p-1 transition-transform active:scale-90`}
                      aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                    >
                      <span
                        className={`h-full w-full rounded-full transition-all ${
                          isRecording ? 'h-7 w-7 rounded-md bg-red-600' : 'bg-[#DFE104]'
                        }`}
                      />
                    </button>
                  ) : (
                    /* Photo capture button */
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#DFE104] p-1 transition-transform active:scale-90"
                      aria-label="Capture Photo"
                    >
                      <span className="h-full w-full rounded-full bg-white" />
                    </button>
                  )}
                </div>

                {/* File picker button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-[#DFE104] backdrop-blur hover:bg-white/20 active:scale-90 transition-transform"
                  aria-label="Upload File"
                  title="Upload File"
                >
                  <IconsaxAnimated name="document-upload" size={22} />
                </button>
              </div>

              {/* Mode Selector Tabs: STORY | POST | KLYP */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {MODES.map((m) => {
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
                        isSelected
                          ? 'bg-[#DFE104] text-black shadow-[0_0_15px_rgba(223,225,4,0.3)]'
                          : 'bg-transparent text-zinc-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

