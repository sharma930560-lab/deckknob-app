import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { eventService } from '../services/eventService';
import { useToast } from '../components/ui/Toast';
import TrashModal from '../components/events/TrashModal';

const EVENT_TYPES = ['All', 'Club', 'Festival', 'Private Party', 'Concert', 'Other'];

export default function Events() {
  const navigate = useNavigate();
  const { user } = authStore();
  const { showToast } = useToast();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'list'
  const [selectedType, setSelectedType] = useState('All');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterSection, setFilterSection] = useState('upcoming'); // 'upcoming' | 'past' for list view
  const [showTrashModal, setShowTrashModal] = useState(false);

  const userTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);

  // Fetch all events on mount or when refreshed
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      if (user?.uid) {
        await eventService.runOwnerEventCleanup(user.uid).catch(() => {});
      }
      const data = await eventService.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
      showToast('Unable to load events.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, showToast]);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      setLoading(true);
      if (user?.uid) {
        eventService.runOwnerEventCleanup(user.uid).catch(() => {});
      }
      unsubscribe = eventService.subscribeEvents(
        (realtimeEvents) => {
          setEvents(realtimeEvents);
          setLoading(false);
        },
        (err) => {
          console.error('Real-time events subscription fallback:', err);
          loadEvents();
        }
      );
    } catch {
      loadEvents();
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid, loadEvents]);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Helper to parse event start timestamp reliably
  const getEventStartTime = (event) => {
    if (event.startDateTimeIso) return new Date(event.startDateTimeIso).getTime();
    if (event.dateTime) return new Date(event.dateTime).getTime();
    if (event.createdAt?.seconds) return event.createdAt.seconds * 1000;
    return 0;
  };

  // Helper to parse event end timestamp reliably
  const getEventEndTime = (event) => {
    if (event.endDateTimeIso) return new Date(event.endDateTimeIso).getTime();
    const start = getEventStartTime(event);
    return start + 4 * 60 * 60 * 1000; // default to 4 hours if unset
  };

  // Format local display
  const formatEventDateTime = (isoString, tz) => {
    if (!isoString) return 'TBA';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(d);
    } catch {
      return isoString;
    }
  };

  // Filtered by event type
  const typeFilteredEvents = useMemo(() => {
    if (selectedType === 'All') return events;
    return events.filter(e => (e.eventType || 'Other').toLowerCase() === selectedType.toLowerCase());
  }, [events, selectedType]);

  // Split into Upcoming and Past
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = Date.now();
    const upcoming = [];
    const past = [];

    typeFilteredEvents.forEach(e => {
      const end = getEventEndTime(e);
      if (end >= now) {
        upcoming.push(e);
      } else {
        past.push(e);
      }
    });

    // Upcoming: closest first
    upcoming.sort((a, b) => getEventStartTime(a) - getEventStartTime(b));
    // Past: most recent first
    past.sort((a, b) => getEventStartTime(b) - getEventStartTime(a));

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [typeFilteredEvents]);

  // Calendar Month Grid Generation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        monthOffset: -1,
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        dayNumber: i,
        monthOffset: 0,
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        monthOffset: 1,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Match events to days
  const eventsByDateMap = useMemo(() => {
    const map = new Map();
    typeFilteredEvents.forEach(e => {
      const startTime = getEventStartTime(e);
      if (!startTime) return;
      const d = new Date(startTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return map;
  }, [typeFilteredEvents]);

  // Week View Days Generation
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Adjust to Sunday
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({
        date: d,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNumber: d.getDate(),
        events: eventsByDateMap.get(key) || []
      });
    }
    return days;
  }, [currentDate, eventsByDateMap]);

  const isToday = (d) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const handleShareEvent = async (ev) => {
    const url = window.location.origin + `/events/${ev.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: ev.title,
          text: `Check out ${ev.title} at ${ev.venue} on DECKKNOB!`,
          url,
        });
        return;
      } catch {
        // user dismissed or unsupported
      }
    }
    navigator.clipboard?.writeText(url);
    showToast('Event link copied to clipboard!', 'success');
  };

  const handleDeleteEvent = async (ev) => {
    if (!ev?.id || !user?.uid) return;
    const confirmed = window.confirm(`Move "${ev.title || 'this event'}" to Trash? You can restore it later from Event Trash.`);
    if (!confirmed) return;
    try {
      await eventService.trashEvent(ev.id, user.uid);
      showToast('Event moved to Trash.', 'info');
      setSelectedEvent(null);
    } catch (err) {
      console.error('Failed to trash event:', err);
      showToast(err.message || 'Failed to delete event.', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#DFE104] animate-ping" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#DFE104]">DJ Events & Gigs</p>
          </div>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            Gig Calendar
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Viewer timezone: <span className="font-semibold text-zinc-200">{userTimezone}</span>
          </p>
        </div>

        {/* Action Buttons: Trash & Schedule Gig */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              id="open-trash-btn"
              onClick={() => setShowTrashModal(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
              title="View your deleted events"
            >
              <span>🗑️</span>
              Trash
            </button>
          )}
          <button
            onClick={() => navigate('/create-event')}
            className="dk-button flex items-center gap-2 bg-[#DFE104] px-6 py-3.5 text-xs font-black uppercase tracking-[0.14em] text-black shadow-lg shadow-[#DFE104]/10 hover:bg-[#c9cb03] transition-all"
          >
            <IconsaxAnimated name="add" size={18} />
            Schedule Gig
          </button>
        </div>
      </div>

      {/* Control Bar: View Switcher, Month Navigation, Type Filters */}
      <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              onClick={handlePrev}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
              title="Previous"
            >
              ◀
            </button>
            <button
              onClick={handleToday}
              className="px-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-[#DFE104] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
              title="Next"
            >
              ▶
            </button>
          </div>

          <h2 className="text-xl font-black uppercase tracking-tight text-white min-w-[200px]">
            {viewMode === 'week' ? `Week of ${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}` : `${monthNames[month]} ${year}`}
          </h2>
        </div>

        {/* View Mode Toggle & Event Type Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Buttons */}
          <div className="flex rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                viewMode === 'month' ? 'bg-[#DFE104] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                viewMode === 'week' ? 'bg-[#DFE104] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-xl px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                viewMode === 'list' ? 'bg-[#DFE104] text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                  selectedType === type
                    ? 'border border-[#DFE104]/50 bg-[#DFE104]/10 text-[#DFE104]'
                    : 'border border-transparent bg-white/[0.03] text-zinc-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="mt-16 flex flex-col items-center justify-center py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#DFE104]/20 border-t-[#DFE104]" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Loading DJ Gigs & Venues...
          </p>
        </div>
      ) : (
        <div className="mt-6">
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="dk-panel overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0c0c0c] p-2 sm:p-4">
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 gap-1 border-b border-white/[0.06] pb-3 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-2">
                {calendarDays.map((cell, idx) => {
                  const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
                  const dayEvents = eventsByDateMap.get(key) || [];
                  const activeToday = isToday(cell.date);

                  return (
                    <div
                      key={idx}
                      className={`min-h-[90px] sm:min-h-[120px] rounded-2xl border p-1.5 sm:p-2 transition-all flex flex-col ${
                        cell.isCurrentMonth
                          ? 'border-white/[0.05] bg-white/[0.015] hover:border-white/[0.15]'
                          : 'border-white/[0.02] bg-black/40 opacity-40'
                      } ${activeToday ? 'ring-1 ring-[#DFE104]/60 bg-[#DFE104]/[0.02]' : ''}`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                            activeToday
                              ? 'bg-[#DFE104] font-black text-black'
                              : cell.isCurrentMonth ? 'text-zinc-300' : 'text-zinc-600'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="hidden sm:inline-block rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Badges in Cell */}
                      <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`w-full truncate rounded-lg px-1.5 py-0.5 text-left text-[10px] font-semibold transition-all flex items-center gap-1 ${
                              ev.status === 'cancelled'
                                ? 'bg-red-500/10 text-red-400 line-through'
                                : 'bg-white/[0.06] text-zinc-200 hover:bg-[#DFE104] hover:text-black'
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#DFE104] shrink-0" />
                            <span className="truncate">{ev.title}</span>
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-zinc-500 font-bold px-1">
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {weekDays.map((col, idx) => {
                const activeToday = isToday(col.date);
                return (
                  <div
                    key={idx}
                    className={`dk-panel flex flex-col rounded-3xl border p-4 transition-all min-h-[300px] ${
                      activeToday
                        ? 'border-[#DFE104]/50 bg-[#DFE104]/[0.03] shadow-lg shadow-[#DFE104]/5'
                        : 'border-white/[0.06] bg-white/[0.015]'
                    }`}
                  >
                    <div className="border-b border-white/[0.06] pb-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{col.dayName}</p>
                      <p className={`mt-1 text-2xl font-black ${activeToday ? 'text-[#DFE104]' : 'text-white'}`}>
                        {col.dayNumber}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 flex-1">
                      {col.events.length === 0 ? (
                        <p className="pt-6 text-center text-[11px] text-zinc-600 font-medium">No gigs</p>
                      ) : (
                        col.events.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="cursor-pointer rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5 transition-all hover:border-[#DFE104]/40 hover:bg-white/[0.06]"
                          >
                            <div className="flex items-center justify-between">
                              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#DFE104]">
                                {ev.eventType || 'Gig'}
                              </span>
                              {ev.status === 'cancelled' && (
                                <span className="text-[9px] font-bold uppercase text-red-400">Cancelled</span>
                              )}
                            </div>
                            <h4 className="mt-1 text-xs font-bold text-white line-clamp-1">{ev.title}</h4>
                            <p className="text-[10px] text-zinc-400 line-clamp-1">📍 {ev.venue}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LIST VIEW (Chronological Upcoming vs Past) */}
          {viewMode === 'list' && (
            <div className="space-y-6">
              {/* Upcoming / Past Tab Switcher */}
              <div className="flex items-center gap-4 border-b border-white/[0.06] pb-3">
                <button
                  onClick={() => setFilterSection('upcoming')}
                  className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-all ${
                    filterSection === 'upcoming'
                      ? 'text-[#DFE104] border-b-2 border-[#DFE104] pb-2'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Upcoming Gigs ({upcomingEvents.length})
                </button>
                <button
                  onClick={() => setFilterSection('past')}
                  className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-all ${
                    filterSection === 'past'
                      ? 'text-[#DFE104] border-b-2 border-[#DFE104] pb-2'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Past Events ({pastEvents.length})
                </button>
              </div>

              {/* Event Cards Grid */}
              {filterSection === 'upcoming' ? (
                upcomingEvents.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">
                    <p className="text-zinc-400 text-sm font-bold">No upcoming gigs found for this filter.</p>
                    <button
                      onClick={() => navigate('/create-event')}
                      className="mt-4 rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#DFE104] hover:bg-[#DFE104] hover:text-black transition-all"
                    >
                      + Schedule the First Gig
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onSelect={() => setSelectedEvent(ev)}
                        formatDateTime={formatEventDateTime}
                      />
                    ))}
                  </div>
                )
              ) : (
                pastEvents.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-zinc-500 text-sm">
                    No past events on record.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-80">
                    {pastEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onSelect={() => setSelectedEvent(ev)}
                        formatDateTime={formatEventDateTime}
                        isPast
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="dk-panel relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] border border-white/[0.12] bg-[#111111] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-zinc-400 hover:bg-white/[0.15] hover:text-white transition-colors"
            >
              ✕
            </button>

            {/* Event Poster Banner */}
            {selectedEvent.image && (
              <div className="relative mb-6 h-56 w-full overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 rounded-xl bg-black/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#DFE104] backdrop-blur-md">
                  {selectedEvent.eventType || 'Event'}
                </span>
              </div>
            )}

            {/* Badges & Status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#DFE104]">
                {selectedEvent.eventType || 'Club'}
              </span>
              {selectedEvent.status === 'cancelled' ? (
                <span className="rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30">
                  CANCELLED
                </span>
              ) : (
                <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                  CONFIRMED
                </span>
              )}
            </div>

            {/* Title & DJ */}
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">
              {selectedEvent.title}
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Presented by <span className="font-semibold text-zinc-200">{selectedEvent.username || 'Resident DJ'}</span>
            </p>

            {/* Date & Location Details */}
            <div className="mt-6 grid gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Starts (Your Local Time)</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {formatEventDateTime(selectedEvent.startDateTimeIso || selectedEvent.dateTime)}
                </p>
                {selectedEvent.timezone && (
                  <p className="text-[10px] text-zinc-500">Original timezone: {selectedEvent.timezone}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Ends</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {selectedEvent.endDateTimeIso ? formatEventDateTime(selectedEvent.endDateTimeIso) : 'Until close'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Venue & Exact Address</p>
                <p className="mt-1 text-sm font-bold text-white">📍 {selectedEvent.venue}</p>
                {selectedEvent.address && (
                  <p className="mt-0.5 text-xs text-zinc-400">{selectedEvent.address}</p>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedEvent.description && (
              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lineup & Details</h4>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
                  {selectedEvent.description}
                </p>
              </div>
            )}

            {/* Organizer Contact */}
            {selectedEvent.organizerContact && (
              <p className="mt-4 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Promoter / Contact:</span> {selectedEvent.organizerContact}
              </p>
            )}

            {/* Action Buttons: Directions, Tickets, Share, Edit */}
            <div className="mt-8 flex flex-wrap items-center gap-3 pt-4 border-t border-white/[0.08]">
              {selectedEvent.directionsUrl && (
                <a
                  href={selectedEvent.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dk-button flex items-center gap-2 bg-[#DFE104] px-5 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-[#c9cb03] transition-all"
                >
                  <span>🗺️</span> Get Directions
                </a>
              )}

              {(selectedEvent.ticketUrl || selectedEvent.website) && (
                <a
                  href={selectedEvent.ticketUrl || selectedEvent.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/[0.04] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/[0.1] transition-all"
                >
                  <span>🎟️</span> Tickets / RSVP
                </a>
              )}

              <button
                onClick={() => handleShareEvent(selectedEvent)}
                className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
              >
                <span>🔗</span> Share
              </button>

              {/* Owner Actions: Edit & Delete Gig */}
              {user && selectedEvent.authorId === user.uid && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/create-event?edit=${selectedEvent.id}`)}
                    className="flex items-center gap-1.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500 hover:text-black transition-all"
                  >
                    ✏️ Edit Gig
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="flex items-center gap-1.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500 hover:text-white transition-all"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recoverable Event Trash Modal */}
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        currentUid={user?.uid}
        onRestored={loadEvents}
      />
    </div>
  );
}

// Reusable Event Card Component for List View
function EventCard({ event, onSelect, formatDateTime, isPast }) {
  const isCancelled = event.status === 'cancelled';

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer rounded-3xl border p-5 transition-all flex flex-col justify-between ${
        isCancelled
          ? 'border-red-500/20 bg-red-500/[0.02]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-[#DFE104]/50 hover:bg-white/[0.04]'
      }`}
    >
      <div>
        {/* Banner Thumbnail if available */}
        {event.image && (
          <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl border border-white/10">
            <img
              src={event.image}
              alt={event.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {isCancelled && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="rounded-lg bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">
                  Cancelled
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#DFE104]">
            {event.eventType || 'Club'}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {formatDateTime(event.startDateTimeIso || event.dateTime)}
          </span>
        </div>

        <h3 className={`mt-2 text-lg font-bold text-white transition-colors group-hover:text-[#DFE104] ${isCancelled ? 'line-through text-zinc-500' : ''}`}>
          {event.title}
        </h3>

        <p className="mt-1 text-xs text-zinc-400">
          📍 <span className="text-zinc-300 font-semibold">{event.venue}</span>
          {event.address && <span className="text-zinc-500"> • {event.address}</span>}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs text-zinc-500">
        <span>By {event.username || 'DJ'}</span>
        <span className="text-[#DFE104] font-bold group-hover:translate-x-1 transition-transform">
          Details →
        </span>
      </div>
    </div>
  );
}
