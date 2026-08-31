import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { reelService } from '../services/reelService';
import { eventService } from '../services/eventService';
import { useToast } from '../components/ui/Toast';

const tabs = [
  { id: 'posts', label: 'Posts', icon: 'grid' },
  { id: 'reels', label: 'Klyps', icon: 'video' },
  { id: 'events', label: 'Events', icon: 'calendar' },
];

export default function Profile() {
  const { id = 'me' } = useParams();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('posts');
  const { user: currentUser } = authStore();
  const [profileUser, setProfileUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [userPosts, setUserPosts] = useState([]);
  const [userReels, setUserReels] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const isOwnProfile = id === 'me' || (currentUser && (
    id.toString() === currentUser.uid?.toString() || id === currentUser.username
  ));

  // Load profile user info
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOwnProfile && currentUser) {
        setProfileUser(currentUser);
      } else {
        const username = id === 'me' ? currentUser?.username : id;
        if (!username) {
          setIsLoading(false);
          return;
        }
        const userProfile = await userService.getUserByUsername(username);
        setProfileUser(userProfile);
        
        if (userProfile && currentUser) {
          const following = await userService.isFollowing(currentUser.uid, userProfile.uid);
          setIsFollowing(following);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [id, currentUser, isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load content
  const loadContent = useCallback(async (username) => {
    if (!username) return;
    setContentLoading(true);
    try {
      const [posts, reels, allEvents] = await Promise.all([
        postService.getUserPosts(username, currentUser?.uid),
        reelService.getUserReels(username, currentUser?.uid),
        eventService.getEvents()
      ]);
      
      setUserPosts(posts);
      setUserReels(reels);
      setUserEvents(allEvents.filter(e => e.username === username || e.authorId === profileUser?.uid));
    } catch (e) {
      console.error(e);
    } finally {
      setContentLoading(false);
    }
  }, [currentUser?.uid, profileUser?.uid]);

  useEffect(() => {
    if (profileUser?.username) {
      loadContent(profileUser.username);
    }
  }, [profileUser, loadContent]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      showToast('Please log in to follow other selectors.', 'warning');
      return;
    }
    if (isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, profileUser.uid);
        setIsFollowing(false);
        setProfileUser(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount ?? 1) - 1) } : null);
        showToast(`Unfollowed @${profileUser.username}`, 'success');
      } else {
        await userService.followUser(currentUser.uid, profileUser.uid);
        setIsFollowing(true);
        setProfileUser(prev => prev ? { ...prev, followersCount: (prev.followersCount ?? 0) + 1 } : null);
        showToast(`Following @${profileUser.username}`, 'success');
      }
    } catch (e) {
      showToast(e.message || 'Action failed.', 'error');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleIgConnect = () => {
    showToast('Instagram integration is currently offline.', 'info');
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8 text-center">
        <p className="text-zinc-500 animate-pulse text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8 text-center">
        <p className="text-zinc-500 text-sm">User not found.</p>
      </div>
    );
  }

  const user = {
    username: profileUser.username,
    name: profileUser.name || profileUser.username,
    genre: profileUser.genre || 'DJ / Producer',
    city: profileUser.city || 'Local Scene',
    avatar: profileUser.profilePic || profileUser.profile_pic ||
      `https://ui-avatars.com/api/?name=${profileUser.username}&background=DFE104&color=000&bold=true&size=256`,
    bio: profileUser.bio || 'Underground selector.',
    postsCount: userPosts.length,
    followers: profileUser.followersCount ?? 0,
    following: profileUser.followingCount ?? 0,
    links: profileUser.socialLinks || [],
  };

  const activeItems =
    activeTab === 'posts' ? userPosts :
    activeTab === 'reels' ? userReels :
    userEvents;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 lg:px-8">
      {/* Profile header */}
      <section className="flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-start gap-5 sm:gap-7">
        <div className="relative shrink-0">
          <span className="story-ring-active block w-fit">
            <img src={user.avatar} alt={user.username} className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-[#09090B] object-cover lg:h-52 lg:w-52" />
          </span>
        </div>

        <div className="min-w-0 w-full">
          <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-center gap-2 sm:gap-3">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-[-0.06em] lg:text-7xl break-all">{user.username}</h1>
            {isOwnProfile && (
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <Link to="/edit-profile" className="dk-button bg-[#DFE104] text-black px-4 text-sm font-bold">
                  Edit Profile
                </Link>
                <Link to="/settings" className="dk-button bg-white/[0.06] px-4 text-sm font-bold">
                  <IconsaxAnimated name="settings" size={18} />
                  Settings
                </Link>
                <button
                  onClick={handleIgConnect}
                  className="dk-button bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 text-sm font-bold gap-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  Connect Instagram
                </button>
              </div>
            )}
            {!isOwnProfile && (
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={`dk-button px-4 text-sm font-bold ${isFollowing ? 'bg-white/[0.08] text-white' : 'bg-[#DFE104] text-black'}`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
          <p className="mt-2 sm:mt-3 text-sm sm:text-lg text-zinc-300">{user.name} / {user.genre} / {user.city}</p>
          <p className="mt-2 sm:mt-3 max-w-2xl text-sm sm:text-base text-zinc-400">{user.bio}</p>

          <div className="mt-4 sm:mt-6 grid max-w-lg grid-cols-3 gap-2 sm:gap-3 mx-auto sm:mx-0">
            <Stat value={user.postsCount} label="Posts" />
            <Stat value={user.followers} label="Followers" />
            <Stat value={user.following} label="Following" />
          </div>

          <div className="mt-4 sm:mt-6 flex flex-wrap justify-center sm:justify-start gap-2">
            {user.links.map((link) => (
              <Link key={link.url} to="/social-links" className="dk-button bg-[#DFE104]/10 px-3 sm:px-4 text-xs sm:text-sm font-bold text-[#DFE104]">
                <IconsaxAnimated name="link" size={16} />
                {link.platform}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      {userPosts.length > 0 && (
        <section className="mt-8 sm:mt-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Highlights</p>
          <div className="no-scrollbar flex gap-3 sm:gap-4 overflow-x-auto pb-2">
            {userPosts.slice(0, 5).map((post, index) => (
              <div key={post.id} className="w-20 sm:w-24 shrink-0 text-center">
                <img
                  src={post.media_url}
                  alt="Highlight"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-white/[0.1] object-cover mx-auto"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <p className="mt-2 text-[10px] sm:text-xs font-bold text-zinc-400">Highlight {index + 1}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab bar */}
      <div className="mt-6 sm:mt-8 flex border-y border-white/[0.08]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.12em] sm:tracking-[0.16em] transition-colors ${
              activeTab === tab.id ? 'text-[#DFE104]' : 'text-zinc-600'
            }`}
          >
            <IconsaxAnimated name={tab.icon} size={16} filled={activeTab === tab.id} />
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="ml-1 rounded-full bg-[#DFE104]/20 px-1.5 py-0.5 text-[9px] text-[#DFE104]">
                {activeItems.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {contentLoading ? (
        <div className="py-16 text-center text-xs text-zinc-500 animate-pulse">Loading...</div>
      ) : activeItems.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No {activeTab} yet.</p>
          {isOwnProfile && activeTab === 'posts' && (
            <Link to="/upload" className="mt-4 inline-block dk-button bg-[#DFE104] text-black px-6 text-sm font-bold">
              + Upload your first post
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-0.5 sm:gap-1">
          {activeItems.map((item, index) => (
            <div key={item.id || index} onClick={() => setSelectedMedia(item)} className="relative aspect-square overflow-hidden bg-zinc-900 group cursor-pointer">
              {activeTab === 'reels' ? (
                <>
                  <video
                    src={item.media_url}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    preload="metadata"
                    onMouseEnter={e => e.target.play()}
                    onMouseLeave={e => e.target.pause()}
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <div className="absolute top-1.5 right-1.5">
                    <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z"/></svg>
                  </div>
                </>
              ) : activeTab === 'events' ? (
                <img
                  src={item.image || item.media_url}
                  alt={item.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'; }}
                />
              ) : (
                <img
                  src={item.media_url}
                  alt={item.caption}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=400'; }}
                />
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white font-bold text-sm">
                <span>❤ {item.likes_count ?? 0}</span>
                {activeTab !== 'events' && <span>💬 {item.comments_count ?? 0}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setSelectedMedia(null)}
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-6 right-6 text-white hover:text-[#DFE104] transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative max-h-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-black"
              onClick={e => e.stopPropagation()}
            >
              {activeTab === 'reels' || selectedMedia.type === 'video' ? (
                <video
                  src={selectedMedia.media_url}
                  className="max-h-[85vh] w-auto max-w-full"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={selectedMedia.media_url || selectedMedia.image}
                  alt="Post content"
                  className="max-h-[85vh] w-auto max-w-full object-contain"
                />
              )}
              {selectedMedia.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-6 pt-12">
                  <p className="text-white text-sm">{selectedMedia.caption}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white/[0.04] p-3 sm:p-4">
      <p className="text-xl sm:text-2xl font-black tracking-[-0.04em]">{value}</p>
      <p className="text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.16em] text-zinc-500">{label}</p>
    </div>
  );
}
