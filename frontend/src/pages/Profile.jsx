import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { reelService } from '../services/reelService';
import { eventService } from '../services/eventService';
import { useToast } from '../components/ui/Toast';
import TrashModal from '../components/events/TrashModal';
import PlaylistDemosSection from '../components/profile/PlaylistDemosSection';
import DJCalendarSection from '../components/profile/DJCalendarSection';

const tabs = [
  { id: 'posts', label: 'Posts', icon: 'grid' },
  { id: 'reels', label: 'Klyps', icon: 'video' },
  { id: 'events', label: 'Events', icon: 'calendar' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'playlists', label: 'Demos', icon: 'music' },
];

export default function Profile() {
  const { id = 'me' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('posts');
  const { user: currentUser } = authStore();
  const [profileUser, setProfileUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [followModal, setFollowModal] = useState({ open: false, type: 'followers' });

  const [userPosts, setUserPosts] = useState([]);
  const [userReels, setUserReels] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showTrashModal, setShowTrashModal] = useState(false);

  const isOwnProfile = id === 'me' || (currentUser && (
    id.toString() === currentUser.uid?.toString() || id.toString() === currentUser.username?.toString()
  ));

  // Load profile user info
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isOwnProfile && currentUser) {
        setProfileUser(currentUser);
      } else {
        const lookupKey = id === 'me' ? currentUser?.username : id;
        if (!lookupKey) {
          setIsLoading(false);
          return;
        }

        let userProfile = await userService.getUserProfile(lookupKey);
        if (!userProfile) {
          userProfile = await userService.getUserByUsername(lookupKey);
        }

        setProfileUser(userProfile);
        
        if (userProfile && currentUser && currentUser.uid !== userProfile.uid) {
          const rel = await userService.getFollowRelationship(currentUser.uid, userProfile.uid);
          setIsFollowing(rel.isFollowing);
          setIsFollowedBy(rel.isFollowedBy);
        }
      }
    } catch (e) {
      console.error('[Profile] loadProfile error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [id, currentUser, isOwnProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load content
  const loadContent = useCallback(async (targetUid, targetUsername) => {
    if (!targetUid && !targetUsername) return;
    setContentLoading(true);
    try {
      const identifier = targetUid || targetUsername;
      const [posts, reels, allEvents] = await Promise.all([
        postService.getUserPosts(identifier, currentUser?.uid),
        reelService.getUserReels(identifier, currentUser?.uid),
        eventService.getEvents()
      ]);
      
      setUserPosts(posts);
      setUserReels(reels);
      setUserEvents(
        allEvents.filter(
          (e) => (e.authorId === targetUid || e.username === targetUsername) && e.status !== 'trashed' && !e.deletedAt
        )
      );
    } catch (e) {
      console.error('[Profile] loadContent error:', e);
    } finally {
      setContentLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (profileUser) {
      loadContent(profileUser.uid, profileUser.username);
    }
  }, [profileUser, loadContent]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      showToast('Please log in to follow other selectors.', 'warning');
      return;
    }
    if (isFollowLoading || !profileUser?.uid) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, profileUser.uid);
        setIsFollowing(false);
        setProfileUser(prev => prev ? { ...prev, followersCount: Math.max(0, (prev.followersCount ?? 1) - 1) } : null);
        showToast(`Unfollowed @${profileUser.username}`, 'success');
      } else {
        await userService.followUser(currentUser.uid, profileUser.uid, currentUser);
        setIsFollowing(true);
        setProfileUser(prev => prev ? { ...prev, followersCount: (prev.followersCount ?? 0) + 1 } : null);
        showToast(isFollowedBy ? `Followed back @${profileUser.username}! 🎉` : `Following @${profileUser.username}`, 'success');
      }
    } catch (e) {
      showToast(e.message || 'Action failed.', 'error');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#DFE104] border-t-transparent mb-3" />
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading selector profile...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8 text-center">
        <p className="text-zinc-400 text-sm font-bold">Selector not found.</p>
        <Link to="/explore" className="mt-4 inline-block dk-button bg-[#DFE104] text-black text-xs font-bold px-6 py-3">
          Explore Selectors
        </Link>
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
    followers: profileUser.followersCount ?? profileUser.followers ?? 0,
    following: profileUser.followingCount ?? profileUser.following ?? 0,
    links: profileUser.socialLinks || profileUser.social_links || [],
  };

  const getEventStartTime = (ev) => {
    if (ev.startDateTimeIso) return new Date(ev.startDateTimeIso).getTime();
    if (ev.dateTime) return new Date(ev.dateTime).getTime();
    if (ev.createdAt?.seconds) return ev.createdAt.seconds * 1000;
    return 0;
  };

  const getEventEndTime = (ev) => {
    if (ev.endDateTimeIso) return new Date(ev.endDateTimeIso).getTime();
    return getEventStartTime(ev) + 4 * 60 * 60 * 1000;
  };

  const formatEventDateTime = (isoString) => {
    if (!isoString) return 'TBA';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleShareEvent = async (ev) => {
    const url = window.location.origin + `/events/${ev.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: ev.title,
          text: `Catch @${profileUser?.username || 'DJ'} live at ${ev.venue}!`,
          url,
        });
        return;
      } catch {
        // dismissed
      }
    }
    navigator.clipboard?.writeText(url);
    showToast('Event link copied to clipboard!', 'success');
  };

  const now = Date.now();
  const upcomingGigs = userEvents.filter(e => {
    return e.status !== 'cancelled' && getEventEndTime(e) >= now;
  }).sort((a, b) => getEventStartTime(a) - getEventStartTime(b));

  const pastGigs = userEvents.filter(e => {
    return e.status === 'cancelled' || getEventEndTime(e) < now;
  }).sort((a, b) => getEventStartTime(b) - getEventStartTime(a));

  const activeItems =
    activeTab === 'posts' ? userPosts :
    activeTab === 'reels' ? userReels :
    activeTab === 'playlists' ? (profileUser?.demoPlaylists || []) :
    activeTab === 'calendar' ? [] :
    upcomingGigs;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 lg:px-8">
      {/* Profile header */}
      <section className="flex flex-col items-center text-center sm:text-left sm:flex-row sm:items-start gap-5 sm:gap-7">
        <div className="relative shrink-0">
          <span className="story-ring-active block w-fit">
            <img
              src={user.avatar}
              alt={user.username}
              className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-[#09090B] object-cover lg:h-52 lg:w-52"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${user.username}&background=DFE104&color=000&bold=true&size=256`;
              }}
            />
          </span>
        </div>

        <div className="min-w-0 w-full">
          <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-center gap-2 sm:gap-3">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-[-0.06em] lg:text-7xl break-all">{user.username}</h1>
            {isOwnProfile ? (
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <Link to="/edit-profile" className="dk-button bg-[#DFE104] text-black px-4 text-sm font-bold">
                  Edit Profile
                </Link>
                <Link to="/social-links" className="dk-button bg-white/[0.06] px-4 text-sm font-bold">
                  <IconsaxAnimated name="link" size={18} />
                  Socials
                </Link>
                <Link to="/settings" className="dk-button bg-white/[0.06] px-4 text-sm font-bold">
                  <IconsaxAnimated name="settings" size={18} />
                  Settings
                </Link>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <button
                  onClick={handleFollowToggle}
                  disabled={isFollowLoading}
                  className={`dk-button px-5 text-sm font-bold transition-all ${
                    isFollowing
                      ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10'
                      : isFollowedBy
                      ? 'bg-[#DFE104] text-black hover:bg-[#ecee04] shadow-lg shadow-[#DFE104]/20'
                      : 'bg-[#DFE104] text-black hover:bg-[#ecee04]'
                  }`}
                >
                  {isFollowing ? 'Following' : isFollowedBy ? 'Follow Back' : 'Follow'}
                </button>
                <Link
                  to={`/messages?user=${profileUser.uid}`}
                  className="dk-button bg-white/[0.06] hover:bg-white/[0.1] px-4 text-sm font-bold text-white flex items-center gap-1.5"
                >
                  <IconsaxAnimated name="message" size={18} />
                  Message
                </Link>
              </div>
            )}
          </div>
          <p className="mt-2 sm:mt-3 text-sm sm:text-lg text-zinc-300">{user.name} / {user.genre} / {user.city}</p>
          <p className="mt-2 sm:mt-3 max-w-2xl text-sm sm:text-base text-zinc-400">{user.bio}</p>

          <div className="mt-4 sm:mt-6 grid max-w-lg grid-cols-3 gap-2 sm:gap-3 mx-auto sm:mx-0">
            <Stat value={user.postsCount} label="Posts" />
            <button
              type="button"
              onClick={() => setFollowModal({ open: true, type: 'followers' })}
              className="text-left group transition-transform active:scale-95 cursor-pointer"
            >
              <Stat value={user.followers} label="Followers" clickable />
            </button>
            <button
              type="button"
              onClick={() => setFollowModal({ open: true, type: 'following' })}
              className="text-left group transition-transform active:scale-95 cursor-pointer"
            >
              <Stat value={user.following} label="Following" clickable />
            </button>
          </div>

          <div className="mt-4 sm:mt-6 flex flex-wrap justify-center sm:justify-start gap-2">
            {user.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="dk-button bg-[#DFE104]/10 hover:bg-[#DFE104]/20 px-3 sm:px-4 text-xs sm:text-sm font-bold text-[#DFE104] transition-colors"
              >
                <IconsaxAnimated name="link" size={16} />
                {link.platform}
              </a>
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
                  src={post.media_url || post.mediaUrl}
                  alt="Highlight"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border border-white/[0.1] object-cover mx-auto"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <p className="mt-2 text-[10px] sm:text-xs font-bold text-zinc-400">Set {index + 1}</p>
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

      {/* Content Area */}
      {contentLoading ? (
        <div className="py-16 text-center text-xs text-zinc-500 animate-pulse">Loading content...</div>
      ) : activeTab === 'calendar' ? (
        <div className="mt-6">
          <DJCalendarSection
            profileUser={profileUser}
            currentUser={currentUser}
            isOwnProfile={isOwnProfile}
            isFollowing={isFollowing}
            onFollowToggle={handleFollowToggle}
            upcomingGigs={upcomingGigs}
          />
        </div>
      ) : activeTab === 'playlists' ? (
        <div className="mt-6">
          <PlaylistDemosSection
            profileUser={profileUser}
            currentUser={currentUser}
            isOwnProfile={isOwnProfile}
          />
        </div>
      ) : activeTab === 'events' ? (
        <div className="mt-6 space-y-6">
          {/* Gigs Header & Promoter Action */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Upcoming Gigs</h3>
              <p className="text-xs text-zinc-400">Times shown in your local timezone</p>
            </div>
            {isOwnProfile && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTrashModal(true)}
                  id="profile-trash-btn"
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
                  title="Manage Trashed Events"
                >
                  <span>🗑️</span> Trash
                </button>
                <button
                  onClick={() => navigate('/create-event')}
                  className="dk-button bg-[#DFE104] px-4 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-[#c9cb03] transition-all"
                >
                  + Schedule Gig
                </button>
              </div>
            )}
          </div>

          {upcomingGigs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                No upcoming gigs scheduled yet
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {isOwnProfile ? 'Keep your fans and promoters in the loop by scheduling your next date.' : 'Check back soon for new club dates and tour announcements.'}
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => navigate('/create-event')}
                  className="mt-4 rounded-xl bg-white/[0.06] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#DFE104] hover:bg-[#DFE104] hover:text-black transition-all"
                >
                  Schedule Your Next Gig
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingGigs.map((gig) => (
                <div
                  key={gig.id}
                  className="group rounded-3xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all hover:border-[#DFE104]/50 hover:bg-white/[0.04] flex flex-col justify-between"
                >
                  <div>
                    {gig.image && (
                      <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl border border-white/10">
                        <img
                          src={gig.image}
                          alt={gig.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#DFE104] backdrop-blur-sm">
                          {gig.eventType || 'Gig'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#DFE104]">
                        {gig.eventType || 'Club'}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-300">
                        {formatEventDateTime(gig.startDateTimeIso || gig.dateTime)}
                      </span>
                    </div>

                    <h4 className="mt-2 text-base font-black uppercase tracking-tight text-white group-hover:text-[#DFE104] transition-colors">
                      {gig.title}
                    </h4>

                    <p className="mt-1 text-xs text-zinc-400">
                      📍 <span className="text-zinc-200 font-semibold">{gig.venue}</span>
                      {gig.address && <span className="text-zinc-500"> • {gig.address}</span>}
                    </p>

                    {gig.description && (
                      <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {gig.description}
                      </p>
                    )}
                  </div>

                  {/* Gig Actions */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.04]">
                    {gig.directionsUrl && (
                      <a
                        href={gig.directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-[#DFE104]/30 bg-[#DFE104]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#DFE104] hover:bg-[#DFE104] hover:text-black transition-all"
                      >
                        🗺️ Get Directions
                      </a>
                    )}

                    {(gig.ticketUrl || gig.website) && (
                      <a
                        href={gig.ticketUrl || gig.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
                      >
                        🎟️ Tickets
                      </a>
                    )}

                    <button
                      onClick={() => handleShareEvent(gig)}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
                      title="Share Event"
                    >
                      🔗 Share
                    </button>

                    {isOwnProfile && (
                      <button
                        onClick={() => navigate(`/create-event?edit=${gig.id}`)}
                        className="ml-auto text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-amber-400 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past Gigs Section if any */}
          {pastGigs.length > 0 && (
            <div className="mt-12 pt-6 border-t border-white/[0.06] opacity-75">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
                Past Gigs & Archives ({pastGigs.length})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {pastGigs.map((gig) => (
                  <div
                    key={gig.id}
                    className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${gig.status === 'cancelled' ? 'text-red-400' : 'text-zinc-500'}`}>
                          {gig.status === 'cancelled' ? 'CANCELLED' : formatEventDateTime(gig.startDateTimeIso || gig.dateTime)}
                        </span>
                      </div>
                      <p className={`text-xs font-bold text-white truncate ${gig.status === 'cancelled' ? 'line-through text-zinc-500' : ''}`}>
                        {gig.title}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">📍 {gig.venue}</p>
                    </div>

                    {isOwnProfile && (
                      <button
                        onClick={() => navigate(`/create-event?edit=${gig.id}`)}
                        className="shrink-0 text-xs font-bold text-zinc-500 hover:text-zinc-300 px-2 py-1"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeItems.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No {activeTab} published yet.</p>
          {isOwnProfile && (
            <Link to="/upload" className="mt-4 inline-block dk-button bg-[#DFE104] text-black px-6 text-sm font-bold">
              + Upload your first {activeTab === 'reels' ? 'klyp' : 'post'}
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-3 gap-0.5 sm:gap-1">
          {activeItems.map((item, index) => {
            const mediaUrl = item.media_url || item.mediaUrl || item.image || '';
            const isVideo = item.media_type === 'video' || item.mediaType === 'video' || activeTab === 'reels';

            return (
              <div
                key={item.id || index}
                onClick={() => setSelectedMedia(item)}
                className="relative aspect-square overflow-hidden bg-zinc-900 group cursor-pointer"
              >
                {isVideo ? (
                  <>
                    <video
                      src={mediaUrl}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      preload="metadata"
                      onMouseEnter={e => e.target.play().catch(() => {})}
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
                ) : (
                  <img
                    src={mediaUrl}
                    alt={item.caption || item.title || ''}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516873240891-4bf014598ab4?w=400'; }}
                  />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
                  <span className="inline-flex items-center gap-1.5 transition-transform group-hover:scale-105">
                    <span className="filter drop-shadow-[0_0_8px_rgba(255,120,0,0.85)]">🔥</span>
                    <span>{item.likes_count ?? 0}</span>
                  </span>
                  {activeTab !== 'events' && (
                    <span className="inline-flex items-center gap-1.5">
                      <span>💬</span>
                      <span>{item.comments_count ?? 0}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
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
              aria-label="Close modal"
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
              {activeTab === 'reels' || selectedMedia.media_type === 'video' || selectedMedia.mediaType === 'video' ? (
                <video
                  src={selectedMedia.media_url || selectedMedia.mediaUrl}
                  className="max-h-[85vh] w-auto max-w-full"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={selectedMedia.media_url || selectedMedia.mediaUrl || selectedMedia.image}
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

      {/* Followers / Following Modal */}
      <FollowListModal
        isOpen={followModal.open}
        type={followModal.type}
        targetUid={profileUser?.uid}
        currentUser={currentUser}
        onClose={() => setFollowModal({ open: false, type: 'followers' })}
        onCountUpdated={loadProfile}
      />

      {/* Recoverable Event Trash Modal */}
      {isOwnProfile && (
        <TrashModal
          isOpen={showTrashModal}
          onClose={() => setShowTrashModal(false)}
          currentUid={currentUser?.uid}
          onRestored={() => loadContent(profileUser?.uid, profileUser?.username)}
        />
      )}
    </div>
  );
}

function Stat({ value, label, clickable = false }) {
  return (
    <div className={`rounded-2xl sm:rounded-3xl bg-white/[0.04] p-3 sm:p-4 transition-all ${
      clickable ? 'hover:bg-white/[0.08] hover:border-[#DFE104]/30 border border-transparent' : ''
    }`}>
      <p className="text-xl sm:text-2xl font-black tracking-[-0.04em]">{value}</p>
      <p className={`text-[10px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.16em] ${
        clickable ? 'text-zinc-400 group-hover:text-[#DFE104]' : 'text-zinc-500'
      }`}>{label}</p>
    </div>
  );
}

function FollowListModal({ isOpen, type, targetUid, currentUser, onClose, onCountUpdated }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followStates, setFollowStates] = useState({});
  const [loadingUids, setLoadingUids] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen || !targetUid) return;
    setLoading(true);
    let isSubscribed = true;

    (async () => {
      try {
        const list = type === 'followers'
          ? await userService.getFollowers(targetUid)
          : await userService.getFollowing(targetUid);
        if (!isSubscribed) return;
        setUsers(list);

        if (currentUser?.uid) {
          const states = {};
          await Promise.all(
            list.map(async (u) => {
              if (u.uid !== currentUser.uid) {
                const rel = await userService.getFollowRelationship(currentUser.uid, u.uid);
                states[u.uid] = rel;
              }
            })
          );
          if (isSubscribed) setFollowStates(states);
        }
      } catch (err) {
        console.error('[FollowListModal] load error:', err);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    })();

    return () => { isSubscribed = false; };
  }, [isOpen, type, targetUid, currentUser?.uid]);

  const handleToggleUserFollow = async (targetUser) => {
    if (!currentUser) {
      showToast('Please log in to follow selectors.', 'warning');
      return;
    }
    const rel = followStates[targetUser.uid] || { isFollowing: false, isFollowedBy: false };

    setLoadingUids((prev) => ({ ...prev, [targetUser.uid]: true }));
    try {
      if (rel.isFollowing) {
        await userService.unfollowUser(currentUser.uid, targetUser.uid);
        setFollowStates((prev) => ({
          ...prev,
          [targetUser.uid]: { ...rel, isFollowing: false }
        }));
        showToast(`Unfollowed @${targetUser.username}`, 'success');
      } else {
        await userService.followUser(currentUser.uid, targetUser.uid, currentUser);
        setFollowStates((prev) => ({
          ...prev,
          [targetUser.uid]: { ...rel, isFollowing: true }
        }));
        showToast(rel.isFollowedBy ? `Followed back @${targetUser.username}! 🎉` : `Following @${targetUser.username}`, 'success');
      }
      onCountUpdated?.();
    } catch (err) {
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setLoadingUids((prev) => ({ ...prev, [targetUser.uid]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md max-h-[80vh] flex flex-col rounded-3xl border border-white/10 bg-[#09090B] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
            <h2 className="font-black uppercase tracking-wider text-base">
              {type === 'followers' ? 'Followers' : 'Following'}
            </h2>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 no-scrollbar">
            {loading && (
              <div className="py-12 flex justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-[#DFE104]/30 border-t-[#DFE104] animate-spin" />
              </div>
            )}

            {!loading && users.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
                <p className="text-xs text-zinc-600 mt-1">Connect with selectors across the scene.</p>
              </div>
            )}

            {!loading && users.map((u) => {
              const rel = followStates[u.uid] || { isFollowing: false, isFollowedBy: false };
              const isSelf = currentUser?.uid === u.uid;
              const isItemLoading = loadingUids[u.uid];

              return (
                <div
                  key={u.uid}
                  className="flex items-center justify-between gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.04]"
                >
                  <Link
                    to={`/profile/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <img
                      src={u.profilePic || u.profile_pic || `https://ui-avatars.com/api/?name=${u.username}&background=DFE104&color=000&bold=true`}
                      alt={u.username}
                      className="h-11 w-11 rounded-full object-cover border border-white/10 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-white truncate uppercase tracking-wider">{u.username}</p>
                      <p className="text-xs text-zinc-500 truncate">{u.name || u.role || u.genre || 'DJ'}</p>
                    </div>
                  </Link>

                  {!isSelf && currentUser && (
                    <button
                      onClick={() => handleToggleUserFollow(u)}
                      disabled={isItemLoading}
                      className={`dk-button px-3.5 py-1.5 text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                        rel.isFollowing
                          ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10'
                          : rel.isFollowedBy
                          ? 'bg-[#DFE104] text-black hover:bg-[#ecee04] shadow-md shadow-[#DFE104]/20'
                          : 'bg-[#DFE104] text-black hover:bg-[#ecee04]'
                      }`}
                    >
                      {isItemLoading ? '...' : rel.isFollowing ? 'Following' : rel.isFollowedBy ? 'Follow Back' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
