import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import EmojiPicker from '../ui/EmojiPicker';
import authStore from '../../stores/authStore';
import { storyService } from '../../services/storyService';
import { useToast } from '../ui/Toast';

export default function StoryViewer({ activeGroup, onNextUser, onPrevUser, onClose, onStorySeen }) {
  const { user: currentUser } = authStore();
  const { showToast } = useToast();
  
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [showReplyEmoji, setShowReplyEmoji] = useState(false);

  // Sound play state
  const [isPlayingSound, setIsPlayingSound] = useState(true);
  const audioRef = useRef(null);

  const activeStory = activeGroup?.stories?.[segmentIndex];
  const isOwner = currentUser?.uid === activeGroup?.user?.id;

  // Auto-advance & progress bar interval
  useEffect(() => {
    if (!activeStory || isPaused) return;

    setProgress(0);
    const duration = activeStory.media_type === 'video' ? 10000 : 5000; // 10s for video, 5s for image
    const intervalTime = 100;
    const increment = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          handleNextSegment();
          return 0;
        }
        return p + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [segmentIndex, activeGroup, isPaused]);

  // Mark story as seen immediately
  useEffect(() => {
    if (activeStory && currentUser) {
      onStorySeen(activeStory.id);
    }
  }, [segmentIndex, activeGroup]);

  // Load insights if owner
  useEffect(() => {
    if (isOwner && activeStory) {
      storyService.getStoryAnalytics(activeStory.id).then((res) => {
        setInsights(res);
      });
    }
  }, [segmentIndex, activeStory, showInsights]);

  // Audio trigger
  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingSound && activeStory?.music) {
        audioRef.current.volume = 0.8;
        audioRef.current.currentTime = activeStory.music.startTime || 0;
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, [segmentIndex, activeStory, isPlayingSound]);

  if (!activeStory) return null;

  const handleNextSegment = () => {
    if (segmentIndex < activeGroup.stories.length - 1) {
      setSegmentIndex((prev) => prev + 1);
    } else {
      // Go to next user group
      onNextUser();
    }
  };

  const handlePrevSegment = () => {
    if (segmentIndex > 0) {
      setSegmentIndex((prev) => prev - 1);
    } else {
      // Go to previous user group
      onPrevUser();
    }
  };

  // Tap handler to divide left/right screen zones
  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width * 0.3; // Left 30% goes back

    if (isLeft) {
      handlePrevSegment();
    } else {
      handleNextSegment();
    }
  };

  // Submit quick reactions
  const sendQuickReaction = async (emoji) => {
    // Add floating animation
    const id = Date.now();
    setFloatingEmojis((prev) => [...prev, { id, emoji, x: Math.random() * 200 + 50 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 2000);

    try {
      await storyService.replyToStory(activeStory.id, currentUser.uid, currentUser.username, currentUser.profilePic, emoji);
      showToast(`Reacted with ${emoji}`, 'success');
    } catch (e) {
      showToast('Could not send reaction', 'error');
    }
  };

  // Submit reply
  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await storyService.replyToStory(activeStory.id, currentUser.uid, currentUser.username, currentUser.profilePic, replyText);
      showToast('Reply sent!', 'success');
      setReplyText('');
      setIsPaused(false);
    } catch (e) {
      showToast('Reply failed to send.', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 lg:p-4"
    >
      {/* Background audio */}
      {activeStory.music && (
        <audio ref={audioRef} src={activeStory.music.audioUrl} loop />
      )}

      {/* Main container */}
      <div className="relative h-full w-full max-w-md overflow-hidden bg-black lg:rounded-[2rem] lg:border lg:border-white/10 lg:shadow-2xl">
        {/* Clickable Tap Areas */}
        <div
          onClick={handleTap}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="absolute inset-0 z-10 cursor-pointer"
        />

        {/* Top Progress Segment Bar Indicator */}
        <div className="absolute inset-x-0 top-3 z-20 flex gap-1 px-3">
          {activeGroup.stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width: idx < segmentIndex ? '100%' : idx === segmentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header Overlay info */}
        <div className="absolute inset-x-0 top-7 z-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img
              src={activeGroup.user?.profile_pic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
              alt={activeGroup.user?.username}
              className="h-9 w-9 rounded-full border border-white/20 object-cover"
            />
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">{activeGroup.user?.username}</p>
              <p className="text-[10px] text-zinc-400">
                {activeStory.createdAt ? new Date(activeStory.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Music control */}
            {activeStory.music && (
              <button
                onClick={() => setIsPlayingSound(!isPlayingSound)}
                className="h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
              >
                <IconsaxAnimated name={isPlayingSound ? 'bell' : 'forbidden'} size={16} />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"
            >
              <IconsaxAnimated name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Media elements */}
        {activeStory.media_type === 'video' ? (
          <video
            src={activeStory.media_url}
            className="h-full w-full object-cover"
            style={{ filter: activeStory.filter ? `brightness(1.1)` : '' }}
            autoPlay
            muted={!isPlayingSound}
            loop
          />
        ) : (
          <img
            src={activeStory.media_url}
            alt="Story content"
            className="h-full w-full object-cover"
          />
        )}

        {/* Music synced info card */}
        {activeStory.music && (
          <div className="absolute top-20 left-4 z-20 bg-black/40 backdrop-blur rounded-full px-3 py-1 flex items-center gap-2 border border-white/10">
            <div className="flex items-end gap-0.5 h-3">
              <span className={`w-0.5 bg-[#DFE104] rounded ${isPlayingSound ? 'animate-[bounce_0.6s_infinite]' : 'h-1'}`} />
              <span className={`w-0.5 bg-[#DFE104] rounded ${isPlayingSound ? 'animate-[bounce_0.6s_infinite_0.2s]' : 'h-2'}`} />
              <span className={`w-0.5 bg-[#DFE104] rounded ${isPlayingSound ? 'animate-[bounce_0.6s_infinite_0.4s]' : 'h-3'}`} />
            </div>
            <span className="text-[10px] font-black text-[#DFE104] uppercase tracking-wider">
              🎵 {activeStory.music.title} - {activeStory.music.artist}
            </span>
          </div>
        )}

        {/* Floating overlays (rendered statically exactly where added) */}
        {(activeStory.overlays || []).map((overlay) => (
          <div
            key={overlay.id}
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${overlay.x}px`,
              top: `${overlay.y}px`,
              transform: `rotate(${overlay.rotation || 0}deg)`,
              fontSize: `${overlay.size || 20}px`,
              color: overlay.color || '#fff'
            }}
          >
            {overlay.type === 'text' ? (
              <span className={overlay.font?.class}>{overlay.text}</span>
            ) : (
              <div className="bg-[#DFE104] text-black px-4 py-2 rounded-2xl font-black uppercase text-[10px] tracking-wider">
                {overlay.text}
              </div>
            )}
          </div>
        ))}

        {/* Floating Emoji animations */}
        <AnimatePresence>
          {floatingEmojis.map((e) => (
            <motion.div
              key={e.id}
              initial={{ y: 200, opacity: 1, scale: 0.8 }}
              animate={{ y: -400, opacity: 0, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute bottom-24 z-30 text-4xl pointer-events-none"
              style={{ left: `${e.x}px` }}
            >
              {e.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bottom Interactive bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pb-8 space-y-4">
          {/* Quick Reactions bar */}
          <div className="flex justify-between items-center bg-black/40 backdrop-blur rounded-2xl p-2 border border-white/5 pointer-events-auto">
            {['❤️', '🔥', '👏', '😍', '🎧', '🎉', '⚡', '💯'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendQuickReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply Form / Owner Insights */}
          <div className="flex gap-2 items-center pointer-events-auto">
            {isOwner ? (
              <button
                onClick={() => setShowInsights(true)}
                className="dk-button bg-white/[0.08] text-white flex-1 font-bold uppercase tracking-wider py-3 rounded-xl text-xs flex items-center justify-center gap-2"
              >
                <IconsaxAnimated name="trend" size={16} /> VIEW INSIGHTS
              </button>
            ) : (
              <form onSubmit={sendReply} className="flex-1 flex gap-2 relative">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Send message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={() => setIsPaused(false)}
                    className="dk-input w-full px-4 py-2.5 pr-10 rounded-xl text-sm"
                  />
                  {/* Emoji toggle */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                    <button
                      type="button"
                      onClick={() => setShowReplyEmoji(v => !v)}
                      className="text-base h-7 w-7 flex items-center justify-center opacity-70 hover:opacity-100"
                    >
                      😊
                    </button>
                    <AnimatePresence>
                      {showReplyEmoji && (
                        <EmojiPicker
                          className="absolute bottom-full right-0 mb-2"
                          onSelect={(emoji) => { setReplyText(prev => prev + emoji); setShowReplyEmoji(false); }}
                          onClose={() => setShowReplyEmoji(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <button type="submit" className="dk-button bg-[#DFE104] text-black px-4 font-black">
                  SEND
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Insights Sheet (Owner only) */}
        <AnimatePresence>
          {showInsights && insights && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute inset-x-0 bottom-0 z-40 bg-zinc-900 border-t border-white/10 rounded-t-[2rem] p-5 pb-10 space-y-4 pointer-events-auto"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black uppercase tracking-wider text-[#DFE104]">Story Insights</h3>
                <button
                  onClick={() => setShowInsights(false)}
                  className="h-8 w-8 bg-white/5 rounded-full flex items-center justify-center text-zinc-400"
                >
                  <IconsaxAnimated name="close" size={16} />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Views', value: insights.views || 0 },
                  { label: 'Reach', value: insights.reach || 0 },
                  { label: 'Replies', value: insights.replies || 0 }
                ].map((s) => (
                  <div key={s.label} className="bg-white/[0.04] p-3 rounded-2xl border border-white/5 text-center">
                    <p className="text-xs text-zinc-500 font-bold uppercase">{s.label}</p>
                    <p className="text-xl font-black mt-1 text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
