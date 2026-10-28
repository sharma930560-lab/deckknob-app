import { ParsedCaption } from '../components/feed/PostCard';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MotionPage from '../components/ui/MotionPage';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import AnimatedFireButton from '../components/common/AnimatedFireButton';
import useReelStore from '../stores/reelStore';
import { auth } from '../config/firebase';
import authStore from '../stores/authStore';
import { reelService } from '../services/reelService';
import { audioCoordinator } from '../services/musicService';
import { useToast } from '../components/ui/Toast';

function formatCommentTime(timestamp) {
  if (!timestamp) return 'just now';
  let date;
  if (timestamp?.toDate) date = timestamp.toDate();
  else if (timestamp instanceof Date) date = timestamp;
  else date = new Date(timestamp);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/* ─── Individual Reel Item (handles its own play/pause) ─── */
function ReelItem({ reel, index, onLike, onBookmark, isActive, isGlobalMuted, onToggleMute }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [burst, setBurst] = useState(false);
  const [burstPos, setBurstPos] = useState({ x: "50%", y: "50%" });
  const lastTapRef = useRef(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localCommentsCount, setLocalCommentsCount] = useState(reel.comments_count ?? 0);
  const { showToast } = useToast();

  // Reset manual pause when this video ceases to be active
  useEffect(() => {
    if (!isActive) {
      setManualPaused(false);
    }
  }, [isActive]);

  // Synchronize playback with isActive state & tab visibility
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    let isSubscribed = true;

    const playMedia = async () => {
      if (!isSubscribed) return;
      try {
        // If attached music is present, mute the raw video track so the selected music is featured
        video.muted = isGlobalMuted || Boolean(reel.music);

        if (audio && reel.music) {
          audio.muted = isGlobalMuted;
          audio.volume = 0.85;
          const startPos = Number(reel.music.startTime) || 0;
          if (Math.abs(audio.currentTime - startPos) > 0.5 && !isPlaying) {
            audio.currentTime = startPos;
          }
          audioCoordinator.startSession(`klyp_${reel.id}`, 'reel', () => {
            if (audioRef.current) audioRef.current.pause();
          });
        }

        const promise = video.play();
        if (promise !== undefined) {
          await promise;
          if (isSubscribed) {
            setIsPlaying(true);
            if (audio && reel.music) {
              audio.play().catch(() => {});
            }
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setIsPlaying(false);
          if (audio) audio.pause();
        }
      }
    };

    const pauseMedia = () => {
      video.pause();
      if (audio) audio.pause();
      audioCoordinator.stopSession(`klyp_${reel.id}`);
      if (isSubscribed) setIsPlaying(false);
    };

    if (isActive && !manualPaused && document.visibilityState === 'visible') {
      playMedia();
    } else {
      pauseMedia();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseMedia();
      } else if (isActive && !manualPaused) {
        playMedia();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.pause();
      if (audio) audio.pause();
      audioCoordinator.stopSession(`klyp_${reel.id}`);
    };
  }, [isActive, manualPaused, isGlobalMuted, reel.music, reel.id, isPlaying]);

  // Keep volume/muted synced with global mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isGlobalMuted || Boolean(reel.music);
    }
    if (audioRef.current && reel.music) {
      audioRef.current.muted = isGlobalMuted;
    }
  }, [isGlobalMuted, reel.music]);

  // Loop music clip with video playback
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video || !reel.music) return;

    const startPos = Number(reel.music.startTime) || 0;
    const clipDur = Number(reel.music.duration) || 15;
    const loopEnd = startPos + clipDur;

    const onAudioTimeUpdate = () => {
      if (audio.currentTime >= loopEnd) {
        audio.currentTime = startPos;
      }
    };

    const onVideoSeeked = () => {
      if (video.currentTime < 0.2) {
        audio.currentTime = startPos;
      }
    };

    audio.addEventListener('timeupdate', onAudioTimeUpdate);
    video.addEventListener('seeked', onVideoSeeked);

    return () => {
      audio.removeEventListener('timeupdate', onAudioTimeUpdate);
      video.removeEventListener('seeked', onVideoSeeked);
    };
  }, [reel.music]);

  const triggerFireBurst = (e) => {
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? (rect.left + rect.width / 2);
      const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? (rect.top + rect.height / 2);
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const pad = 56;
      const clampedX = Math.max(pad, Math.min(rect.width - pad, rawX));
      const clampedY = Math.max(pad, Math.min(rect.height - pad, rawY));
      setBurstPos({ x: `${clampedX}px`, y: `${clampedY}px` });
    }
    onLike(reel);
    setBurst(true);
    setTimeout(() => setBurst(false), 760);
  };

  const handleVideoClick = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap / click detected
      lastTapRef.current = 0;
      triggerFireBurst(e);
    } else {
      lastTapRef.current = now;
      togglePlay(e);
    }
  };

  const togglePlay = (e) => {
    e?.stopPropagation?.();
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    if (video.paused) {
      setManualPaused(false);
      video.play().then(() => {
        setIsPlaying(true);
        if (audio && reel.music) {
          audioCoordinator.startSession(`klyp_${reel.id}`, 'reel', () => {
            if (audioRef.current) audioRef.current.pause();
          });
          audio.play().catch(() => {});
        }
      }).catch(() => {});
    } else {
      setManualPaused(true);
      video.pause();
      if (audio) audio.pause();
      audioCoordinator.stopSession(`klyp_${reel.id}`);
      setIsPlaying(false);
    }
  };

  const handleOpenComments = async () => {
    setShowComments(true);
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const data = await reelService.getComments(reel.id);
        setComments(data);
      } catch {
        showToast('Could not load comments.', 'error');
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleSendComment = async (e) => {
    e?.preventDefault();
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      showToast('Log in to comment.', 'error');
      return;
    }
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const userProfile = authStore.getState().user;
      const me = auth.currentUser;
      const commenterUsername = userProfile?.username || me?.displayName || 'selector';
      const commenterAvatar = userProfile?.profilePic || userProfile?.profile_pic || me?.photoURL || '';

      const newComment = await reelService.addComment(
        reel.id,
        currentUid,
        commenterUsername,
        commenterAvatar,
        commentText.trim()
      );

      if (newComment) {
        setComments((prev) => [...prev, newComment]);
        setLocalCommentsCount((c) => c + 1);
        setCommentText('');
        showToast('Comment posted! 💬', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Could not post comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const avatar =
    reel.user?.profile_pic ||
    `https://ui-avatars.com/api/?name=${reel.user?.username || 'DJ'}&background=DFE104&color=000&bold=true`;

  return (
    <section
      ref={containerRef}
      data-reel-id={reel.id}
      className="reel-item-container relative h-[calc(100dvh-4rem)] snap-start overflow-hidden bg-black lg:h-screen select-none"
    >
      {/* Video or Fallback Poster */}
      {!hasError ? (
        <>
          <video
            ref={videoRef}
            src={reel.media_url || reel.mediaUrl}
            poster={reel.poster}
            className="h-full w-full object-cover cursor-pointer"
            muted={isGlobalMuted || Boolean(reel.music)}
            loop
            playsInline
            preload="metadata"
            onClick={handleVideoClick}
            onDoubleClick={(e) => {
              e.stopPropagation();
              triggerFireBurst(e);
            }}
            onError={() => setHasError(true)}
          />
          {reel.music && (
            <audio
              ref={audioRef}
              playsInline
              preload="none"
              src={reel.music.audioUrl || reel.music.previewUrl}
            />
          )}

          {/* Tap-position-aware 3D Fire Animation Burst Overlay on double-tap */}
          <AnimatePresence>
            {burst && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -12 }}
                animate={{ scale: 1.35, opacity: 1, rotate: 6 }}
                exit={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.175, 0.885, 0.32, 1.275] }}
                style={{ left: burstPos.x, top: burstPos.y }}
                className="absolute -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none drop-shadow-[0_0_40px_rgba(255,120,0,0.9)] z-30"
              >
                <span className="text-8xl">🔥</span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="relative h-full w-full flex items-center justify-center bg-zinc-950">
          <img
            src={reel.poster || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=60'}
            alt={reel.caption || 'Klyp'}
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <span className="text-3xl mb-2">⚠️</span>
            <p className="text-sm font-bold text-white">Video unavailable</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">Could not play this Klyp stream</p>
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-black/15 to-black/25" />

      {/* Reel index badge */}
      <motion.div
        className="absolute left-4 top-5 bg-[#DFE104] px-3 py-1 text-xs font-black uppercase text-[#09090B] pointer-events-none"
        initial={{ x: -60, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: false }}
      >
        Klyp {String(index + 1).padStart(2, '0')}
      </motion.div>

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className="absolute top-5 right-4 z-20 rounded-full bg-black/50 p-2.5 backdrop-blur-sm hover:bg-black/75 transition-colors focus:outline-none"
        aria-label={isGlobalMuted ? 'Unmute' : 'Mute'}
      >
        {isGlobalMuted ? (
          <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>

      {/* Manual Pause Indicator overlay */}
      {!isPlaying && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer pointer-events-auto"
        >
          <div className="rounded-full bg-black/60 p-5 backdrop-blur-sm border border-white/10 transition-transform active:scale-90">
            <svg className="w-10 h-10 text-white fill-white translate-x-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom: user info + caption + soundtrack pill */}
      <div className="absolute bottom-28 left-4 right-16 sm:right-20 lg:bottom-10 z-10 pointer-events-auto">
        <Link to={`/profile/${reel.user?.username}`} className="flex items-center gap-2 mb-3">
          <img src={avatar} alt={reel.user?.username} className="h-9 w-9 rounded-full object-cover border-2 border-[#DFE104]" />
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#DFE104]">
            @{reel.user?.username || 'unknown'}
          </p>
        </Link>
        <p className="text-sm sm:text-base text-zinc-200 line-clamp-3 leading-relaxed">
          <ParsedCaption text={reel.caption} />
        </p>

        {reel.music && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs font-semibold text-white max-w-full">
              <div className="flex items-end gap-0.5 h-3 text-[#DFE104]">
                {isPlaying && !isGlobalMuted ? (
                  <>
                    <span className="w-0.5 h-3 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite]" />
                    <span className="w-0.5 h-1.5 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite_0.2s]" />
                    <span className="w-0.5 h-2.5 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite_0.4s]" />
                  </>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#DFE104] fill-current" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                )}
              </div>
              <span className="truncate max-w-[140px] sm:max-w-[180px] text-[#DFE104] font-bold">
                {reel.music.title}
              </span>
              <span className="text-zinc-300 truncate max-w-[110px] text-[11px]">
                • {reel.music.artist}
              </span>
              {reel.music.attribution && (
                <span className="hidden md:inline-block text-[9px] text-zinc-400 truncate max-w-[120px]" title={reel.music.attribution}>
                  ({reel.music.attribution})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Side action buttons */}
      <div className="absolute bottom-28 right-3 sm:right-4 flex flex-col items-center gap-4 sm:gap-5 lg:bottom-10 z-20">
        <AnimatedFireButton
          isLiked={reel.is_liked}
          count={reel.likes_count}
          showCount={true}
          countDirection="bottom"
          size="lg"
          onToggle={() => onLike(reel)}
          ariaLabel={reel.is_liked ? "Remove Fire" : "Fire reel"}
        />

        <button
          onClick={handleOpenComments}
          aria-label="Comment"
          className="flex flex-col items-center text-white active:scale-110 transition-transform hover:text-[#DFE104]"
        >
          <IconsaxAnimated name="comment" size={28} />
          <span className="mt-1 block text-[10px] sm:text-xs font-bold">{localCommentsCount}</span>
        </button>

        <button aria-label="Share" className="text-white active:scale-110 transition-transform">
          <IconsaxAnimated name="send" size={28} />
        </button>

        <button
          onClick={() => onBookmark(reel.id)}
          className={`${reel.is_bookmarked ? 'text-[#DFE104]' : 'text-white'} active:scale-110 transition-transform`}
          aria-label="Save"
        >
          <IconsaxAnimated name="save" size={28} filled={reel.is_bookmarked} />
        </button>
      </div>

      {/* Comments Drawer Sheet */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-[2.5rem] bg-[#09090B]/95 p-5 backdrop-blur-2xl border-t border-white/[0.1] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Comments</h3>
                <span className="text-xs font-bold text-zinc-500">({localCommentsCount})</span>
              </div>
              <button
                onClick={() => setShowComments(false)}
                className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] grid place-items-center text-zinc-400 hover:text-white"
                aria-label="Close comments"
              >
                <IconsaxAnimated name="close" size={16} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 no-scrollbar min-h-[160px] max-h-[360px]">
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <p className="text-2xl mb-1">🎧</p>
                  <p className="text-xs font-bold uppercase tracking-wider">No comments yet</p>
                  <p className="text-[11px] text-zinc-600 mt-1">Start the conversation with @{reel.user?.username}</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 text-xs">
                    <img
                      src={c.authorAvatar || `https://ui-avatars.com/api/?name=${c.authorUsername || 'U'}&background=DFE104&color=000&bold=true`}
                      alt={c.authorUsername}
                      className="h-7 w-7 rounded-full object-cover shrink-0 border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <Link to={`/profile/${c.authorUsername}`} className="font-bold text-white hover:text-[#DFE104]">
                          @{c.authorUsername}
                        </Link>
                        <span className="text-[10px] text-zinc-600">{formatCommentTime(c.createdAt)}</span>
                      </div>
                      <p className="text-zinc-300 mt-0.5 leading-relaxed break-words">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSendComment} className="pt-3 border-t border-white/[0.08] flex items-center gap-2">
              <input
                type="text"
                placeholder={`Add a comment for @${reel.user?.username || 'selector'}...`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="dk-input flex-1 px-4 py-2.5 rounded-xl text-xs bg-white/[0.04] border border-white/[0.1] text-white placeholder-zinc-500 focus:border-[#DFE104]"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#DFE104] text-black text-xs font-black uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#DFE104]/90 transition-all flex items-center gap-1.5"
              >
                {submittingComment ? (
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin inline-block" />
                ) : (
                  'Post'
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ─── Loading Skeleton ─── */
function ReelSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] items-center justify-center bg-black lg:h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-2 border-[#DFE104]/30 border-t-[#DFE104] animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">Loading klyps…</p>
      </div>
    </div>
  );
}

/* ─── Reels Page ─── */
export default function Reels() {
  const { reels, fetchReels, likeReel, unlikeReel, bookmarkReel, isLoading, hasMore } = useReelStore();
  const [activeReelId, setActiveReelId] = useState(null);
  const [isGlobalMuted, setIsGlobalMuted] = useState(true);
  const containerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    if (reels.length === 0) fetchReels().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Default active reel to first loaded reel if none selected
  useEffect(() => {
    if (reels.length > 0 && !activeReelId) {
      setActiveReelId(reels[0].id);
    }
  }, [reels, activeReelId]);

  // Track the primary visible video using IntersectionObserver with threshold 0.70
  useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const sections = container.querySelectorAll('.reel-item-container');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find entry with greatest intersection ratio that exceeds 70% (0.7)
        let bestCandidate = null;
        let maxRatio = 0.7;

        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= maxRatio) {
            maxRatio = entry.intersectionRatio;
            bestCandidate = entry.target.getAttribute('data-reel-id');
          }
        }

        if (bestCandidate) {
          setActiveReelId(bestCandidate);
        }
      },
      {
        root: container,
        threshold: [0.3, 0.5, 0.7, 0.9]
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [reels]);

  // Load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          fetchReels().catch(() => {});
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, fetchReels]);

  const handleLikeToggle = useCallback((reel) => {
    if (reel.is_liked) {
      unlikeReel(reel.id);
    } else {
      likeReel(reel.id);
    }
  }, [likeReel, unlikeReel]);

  const toggleGlobalMute = useCallback(() => {
    setIsGlobalMuted((m) => !m);
  }, []);

  // Show skeleton only on first load
  if (reels.length === 0 && isLoading) {
    return (
      <MotionPage className="h-[calc(100dvh-4rem)] bg-black lg:h-screen">
        <ReelSkeleton />
      </MotionPage>
    );
  }

  if (reels.length === 0 && !isLoading) {
    return (
      <MotionPage className="flex items-center justify-center h-[calc(100dvh-4rem)] lg:h-screen bg-black">
        <div className="text-center px-4">
          <p className="text-4xl mb-4">🎬</p>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">No klyps yet</p>
          <p className="text-xs text-zinc-600 mt-2">Be the first to post a klyp!</p>
        </div>
      </MotionPage>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-4rem)] overflow-y-scroll no-scrollbar snap-y snap-mandatory lg:h-screen bg-black"
    >
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          index={index}
          isActive={activeReelId === reel.id}
          isGlobalMuted={isGlobalMuted}
          onToggleMute={toggleGlobalMute}
          onLike={handleLikeToggle}
          onBookmark={bookmarkReel}
        />
      ))}

      {/* Load more sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Loading more indicator */}
      {isLoading && reels.length > 0 && (
        <div className="flex h-screen items-center justify-center bg-black">
          <div className="h-8 w-8 rounded-full border-2 border-[#DFE104]/30 border-t-[#DFE104] animate-spin" />
        </div>
      )}

      {/* End of reels */}
      {!hasMore && reels.length > 0 && (
        <div className="flex h-screen flex-col items-center justify-center bg-black gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">You've seen everything</p>
          <p className="text-[#DFE104] text-2xl">🎧</p>
        </div>
      )}
    </div>
  );
}
