import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import EventCard from '../components/events/EventCard';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import KineticMarquee from '../components/ui/KineticMarquee';
import { eventService } from '../services/eventService';
import { exploreService } from '../services/exploreService';
import authStore from '../stores/authStore';
import { useToast } from '../components/ui/Toast';

export default function TodayEvents({ mode = 'today' }) {
  const { id } = useParams();
  const { user } = authStore();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    const loadData = async () => {
      try {
        if (id) {
          const found = await eventService.getEventById(id);
          setSelected(found || null);
        }
        
        let list = [];
        if (mode === 'today') {
          list = await eventService.getTodayEvents();
        } else {
          list = await eventService.getEvents();
        }
        setEvents(list);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, mode]);

  // Fetch suggested users (DJs) for the trending section
  useEffect(() => {
    const currentUid = user?.uid || null;
    exploreService.getSuggestedUsers(currentUid)
      .then(data => setSuggestedUsers(data))
      .catch(() => {});
  }, [user]);

  const handleRsvp = async () => {
    if (!user) {
      showToast('Please log in to RSVP.', 'warning');
      return;
    }
    if (!selected) return;
    
    setIsRsvpLoading(true);
    const isAttending = selected.attendees?.includes(user.uid);
    try {
      await eventService.rsvpEvent(selected.id, user.uid, !isAttending);
      
      // Update local state
      const updatedAttendees = isAttending
        ? selected.attendees.filter(uid => uid !== user.uid)
        : [...(selected.attendees || []), user.uid];
        
      setSelected(prev => prev ? { ...prev, attendees: updatedAttendees } : null);
      showToast(isAttending ? 'RSVP Cancelled' : 'RSVP Registered successfully!', 'success');
    } catch (e) {
      showToast(e.message || 'RSVP failed.', 'error');
    } finally {
      setIsRsvpLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-zinc-500 animate-pulse text-xs">Loading events...</p>
      </div>
    );
  }

  if (mode === 'detail' && selected) {
    const hasRsvped = user && selected.attendees?.includes(user.uid);
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-[2rem]">
          <img
            src={selected.image || selected.media_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900'}
            alt={selected.title}
            className="h-[50vh] sm:h-[60vh] lg:h-[70vh] min-h-[360px] w-full object-cover"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-10">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-[#DFE104]">{selected.date} / {selected.time}</p>
            <h1 className="kinetic-display mt-2 sm:mt-3" style={{ fontSize: 'clamp(2rem, 8vw, 14rem)' }}>{selected.title}</h1>
            <p className="mt-3 sm:mt-5 max-w-2xl text-sm sm:text-lg text-zinc-300">
              {selected.venue}{selected.city ? `, ${selected.city}` : ''}.
              {selected.lineup?.length > 0 && ` Featuring ${selected.lineup.join(', ')}.`}
            </p>
            <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3">
              {(selected.url || selected.ticketUrl) && (
                <a href={selected.url || selected.ticketUrl} target="_blank" rel="noreferrer" className="dk-button bg-[#DFE104] px-4 sm:px-5 text-xs sm:text-sm font-black uppercase tracking-[0.12em] text-black">
                  Visit Venue / Ticket Website
                </a>
              )}
              <button 
                onClick={handleRsvp}
                disabled={isRsvpLoading}
                className={`dk-button px-4 sm:px-5 text-xs sm:text-sm font-bold ${hasRsvped ? 'bg-[#DFE104] text-black' : 'bg-white/[0.08] text-white'}`}
              >
                {isRsvpLoading ? 'RSVPing...' : hasRsvped ? '✓ RSVPed' : 'RSVP Event'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 lg:px-8">
      <section className="mb-6 sm:mb-8 overflow-hidden border-y border-white/[0.1] py-3 sm:py-5">
        <KineticMarquee speed="22s">
          <span className="mr-6 sm:mr-8 text-4xl sm:text-6xl font-black uppercase tracking-[-0.08em] text-[#DFE104]">TODAY EVENTS</span>
          <span className="mr-6 sm:mr-8 text-4xl sm:text-6xl font-black uppercase tracking-[-0.08em] text-white">LIVE ROOMS</span>
          <span className="mr-6 sm:mr-8 text-4xl sm:text-6xl font-black uppercase tracking-[-0.08em] text-zinc-600">TRENDING DJS</span>
        </KineticMarquee>
      </section>

      <div className="mb-5 sm:mb-6 flex items-end justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">{mode === 'all' ? 'Discovery' : 'Happening now'}</p>
          <h1 className="mt-1 sm:mt-2 text-3xl sm:text-4xl font-black uppercase tracking-[-0.06em] lg:text-6xl">{mode === 'all' ? 'Events' : "Tonight's Events"}</h1>
        </div>
        <IconsaxAnimated name="calendar" size={28} className="text-[#DFE104] shrink-0 sm:hidden" />
        <IconsaxAnimated name="calendar" size={34} className="text-[#DFE104] shrink-0 hidden sm:block" />
      </div>

      {events.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No events scheduled. Check back later!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {suggestedUsers.length > 0 && (
        <section className="mt-8 sm:mt-10">
          <p className="mb-3 sm:mb-4 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Trending DJs</p>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
            {suggestedUsers.map((dj) => (
              <div key={dj.id || dj.username} className="dk-panel rounded-2xl sm:rounded-3xl p-3 sm:p-4">
                <img src={dj.profile_pic || dj.avatar || `https://ui-avatars.com/api/?name=${dj.username}&background=DFE104&color=000&bold=true`} alt={dj.username} className="h-12 w-12 sm:h-16 sm:w-16 rounded-full object-cover" />
                <p className="mt-2 sm:mt-3 font-bold text-sm sm:text-base truncate">@{dj.username}</p>
                <p className="text-xs sm:text-sm text-zinc-500 truncate">{dj.role || dj.genre || 'DJ'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
