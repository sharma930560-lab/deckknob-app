import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PostCard from '../components/feed/PostCard';
import ReelMiniCard from '../components/feed/ReelMiniCard';
import StoriesStrip from '../components/stories/StoriesStrip';
import NotificationHub from '../components/notifications/NotificationHub';
import EventCard from '../components/events/EventCard';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import KineticMarquee from '../components/ui/KineticMarquee';
import useFeedStore from '../stores/feedStore';
import useReelStore from '../stores/reelStore';
import authStore from '../stores/authStore';
import { eventService } from '../services/eventService';

const GENRE_TABS = ['All', 'Techno', 'House', 'Afro House', 'Drum & Bass', 'Ambient'];

/* Build interleaved array: inject one reel mini-card every 4 posts */
function buildFeedItems(posts, reels) {
  const items = [];
  let reelIdx = 0;

  for (let i = 0; i < posts.length; i++) {
    items.push({ type: 'post', data: posts[i] });
    // Every 4 posts, insert a reel if available
    if ((i + 1) % 4 === 0 && reelIdx < reels.length) {
      items.push({ type: 'reel', data: reels[reelIdx++] });
    }
  }

  return items;
}

/* Filter feed items by genre keyword in caption */
function filterByGenre(items, genre) {
  if (!genre || genre === 'All') return items;
  const kw = genre.toLowerCase().replace(/\s+/g, '');
  const kw2 = genre.toLowerCase();
  return items.filter((item) => {
    const caption = (item.data.caption || '').toLowerCase().replace(/\s+/g, '');
    return caption.includes(kw) || caption.includes(kw2) || caption.includes('#' + kw);
  });
}

