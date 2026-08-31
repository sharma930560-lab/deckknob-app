import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import useReelStore from '../../stores/reelStore';

export default function ReelMiniCard({ reel }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const { likeReel, unlikeReel, bookmarkReel } = useReelStore();

  // Only play when ≥50% in viewport
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
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

  const handleLikeToggle = (e) => {
    e.stopPropagation();
    if (reel.is_liked) {
      unlikeReel(reel.id);
    } else {
      likeReel(reel.id);
    }
  };

  const avatar =
    reel.user?.profile_pic ||
    `https://ui-avatars.com/api/?name=${reel.user?.username || 'DJ'}&background=DFE104&color=000&bold=true`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="overflow-hidden border-b border-white/[0.08] bg-[#09090B]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-0">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${reel.user?.username}`}>
            <img src={avatar} alt={reel.user?.username} className="h-10 w-10 rounded-full object-cover border-2 border-[#DFE104]" />
          </Link>
          <div>
            <p className="text-sm font-bold">{reel.user?.username || 'DJ'}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#DFE104]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#DFE104]">
              🎬 Reel
            </span>
          </div>
        </div>
      </div>

      {/* Video */}
      <div className="relative bg-zinc-950 overflow-hidden sm:rounded-[1.75rem]">
        <video
          ref={videoRef}
          src={reel.media_url}
          poster={reel.poster}
          className="aspect-[9/16] w-full object-cover max-h-[70vh]"
          muted
          loop
          playsInline
          preload="metadata"
          onClick={togglePlay}
        />

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* Play/Pause indicator */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-black/60 p-4 backdrop-blur-sm">
              <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Mute toggle */}
        <button
          onClick={toggleMute}
          className="absolute top-3 right-3 rounded-full bg-black/50 p-2 backdrop-blur-sm"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white fill-white" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          )}
        </button>

        {/* Caption */}
        <div className="absolute bottom-4 left-4 right-14 pointer-events-none">
          <p className="text-sm text-zinc-200 line-clamp-2">{reel.caption}</p>
        </div>

        {/* Side actions */}
        <div className="absolute bottom-4 right-3 flex flex-col items-center gap-3">
          <button
            onClick={handleLikeToggle}
            className={`flex flex-col items-center ${reel.is_liked ? 'text-[#DFE104]' : 'text-white'} active:scale-110 transition-transform`}
            aria-label="Like"
          >
            <IconsaxAnimated name="heart" size={24} filled={reel.is_liked} />
            <span className="text-[9px] font-bold mt-0.5">
              {reel.likes_count >= 1000 ? `${(reel.likes_count / 1000).toFixed(1)}K` : reel.likes_count}
            </span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); bookmarkReel(reel.id); }}
            className={`${reel.is_bookmarked ? 'text-[#DFE104]' : 'text-white'} active:scale-110 transition-transform`}
            aria-label="Save"
          >
            <IconsaxAnimated name="save" size={22} filled={reel.is_bookmarked} />
          </button>
        </div>
      </div>

      <div className="h-4" />
    </motion.article>
  );
}
