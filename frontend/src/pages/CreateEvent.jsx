import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import authStore from '../stores/authStore';
import { eventService } from '../services/eventService';
import { storageService } from '../services/storageService';
import { useToast } from '../components/ui/Toast';
import LocationPickerModal from '../components/events/LocationPickerModal';

const EVENT_TYPES = ['Club', 'Festival', 'Private Party', 'Concert', 'Other'];

export default function CreateEvent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editEventId = searchParams.get('edit');
  
  const { user } = authStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('Club');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [placeId, setPlaceId] = useState('');
  const [directionsUrl, setDirectionsUrl] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [organizerContact, setOrganizerContact] = useState('');
  const [description, setDescription] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventStatus, setEventStatus] = useState('scheduled');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load event if in edit mode
  useEffect(() => {
    if (!editEventId) return;

    let mounted = true;
    const fetchExistingEvent = async () => {
      try {
        const ev = await eventService.getEventById(editEventId);
        if (!ev || !mounted) return;

        // Check ownership
        if (user && ev.authorId !== user.uid) {
          showToast('You can only edit your own events.', 'error');
          navigate('/events');
          return;
        }

        setIsEditMode(true);
        setTitle(ev.title || '');
        setEventType(ev.eventType || 'Club');
        setVenue(ev.venue || '');
        setAddress(ev.address || '');
        setLatitude(ev.latitude ?? null);
        setLongitude(ev.longitude ?? null);
        setPlaceId(ev.placeId || '');
        setDirectionsUrl(ev.directionsUrl || '');
        
        // Format ISO for datetime-local input
        if (ev.startDateTimeIso) {
          const s = new Date(ev.startDateTimeIso);
          if (!isNaN(s)) {
            const pad = (n) => String(n).padStart(2, '0');
            setStartDateTime(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}T${pad(s.getHours())}:${pad(s.getMinutes())}`);
          }
        }
        if (ev.endDateTimeIso) {
          const e = new Date(ev.endDateTimeIso);
          if (!isNaN(e)) {
            const pad = (n) => String(n).padStart(2, '0');
            setEndDateTime(`${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}`);
          }
        }

        setTicketUrl(ev.ticketUrl || ev.website || '');
        setOrganizerContact(ev.organizerContact || '');
        setDescription(ev.description || '');
        setExistingImageUrl(ev.image || '');
        setBannerPreview(ev.image || '');
        setEventStatus(ev.status || 'scheduled');
      } catch (err) {
        showToast(err.message || 'Failed to load event data.', 'error');
      }
    };

    fetchExistingEvent();
    return () => { mounted = false; };
  }, [editEventId, user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleLocationSelected = (locationData) => {
    setVenue(locationData.venueName || venue);
    setAddress(locationData.formattedAddress || '');
    setLatitude(locationData.latitude);
    setLongitude(locationData.longitude);
    setPlaceId(locationData.placeId || '');
    setDirectionsUrl(locationData.directionsUrl || `https://www.google.com/maps/dir/?api=1&destination=${locationData.latitude},${locationData.longitude}`);
  };

  const validateInputs = () => {
    if (!title.trim()) {
      showToast('Event title is required.', 'warning');
      return false;
    }
    if (!venue.trim()) {
      showToast('Venue name is required.', 'warning');
      return false;
    }
    if (!address.trim()) {
      showToast('Venue address is required.', 'warning');
      return false;
    }
    if (!startDateTime) {
      showToast('Start date and time is required.', 'warning');
      return false;
    }
    if (!endDateTime) {
      showToast('End date and time is required.', 'warning');
      return false;
    }

    const start = new Date(startDateTime).getTime();
    const end = new Date(endDateTime).getTime();

    if (isNaN(start) || isNaN(end)) {
      showToast('Invalid date and time selected.', 'error');
      return false;
    }

    if (end <= start) {
      showToast('End date and time must be later than start date and time.', 'warning');
      return false;
    }

    if (ticketUrl && !ticketUrl.startsWith('http://') && !ticketUrl.startsWith('https://')) {
      showToast('Ticket URL must begin with http:// or https://', 'warning');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    if (!user) {
      showToast('You must be logged in to manage gigs.', 'error');
      return;
    }

    setIsPublishing(true);
    try {
      let bannerUrl = existingImageUrl;
      if (bannerFile) {
        bannerUrl = await storageService.uploadEventBanner(user.uid, bannerFile);
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const startDateTimeIso = new Date(startDateTime).toISOString();
      const endDateTimeIso = new Date(endDateTime).toISOString();

      const calculatedDirectionsUrl = (latitude != null && longitude != null)
        ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        : directionsUrl || (address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : '');

      if (isEditMode && editEventId) {
        await eventService.updateEvent(editEventId, {
          title: title.trim(),
          eventType,
          venue: venue.trim(),
          address: address.trim(),
          latitude: latitude != null ? Number(latitude) : null,
          longitude: longitude != null ? Number(longitude) : null,
          placeId: placeId || '',
          directionsUrl: calculatedDirectionsUrl,
          startDateTimeIso,
          endDateTimeIso,
          dateTime: startDateTime, // backwards compatibility
          ticketUrl: ticketUrl.trim(),
          website: ticketUrl.trim(), // backwards compatibility
          organizerContact: organizerContact.trim(),
          description: description.trim(),
          image: bannerUrl,
          timezone,
        }, user.uid);

        showToast('Event updated successfully!', 'success');
      } else {
        await eventService.createEvent({
          authorId: user.uid,
          username: user.username || user.displayName || 'DJ',
          title: title.trim(),
          eventType,
          venue: venue.trim(),
          address: address.trim(),
          latitude: latitude != null ? Number(latitude) : null,
          longitude: longitude != null ? Number(longitude) : null,
          placeId: placeId || '',
          directionsUrl: calculatedDirectionsUrl,
          startDateTimeIso,
          endDateTimeIso,
          dateTime: startDateTime, // backwards compatibility
          ticketUrl: ticketUrl.trim(),
          website: ticketUrl.trim(), // backwards compatibility
          organizerContact: organizerContact.trim(),
          description: description.trim(),
          image: bannerUrl,
          timezone,
          status: 'scheduled'
        });

        showToast('Gig scheduled successfully!', 'success');
      }

      navigate('/events');
    } catch (err) {
      showToast(err.message || 'Failed to save event.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const confirmCancelGig = async () => {
    if (!editEventId || !user) return;
    setIsCancelling(true);
    try {
      await eventService.cancelEvent(editEventId, user.uid);
      showToast('Gig has been marked as cancelled.', 'info');
      setShowCancelModal(false);
      navigate('/events');
    } catch (err) {
      showToast(err.message || 'Failed to cancel gig.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const confirmDeleteGig = async () => {
    if (!editEventId || !user) return;
    setIsDeleting(true);
    try {
      await eventService.trashEvent(editEventId, user.uid, 'manual_delete');
      showToast('Event moved to Trash. You can restore it anytime from your Event Trash.', 'info');
      setShowDeleteModal(false);
      navigate('/events');
    } catch (err) {
      showToast(err.message || 'Failed to delete event.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">
            {isEditMode ? 'Gig Management' : 'Promoter & DJ Tools'}
          </p>
          <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            {isEditMode ? 'Edit Gig' : 'Create Gig'}
          </h1>
        </div>

        {isEditMode && (
          <div className="flex items-center gap-2.5 self-start flex-wrap">
            {eventStatus !== 'cancelled' && (
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={isCancelling || isDeleting}
                className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Gig'}
              </button>
            )}
            <button
              type="button"
              id="delete-event-btn"
              onClick={() => setShowDeleteModal(true)}
              disabled={isDeleting || isCancelling}
              className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-400 transition-all disabled:opacity-50"
            >
              {isDeleting ? 'Moving to Trash...' : '🗑️ Delete Event'}
            </button>
          </div>
        )}
      </div>

      {eventStatus === 'cancelled' && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-300">
          ⚠️ This event is currently marked as <span className="font-bold uppercase tracking-wider">Cancelled</span>. Saving changes will keep its cancellation record.
        </div>
      )}

      <form onSubmit={handleSubmit} className="dk-panel mt-8 grid gap-5 rounded-[2rem] p-6 lg:grid-cols-2">
        {/* Title */}
        <label className="block lg:col-span-2">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="calendar" size={16} /> Event Title *
          </span>
          <input
            required
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#DFE104]"
            placeholder="Warehouse Session w/ DJ Sonic"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {/* Event Type */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="music" size={16} /> Event Type *
          </span>
          <select
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-[#141414] px-4 text-sm text-white outline-none focus:border-[#DFE104]"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type} className="bg-zinc-900 text-white">
                {type}
              </option>
            ))}
          </select>
        </label>

        {/* Venue Name */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="location" size={16} /> Venue Name *
          </span>
          <input
            required
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#DFE104]"
            placeholder="Club Horizon / Warehouse 4"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
          />
        </label>

        {/* Venue Address + Map Picker Button */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              <IconsaxAnimated name="map" size={16} /> Venue Address & Exact Pin *
            </span>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#DFE104]/30 bg-[#DFE104]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#DFE104] hover:bg-[#DFE104] hover:text-black transition-all"
            >
              📍 {latitude != null ? 'Edit Map Pin' : 'Select on Map'}
            </button>
          </div>
          
          <input
            required
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#DFE104]"
            placeholder="124 Electronic Ave, Berlin, Germany"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {latitude != null && longitude != null && (
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-zinc-400">
              <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-zinc-300 font-mono">
                Lat: {Number(latitude).toFixed(5)}, Lng: {Number(longitude).toFixed(5)}
              </span>
              <span className="text-emerald-400 font-medium">✓ Pin synchronized</span>
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#DFE104] underline hover:text-[#DFE104]/80 ml-auto"
                >
                  Test Directions ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* Start Date & Time */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="clock" size={16} /> Start Date & Time *
          </span>
          <input
            required
            type="datetime-local"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-[#DFE104]"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
          />
        </label>

        {/* End Date & Time (Allows Midnight Crossing) */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="clock" size={16} /> End Date & Time * (Overnight allowed)
          </span>
          <input
            required
            type="datetime-local"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white outline-none focus:border-[#DFE104]"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
          />
        </label>

        {/* Ticket URL */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="link" size={16} /> Ticket / RSVP Link (Optional)
          </span>
          <input
            type="url"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#DFE104]"
            placeholder="https://residentadvisor.net/events/..."
            value={ticketUrl}
            onChange={(e) => setTicketUrl(e.target.value)}
          />
        </label>

        {/* Organizer / Contact Info */}
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="user" size={16} /> Organizer Contact / Promoter Info
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#DFE104]"
            placeholder="bookings@collective.fm or @promoter"
            value={organizerContact}
            onChange={(e) => setOrganizerContact(e.target.value)}
          />
        </label>

        {/* Event Poster / Banner */}
        <div className="lg:col-span-2 space-y-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="image" size={16} /> Event Poster / Artwork
          </span>
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-3xl border border-white/[0.06] bg-white/[0.02] p-4">
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Banner Preview"
                className="h-28 w-44 rounded-xl object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="h-28 w-44 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-xs text-zinc-600 font-bold shrink-0">
                NO POSTER
              </div>
            )}
            <div className="space-y-1 w-full sm:w-auto">
              <label className="flex h-11 w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-xs font-bold uppercase tracking-[0.08em] text-zinc-300 hover:border-[#DFE104]/50 hover:text-white transition-colors">
                📁 {bannerPreview ? 'Replace Poster' : 'Upload Poster'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
              <p className="text-[11px] text-zinc-500">Supports PNG, JPG, WebP up to 10MB</p>
            </div>
          </div>
        </div>

        {/* Event Details / Description */}
        <label className="block lg:col-span-2">
          <span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
            <IconsaxAnimated name="info" size={16} /> Event Details & Lineup
          </span>
          <textarea
            className="h-32 w-full resize-none rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#DFE104]"
            placeholder="Lineup, set times, door policy, sound system specs..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPublishing}
          className="dk-button h-14 bg-[#DFE104] font-black uppercase tracking-[0.14em] text-black lg:col-span-2 flex items-center justify-center gap-2 hover:bg-[#c9cb03] transition-all disabled:opacity-50"
        >
          {isPublishing && <span className="animate-spin h-5 w-5 border-2 border-black/30 border-t-black rounded-full" />}
          {isPublishing
            ? isEditMode ? 'Updating Gig...' : 'Scheduling Gig...'
            : isEditMode ? 'Update Gig' : 'Schedule Gig'}
        </button>
      </form>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={handleLocationSelected}
        initialAddress={address}
        initialLat={latitude}
        initialLng={longitude}
      />

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
          <div className="dk-panel w-full max-w-md rounded-[2rem] border border-red-500/30 bg-[#121214] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Cancel This Gig?</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-300">
              Are you sure you want to cancel this gig? It will be marked as <span className="font-bold text-red-400">Cancelled</span> and removed from active upcoming listings, while preserving your historical records.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/[0.08] transition-colors"
              >
                Keep Gig
              </button>
              <button
                type="button"
                onClick={confirmCancelGig}
                disabled={isCancelling}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling && <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />}
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event to Trash Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fadeIn" id="delete-confirm-modal">
          <div className="dk-panel w-full max-w-md rounded-[2rem] border border-red-500/40 bg-[#121214] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">🗑️</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Delete Event?</h3>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-zinc-300">
              Are you sure you want to delete <span className="font-bold text-[#DFE104] underline">&ldquo;{title || 'Untitled Gig'}&rdquo;</span>?
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              This event will be moved to your recoverable <strong>Event Trash</strong> and hidden from public calendars and DJ profiles. You can restore it or permanently delete it anytime.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/[0.08] transition-colors"
              >
                Keep Event
              </button>
              <button
                type="button"
                id="confirm-delete-btn"
                onClick={confirmDeleteGig}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting && <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />}
                {isDeleting ? 'Moving to Trash...' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
