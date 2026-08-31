import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import MotionPage from '../components/ui/MotionPage';
import authStore from '../stores/authStore';
import { locationService } from '../services/locationService';
import { useToast } from '../components/ui/Toast';

export default function VenueDetail() {
  const { id } = useParams();
  const { user } = authStore();
  const { showToast } = useToast();

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [crowdLevel, setCrowdLevel] = useState('Moderate');
  const [checkedIn, setCheckedIn] = useState(false);

  // Reviews & Rating states
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReviewText, setNewReviewText] = useState('');
  const [rating, setRating] = useState(5);
  const [ratingMusic, setRatingMusic] = useState(5);
  const [ratingCrowd, setRatingCrowd] = useState(5);
  const [ratingSound, setRatingSound] = useState(5);

  // Load Venue Details
  useEffect(() => {
    setLoading(true);
    locationService.getVenueProfile(id).then((v) => {
      if (v) {
        setVenue(v);
        setCrowdLevel(v.crowdLevel || 'Moderate');
        
        // Load reviews
        locationService.getVenueReviews(id).then((revs) => setReviews(revs));

        // Check follow status
        if (user) {
          locationService.isFollowingVenue(id, user.uid).then((res) => setIsFollowing(res));
        }
      }
      setLoading(false);
    });
  }, [id, user]);

  const handleFollowToggle = async () => {
    if (!user) {
      showToast('Please log in to follow venues', 'warning');
      return;
    }
    try {
      const res = await locationService.toggleFollowVenue(id, user.uid);
      setIsFollowing(res.followed);
      showToast(res.followed ? 'Following venue updates!' : 'Unfollowed venue', 'success');
    } catch (e) {
      showToast('Action failed', 'error');
    }
  };

  const handleCheckIn = async () => {
    if (!user) {
      showToast('Log in to check-in', 'warning');
      return;
    }
    const nextCrowd = await locationService.checkInVenue(id, user.uid);
    setCrowdLevel(nextCrowd);
    setCheckedIn(true);
    showToast('Checked in successfully! Live crowd updated.', 'success');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Login required', 'warning');
      return;
    }
    try {
      const res = await locationService.addVenueReview(id, user.uid, user.username, user.profilePic || user.profile_pic, {
        rating,
        ratingMusic,
        ratingCrowd,
        ratingSound,
        text: newReviewText
      });
      setReviews((prev) => [res, ...prev]);
      setShowReviewModal(false);
      setNewReviewText('');
      showToast('Review submitted successfully!', 'success');
    } catch (e) {
      showToast('Failed to submit review', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090B] text-white">
        <div className="h-10 w-10 border-4 border-[#DFE104] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090B] text-white p-6">
        <IconsaxAnimated name="forbidden" size={48} className="text-zinc-600 mb-4" />
        <h2 className="text-2xl font-black uppercase">Venue not found</h2>
        <Link to="/explore" className="mt-4 dk-button bg-[#DFE104] text-black font-bold px-6 py-2">
          Explore Venues
        </Link>
      </div>
    );
  }

  // Auto compute crowd status color
  const crowdColors = {
    Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Moderate: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Busy: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Packed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Full Capacity': 'bg-red-600 text-white border-red-700'
  }[crowdLevel] || 'bg-zinc-500/10 text-zinc-400';

  return (
    <MotionPage className="mx-auto max-w-7xl px-4 py-6 lg:px-8 space-y-6">
      {/* 1. Header Banner & Info */}
      <div className="relative h-60 w-full overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-zinc-900 sm:h-80">
        <img src={venue.bannerUrl} alt={venue.name} className="h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        {/* Profile Details floating over banner bottom */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <img src={venue.logoUrl} alt={venue.name} className="h-16 w-16 rounded-[1.5rem] border-2 border-white/20 object-cover sm:h-20 sm:w-20" />
            <div>
              <span className="rounded-full bg-[#DFE104]/10 border border-[#DFE104]/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#DFE104]">
                {venue.category}
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">{venue.name}</h1>
              <p className="text-xs text-zinc-400 mt-1">{venue.address}, {venue.city}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFollowToggle}
              className={`dk-button font-black uppercase text-xs tracking-wider px-5 py-3 rounded-2xl transition-all ${
                isFollowing ? 'bg-white/[0.08] text-white border border-white/10' : 'bg-[#DFE104] text-black'
              }`}
            >
              {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
            </button>
            <button
              onClick={handleCheckIn}
              disabled={checkedIn}
              className={`dk-button font-black uppercase text-xs tracking-wider px-5 py-3 rounded-2xl border transition-all ${
                checkedIn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default' : 'bg-white/[0.04] text-white border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              {checkedIn ? '✓ CHECKED IN' : 'CHECK-IN'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT column: Live performance status & lineup & details */}
        <div className="space-y-6">
          {/* Live performer banner */}
          {venue.currentMusic && (
            <div className="relative overflow-hidden rounded-[2rem] border border-[#DFE104]/20 bg-gradient-to-br from-[#DFE104]/5 via-zinc-950 to-zinc-950 p-6 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              {/* Pulsing visualizer effect */}
              <div className="absolute right-4 top-4 flex gap-1 items-end h-8">
                <span className="w-1 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite] h-8" />
                <span className="w-1 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite_0.15s] h-6" />
                <span className="w-1 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite_0.3s] h-4" />
                <span className="w-1 bg-[#DFE104] rounded animate-[bounce_0.6s_infinite_0.45s] h-7" />
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#DFE104]">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  PERFORMING HERE TONIGHT
                </span>
                <h2 className="text-3xl font-black tracking-tight text-white">DJ {venue.currentMusic.dj}</h2>
                <p className="text-sm text-zinc-400">Current Set: <span className="text-white font-bold">{venue.currentMusic.song}</span></p>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 pt-2">
                  <span className="bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1">🎸 {venue.currentMusic.genre}</span>
                  <span className="bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1">⚡ BPM: {venue.currentMusic.bpm}</span>
                  <span className="bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1">🔑 Key: {venue.currentMusic.key}</span>
                </div>
              </div>

              <div>
                <Link
                  to={`/profile/${venue.currentMusic.dj}`}
                  className="dk-button bg-[#DFE104] text-black font-black uppercase text-xs tracking-wider px-6 py-3.5 rounded-xl block text-center"
                >
                  BOOK THIS DJ
                </Link>
              </div>
            </div>
          )}

          {/* Lineup schedule */}
          {venue.lineup && (
            <div className="dk-panel p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] space-y-4">
              <h3 className="text-lg font-black uppercase tracking-wider text-[#DFE104]">Lineup Schedule</h3>
              <div className="space-y-3">
                {venue.lineup.map((l, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="font-bold text-white uppercase tracking-wide">DJ {l.dj}</p>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">{l.stage}</p>
                    </div>
                    <span className="text-xs text-zinc-300 font-mono">{l.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black uppercase tracking-wider text-[#DFE104]">Verified Reviews</h3>
              <button
                onClick={() => setShowReviewModal(true)}
                className="dk-button bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08] font-bold text-xs px-4 py-2"
              >
                + WRITE REVIEW
              </button>
            </div>

            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img src={rev.authorAvatar || `https://ui-avatars.com/api/?name=${rev.authorUsername}`} alt="" className="h-8 w-8 rounded-full" />
                      <div>
                        <span className="text-xs font-black text-white">{rev.authorUsername}</span>
                        {rev.verifiedAttendee && (
                          <span className="ml-2 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            VERIFIED ATTENDEE
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-[#DFE104] font-black">★ {rev.rating}/5</span>
                  </div>
                  <p className="text-sm text-zinc-300">{rev.text}</p>
                </div>
              ))}
              {reviews.length === 0 && (
                <p className="text-sm text-zinc-500 font-bold uppercase">No reviews yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT column: Status, hours, weather, directions, crowd indicator */}
        <div className="space-y-6">
          {/* Crowd indicator card */}
          <div className="dk-panel p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Live Crowd Status</span>
              <div className={`mt-2 rounded-2xl border p-4 text-center font-black uppercase tracking-widest text-lg ${crowdColors}`}>
                {crowdLevel}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Opening Hours</span>
              <p className="text-sm font-bold text-white">{venue.operatingHours}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Timezone: {venue.timezone}</p>
            </div>
          </div>

          {/* Amenities Grid */}
          <div className="dk-panel p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Club Amenities</h4>
            <div className="grid grid-cols-2 gap-2">
              {venue.amenities.map((a) => (
                <span key={a} className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-bold text-zinc-300 text-center">
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Weather & Map navigation */}
          <div className="dk-panel p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Directions & Weather</h4>
              {/* Mock Weather widget */}
              <div className="mt-3 bg-white/[0.04] rounded-2xl p-3 flex justify-between items-center border border-white/[0.08]">
                <div>
                  <p className="text-xs font-black uppercase text-zinc-400">Weather Forecast</p>
                  <p className="text-lg font-black mt-1">29°C · Rainy</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase">AQI: 55 Good</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Sunset: 7:12 PM</p>
                </div>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08]">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="dk-button bg-white/[0.06] border border-white/[0.08] text-white font-black text-[10px] uppercase tracking-wider py-3 rounded-xl text-center"
              >
                OPEN MAPS
              </a>
              <a
                href={`https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${venue.latitude}&dropoff[longitude]=${venue.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="dk-button bg-[#DFE104] text-black font-black text-[10px] uppercase tracking-wider py-3 rounded-xl text-center"
              >
                BOOK UBER
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="dk-panel relative w-full max-w-md rounded-[2rem] p-6 z-10"
            >
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-xl font-black uppercase tracking-tight text-[#DFE104]">Submit Review</h3>
                <button onClick={() => setShowReviewModal(false)} className="h-8 w-8 bg-white/5 rounded-full flex items-center justify-center">
                  <IconsaxAnimated name="close" size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Rating selection sliders */}
                {[
                  { label: 'Overall Rating', val: rating, set: setRating },
                  { label: 'Music Quality', val: ratingMusic, set: setRatingMusic },
                  { label: 'Crowd Vibe', val: ratingCrowd, set: setRatingCrowd },
                  { label: 'Sound Quality', val: ratingSound, set: setRatingSound }
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold uppercase text-zinc-400">
                      <span>{item.label}</span>
                      <span className="text-[#DFE104]">{item.val}/5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={item.val}
                      onChange={(e) => item.set(parseInt(e.target.value))}
                      className="w-full accent-[#DFE104]"
                    />
                  </div>
                ))}

                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-zinc-400">Review Message</span>
                  <textarea
                    placeholder="Write your review here..."
                    required
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    rows={4}
                    className="dk-input w-full px-4 py-3 rounded-2xl text-sm"
                  />
                </div>

                <button type="submit" className="dk-button bg-[#DFE104] text-black font-black uppercase tracking-wider py-3.5 w-full rounded-2xl">
                  SUBMIT REVIEW
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
