import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import MentionInput from '../ui/MentionInput';
import EmojiPicker from '../ui/EmojiPicker';
import { auth } from '../../config/firebase';
import { postService } from '../../services/postService';
import { useToast } from '../ui/Toast';

// Parse caption - turn @username into clickable links
function ParsedCaption({ text }) {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Link
            key={i}
            to={`/profile/${part.slice(1)}`}
            className="text-[#DFE104] font-bold hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function relativeTime(timestamp) {
  let date;
  if (!timestamp) return 'now';
  if (timestamp?.toDate) date = timestamp.toDate();
  else if (timestamp instanceof Date) date = timestamp;
  else date = new Date(timestamp);
  const minutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export default function PostCard({ post }) {
  const { showToast } = useToast();
  const [liked, setLiked] = useState(post.is_liked ?? false);
  const [saved, setSaved] = useState(post.is_bookmarked ?? false);
  const [burst, setBurst] = useState(false);
  const [localLikes, setLocalLikes] = useState(post.likes_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentEmoji, setShowCommentEmoji] = useState(false);

  const currentUid = auth.currentUser?.uid;

  const avatar =
    post.user?.profile_pic ||
    post.profile_pic ||
    `https://ui-avatars.com/api/?name=${post.user?.username || post.username || 'U'}&background=DFE104&color=000&bold=true`;
  const username = post.user?.username || post.username || 'unknown';

  /* ── Like ── */
  const handleLike = async () => {
    if (!currentUid) {
      showToast('Log in to like posts.', 'error');
      return;
    }
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLocalLikes((n) => (nowLiked ? n + 1 : Math.max(0, n - 1)));
    setBurst(nowLiked);
    if (nowLiked) window.setTimeout(() => setBurst(false), 760);

    try {
      if (nowLiked) {
        await postService.likePost(post.id, currentUid);
      } else {
        await postService.unlikePost(post.id, currentUid);
      }
    } catch {
      // Revert optimistic update
      setLiked(!nowLiked);
      setLocalLikes((n) => (nowLiked ? Math.max(0, n - 1) : n + 1));
    }
  };

  /* ── Bookmark ── */
  const handleBookmark = async () => {
    if (!currentUid) {
      showToast('Log in to save posts.', 'error');
      return;
    }
    const nowSaved = !saved;
    setSaved(nowSaved);
    try {
      await postService.bookmarkPost(post.id, currentUid, nowSaved);
      showToast(nowSaved ? 'Post saved ✓' : 'Removed from saved', 'success');
    } catch {
      setSaved(!nowSaved);
    }
  };

  /* ── Comments ── */
  const openComments = async () => {
    setShowComments(true);
    if (comments.length === 0) {
      setLoadingComments(true);
      try {
        const data = await postService.getComments(post.id);
        setComments(data);
      } catch {
        showToast('Could not load comments.', 'error');
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const submitComment = async () => {
    if (!currentUid) { showToast('Log in to comment.', 'error'); return; }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const me = auth.currentUser;
      const newComment = await postService.addComment(
        post.id,
        currentUid,
        me.displayName || username,
        me.photoURL || avatar,
        commentText.trim()
      );
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch {
      showToast('Could not post comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  /* ── Share ── */
  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Post by @${username}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch {
      showToast('Could not share post.', 'error');
    }
  };

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="overflow-hidden border-b border-white/[0.08] bg-[#09090B]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-0">
          <Link to={`/profile/${username}`} className="flex items-center gap-3">
            <span className="story-ring-active">
              <img src={avatar} alt={username} className="h-11 w-11 rounded-full border-2 border-[#09090B] object-cover" />
            </span>
            <div>
              <p className="text-sm font-bold">@{username}</p>
              <p className="text-xs text-zinc-500">{post.user?.role || ''}</p>
            </div>
          </Link>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">
            {relativeTime(post.createdAt || post.created_at)}
          </span>
        </div>

        {/* Media */}
        <button
          type="button"
          onDoubleClick={handleLike}
          className="relative block w-full overflow-hidden bg-zinc-950 text-left"
          aria-label={`Post by ${username}`}
        >
          {post.media_type === 'video' ? (
            <video
              src={post.media_url}
              className="aspect-[4/5] w-full object-cover sm:rounded-[1.75rem]"
              controls
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={post.media_url}
              alt={post.caption || ''}
              className="aspect-[4/5] w-full object-cover sm:rounded-[1.75rem]"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=60';
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

          {/* Like burst animation */}
          <AnimatePresence>
            {burst && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -12 }}
                animate={{ scale: 1.2, opacity: 1, rotate: 8 }}
                exit={{ scale: 1.65, opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.175, 0.885, 0.32, 1.275] }}
                className="absolute inset-0 grid place-items-center text-white drop-shadow-2xl pointer-events-none"
              >
                <IconsaxAnimated name="heart" size={96} filled />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Actions */}
        <div className="px-4 py-4 sm:px-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <button
                onClick={handleLike}
                className={`dk-button transition-all active:scale-90 ${liked ? 'text-[#DFE104]' : 'text-white'}`}
                aria-label="Like"
              >
                <IconsaxAnimated name="heart" size={27} filled={liked} />
              </button>
              <button
                onClick={openComments}
                className="dk-button text-white transition-all active:scale-90"
                aria-label="Comment"
              >
                <IconsaxAnimated name="comment" size={27} />
              </button>
              <button
                onClick={handleShare}
                className="dk-button text-white transition-all active:scale-90"
                aria-label="Share"
              >
                <IconsaxAnimated name="send" size={27} />
              </button>
            </div>
            <button
              onClick={handleBookmark}
              className={`dk-button transition-all active:scale-90 ${saved ? 'text-[#DFE104]' : 'text-white'}`}
              aria-label="Save"
            >
              <IconsaxAnimated name="save" size={27} filled={saved} />
            </button>
          </div>

          <p className="mt-2 text-sm font-bold">{localLikes.toLocaleString()} likes</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            <Link to={`/profile/${username}`} className="mr-2 font-bold text-white hover:underline">@{username}</Link>
            <ParsedCaption text={post.caption} />
          </p>
          <button
            onClick={openComments}
            className="mt-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View all {post.comments_count ?? 0} comments
          </button>
        </div>
      </motion.article>

      {/* ── Comments Sheet ── */}
      <AnimatePresence>
        {showComments && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComments(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] rounded-t-[2rem] border-t border-white/[0.08] bg-[#09090B] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2 shrink-0">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Title */}
              <div className="flex items-center justify-between px-5 pb-3 border-b border-white/[0.08] shrink-0">
                <p className="font-black uppercase tracking-wide text-sm">Comments</p>
                <button onClick={() => setShowComments(false)} className="text-zinc-500 hover:text-white text-lg">✕</button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {loadingComments && (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-[#DFE104]/30 border-t-[#DFE104] animate-spin" />
                  </div>
                )}
                {!loadingComments && comments.length === 0 && (
                  <p className="text-center text-zinc-600 text-sm py-8">No comments yet. Be the first!</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <img
                      src={c.authorAvatar || `https://ui-avatars.com/api/?name=${c.authorUsername}&background=DFE104&color=000`}
                      alt={c.authorUsername}
                      className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-black text-white mr-2">@{c.authorUsername}</span>
                      <span className="text-sm text-zinc-200">{c.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment Input */}
              <div className="shrink-0 px-5 py-3 border-t border-white/[0.08]">
                <div className="relative flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <MentionInput
                      value={commentText}
                      onChange={setCommentText}
                      placeholder="Add a comment… @mention someone"
                      className="bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-2 text-sm focus:border-[#DFE104] pr-10"
                    />
                    {/* Emoji button inside input */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
                      <button
                        type="button"
                        onClick={() => setShowCommentEmoji(v => !v)}
                        className="text-base h-6 w-6 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                      >
                        😊
                      </button>
                      <AnimatePresence>
                        {showCommentEmoji && (
                          <EmojiPicker
                            className="absolute bottom-full right-0 mb-2"
                            onSelect={(emoji) => { setCommentText(prev => prev + emoji); setShowCommentEmoji(false); }}
                            onClose={() => setShowCommentEmoji(false)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="shrink-0 rounded-full bg-[#DFE104] px-4 py-2 text-xs font-black text-black disabled:opacity-40 transition-all"
                  >
                    {submittingComment ? '...' : 'Post'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
