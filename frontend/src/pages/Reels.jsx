import { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import MotionPage from '../components/ui/MotionPage';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import useReelStore from '../stores/reelStore';

/* ─── Individual Reel Item (handles its own play/pause) ─── */
function ReelItem({ reel, index, onLike, onBookmark }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
          setIsPlaying(false);
        }
      },
      { threshold: 0.65 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const avatar =
    reel.user?.profile_pic ||
    `https://ui-avatars.com/api/?name=${reel.user?.username || 'DJ'}&background=DFE104&color=000&bold=true`;

  return (
    <section className="relative h-[calc(100dvh-4rem)] snap-start overflow-hidden bg-black lg:h-screen">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.media_url || reel.mediaUrl}
        poster={reel.poster}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
        onClick={togglePlay}
      />

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
        onClick={toggleMute}
        className="absolute top-5 right-4 rounded-full bg-black/50 p-2.5 backdrop-blur-sm"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        )}
      </button>

      {/* Play/Pause hint */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/50 p-5 backdrop-blur-sm">
            <svg className="w-10 h-10 text-white fill-white" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom: user info + caption */}
      <div className="absolute bottom-28 left-4 right-16 sm:right-20 lg:bottom-10">
        <Link to={`/profile/${reel.user?.username}`} className="flex items-center gap-2 mb-3">
          <img src={avatar} alt={reel.user?.username} className="h-9 w-9 rounded-full object-cover border-2 border-[#DFE104]" />
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#DFE104]">
            @{reel.user?.username || 'unknown'}
          </p>
        </Link>
        <p className="text-sm sm:text-base text-zinc-200 line-clamp-3 leading-relaxed">
          {reel.caption}
        </p>
      </div>

      {/* Side action buttons */}
      <div className="absolute bottom-28 right-3 sm:right-4 flex flex-col items-center gap-4 sm:gap-5 lg:bottom-10">
        <button
          onClick={() => onLike(reel)}
          className={`flex flex-col items-center ${reel.is_liked ? 'text-[#DFE104]' : 'text-white'} active:scale-110 transition-transform`}
          aria-label="Like reel"
        >
          <IconsaxAnimated name="heart" size={28} filled={reel.is_liked} />
          <span className="mt-1 block text-[10px] sm:text-xs font-bold">
            {reel.likes_count >= 1000 ? `${(reel.likes_count / 1000).toFixed(1)}K` : reel.likes_count}
          </span>
        </button>

        <button aria-label="Comment" className="flex flex-col items-center text-white active:scale-110 transition-transform">
          <IconsaxAnimated name="comment" size={28} />
          <span className="mt-1 block text-[10px] sm:text-xs font-bold">{reel.comments_count ?? 0}</span>
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
  const sentinelRef = useRef(null);

  // Initial fetch
  useEffect(() => {
    if (reels.length === 0) fetchReels().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <MotionPage className="h-[calc(100dvh-4rem)] overflow-y-scroll no-scrollbar snap-y snap-mandatory lg:h-screen bg-black">
      {reels.map((reel, index) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          index={index}
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
    </MotionPage>
  );
}