/* Post skeleton */
function PostSkeleton() {
  return (
    <div className="overflow-hidden border-b border-white/[0.06] animate-pulse">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-0">
        <div className="h-11 w-11 rounded-full bg-white/[0.06]" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-white/[0.06]" />
          <div className="h-2 w-16 rounded bg-white/[0.04]" />
        </div>
      </div>
      <div className="aspect-[4/5] w-full bg-white/[0.04] sm:rounded-[1.75rem]" />
      <div className="px-4 py-4 sm:px-0 space-y-2">
        <div className="h-3 w-20 rounded bg-white/[0.06]" />
        <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

export default function Feed() {
  const [notificationHubOpen, setNotificationHubOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [events, setEvents] = useState([]);
  const sentinelRef = useRef(null);

  const { posts, fetchPosts, refreshPosts, isLoading: postsLoading, hasMore: postsHasMore } = useFeedStore();
  const { reels, fetchReels, isLoading: reelsLoading } = useReelStore();
  const { user } = authStore();

  // Initial load
  useEffect(() => {
    refreshPosts().catch(() => {});
    if (reels.length === 0) fetchReels().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set default tab to user's genre if they have one
  useEffect(() => {
    if (user?.genre && GENRE_TABS.includes(user.genre)) {
      setActiveTab(user.genre);
    }
  }, [user?.genre]);

  // Events sidebar
  useEffect(() => {
    eventService.getTodayEvents().then(setEvents).catch(() => {});
  }, []);

  // Infinite scroll: load more posts when sentinel hits viewport (only after initial load)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !postsHasMore || posts.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !postsLoading) {
          fetchPosts().catch(() => {});
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [postsHasMore, postsLoading, fetchPosts]);

  const isFirstLoad = (postsLoading || reelsLoading) && posts.length === 0;

  // Build interleaved + filtered feed
  const rawItems = buildFeedItems(posts, reels);
  const feedItems = filterByGenre(rawItems, activeTab);

  return (
    <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-0 py-0 lg:grid-cols-[minmax(0,650px)_minmax(280px,1fr)] lg:px-8 lg:py-8">
      <section className="min-w-0">
        {/* Mobile header */}
        <header className="sticky top-14 sm:top-16 z-30 flex h-12 sm:h-14 items-center justify-between border-b border-white/[0.08] bg-[#09090B]/84 px-3 sm:px-4 backdrop-blur-xl lg:top-0 lg:hidden">
          <h1 className="font-black tracking-[-0.06em]">FEED</h1>
          <button
            onClick={() => setNotificationHubOpen(true)}
            className="dk-button h-10 w-10 text-[#DFE104]"
            aria-label="Notifications"
          >
            <IconsaxAnimated name="bell" size={22} />
          </button>
        </header>

        <NotificationHub open={notificationHubOpen} onClose={() => setNotificationHubOpen(false)} />

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.175, 0.885, 0.32, 1.275] }}
          className="relative overflow-hidden border-b border-white/[0.08] px-4 py-8 sm:px-0"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">Live from the underground</p>
          <h2 className="kinetic-display mt-3 max-w-[7ch]">DROP THE NIGHT</h2>
          <div className="mt-5 rounded-full border-y border-white/[0.12] py-2 text-xs font-bold uppercase tracking-[0.24em] text-zinc-500">
            <KineticMarquee speed="24s">Techno / House / Klyps / Events / Backstage / Lineups / Tonight / </KineticMarquee>
          </div>
        </motion.div>

        <StoriesStrip />

        {/* Genre filter tabs */}
        <div className="sticky top-[6.5rem] sm:top-[7rem] lg:top-0 z-20 bg-[#09090B]/90 backdrop-blur-xl border-b border-white/[0.08]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 sm:px-0 py-3">
            {GENRE_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#DFE104] text-black'
                    : 'border border-white/[0.12] text-zinc-500 hover:border-white/30 hover:text-white'
                }`}
              >
                {tab}
                {tab === user?.genre && tab !== 'All' && (
                  <span className="ml-1.5 text-[8px]">★</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feed items */}
        <div className="space-y-0">
          {/* Skeleton on first load */}
          {isFirstLoad && (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}

          {/* Empty state */}
          {!isFirstLoad && feedItems.length === 0 && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-20 text-center"
              >
                <p className="text-3xl mb-3">🎚️</p>
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                  {activeTab === 'All' ? 'No posts yet' : `No ${activeTab} posts yet`}
                </p>
                <p className="text-xs text-zinc-600 mt-2">
                  {activeTab !== 'All'
                    ? 'Try "All" to see everything, or follow more DJs.'
                    : 'Upload your first post to get the party started!'}
                </p>
                {activeTab !== 'All' && (
                  <button
                    onClick={() => setActiveTab('All')}
                    className="mt-4 rounded-full border border-white/20 px-5 py-2 text-xs font-bold text-zinc-300 hover:text-white"
                  >
                    Show All
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Render posts + interleaved reels */}
          {feedItems.map((item) =>
            item.type === 'post' ? (
              <PostCard key={`post-${item.data.id}`} post={item.data} />
            ) : (
              <ReelMiniCard key={`reel-${item.data.id}`} reel={item.data} />
            )
          )}

          {/* Load-more sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading more indicator */}
          {postsLoading && posts.length > 0 && (
            <div className="py-8 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-[#DFE104]/30 border-t-[#DFE104] animate-spin" />
            </div>
          )}

          {/* End of feed */}
          {!postsHasMore && posts.length > 0 && !postsLoading && (
            <div className="py-12 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-700">
                You've seen everything ↑
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Desktop sidebar */}
      <aside className="hidden space-y-5 lg:block">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Tonight's Events</p>
          <Link to="/events/today" className="text-xs font-bold text-[#DFE104]">See all</Link>
        </div>
        {events.length === 0 && (
          <p className="text-xs text-zinc-600">No events scheduled tonight.</p>
        )}
        {events.slice(0, 2).map((event) => (
          <EventCard key={event.id} event={event} compact />
        ))}

        {/* Genre quick-filter hint */}
        {user?.genre && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Your Taste</p>
            <p className="text-sm font-black text-[#DFE104]">{user.genre}</p>
            <p className="text-xs text-zinc-600 mt-1">Feed is filtered for your genre. Change in settings.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
