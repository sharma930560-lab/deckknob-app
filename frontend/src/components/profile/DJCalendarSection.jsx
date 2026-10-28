import { useState, useEffect } from 'react';
import { djCalendarService } from '../../services/djCalendarService';
import { userService } from '../../services/userService';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import { useToast } from '../ui/Toast';

export default function DJCalendarSection({ profileUser, currentUser, isOwnProfile, isFollowing, onFollowToggle, upcomingGigs = [] }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState({ status: 'loading', entries: [], privacy: 'private' });
  const [privacySettings, setPrivacySettings] = useState({ privacy: 'private' });
  
  // UI states
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingEntryId, setDeletingEntryId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formVenue, setFormVenue] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formEntryType, setFormEntryType] = useState('gig');
  const [formNotes, setFormNotes] = useState('');
  const [formVisibility, setFormVisibility] = useState('followers');
  const [formLinkedEventId, setFormLinkedEventId] = useState('');

  const djUid = profileUser?.uid || profileUser?.id;
  const viewerUid = currentUser?.uid || currentUser?.id;

  const loadCalendar = async () => {
    if (!djUid) return;
    setLoading(true);
    try {
      const data = await djCalendarService.getCalendarEntries(djUid, viewerUid, isFollowing);
      setCalendarData(data);
      const settings = await djCalendarService.getCalendarSettings(djUid);
      setPrivacySettings(settings);
    } catch (e) {
      console.error(e);
      showToast('Error loading DJ calendar', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [djUid, viewerUid, isFollowing]);

  const handleOpenAddModal = () => {
    setEditingEntry(null);
    setFormTitle('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStartTime('22:00');
    setFormEndTime('04:00');
    setFormVenue('');
    setFormCity(profileUser?.city || '');
    setFormEntryType('gig');
    setFormNotes('');
    setFormVisibility('followers');
    setFormLinkedEventId('');
    setIsEntryModalOpen(true);
  };

  const handleOpenEditModal = (entry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title || '');
    setFormDate(entry.date || '');
    setFormStartTime(entry.startTime || '');
    setFormEndTime(entry.endTime || '');
    setFormVenue(entry.venue || '');
    setFormCity(entry.city || '');
    setFormEntryType(entry.entryType || 'gig');
    setFormNotes(entry.notes || '');
    setFormVisibility(entry.visibility || 'followers');
    setFormLinkedEventId(entry.linkedEventId || '');
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDate) {
      showToast('Title and Date are required', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: formTitle,
        date: formDate,
        startTime: formStartTime,
        endTime: formEndTime,
        venue: formVenue,
        city: formCity,
        entryType: formEntryType,
        notes: formNotes,
        visibility: formVisibility,
        linkedEventId: formLinkedEventId || null
      };

      if (editingEntry) {
        await djCalendarService.updateCalendarEntry(djUid, editingEntry.id, payload, viewerUid);
        showToast('Calendar entry updated!', 'success');
      } else {
        await djCalendarService.addCalendarEntry(djUid, payload, viewerUid);
        showToast('Calendar entry added!', 'success');
      }
      setIsEntryModalOpen(false);
      await loadCalendar();
    } catch (err) {
      showToast(err.message || 'Error saving entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    setSaving(true);
    try {
      await djCalendarService.deleteCalendarEntry(djUid, entryId, viewerUid);
      showToast('Entry deleted from calendar', 'success');
      setDeletingEntryId(null);
      await loadCalendar();
    } catch (err) {
      showToast('Failed to delete entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrivacy = async (newPrivacy) => {
    setSaving(true);
    try {
      await djCalendarService.updateCalendarSettings(djUid, { privacy: newPrivacy }, viewerUid);
      setPrivacySettings((prev) => ({ ...prev, privacy: newPrivacy }));
      showToast(`Calendar privacy set to: ${newPrivacy === 'private' ? 'Only Me' : newPrivacy === 'followers' ? 'Followers Only' : 'Public'}`, 'success');
      setIsPrivacyModalOpen(false);
      await loadCalendar();
    } catch (err) {
      showToast('Failed to update privacy', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-zinc-500 animate-pulse">
        Checking calendar authorization...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#DFE104]">DJ Calendar</span>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              privacySettings.privacy === 'private'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : privacySettings.privacy === 'followers'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {privacySettings.privacy === 'private' ? '🔒 Only Me' : privacySettings.privacy === 'followers' ? '👥 Followers Only' : '🌐 Public'}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {isOwnProfile
              ? 'Manage your confirmed gigs, tentative bookings, and personal schedule.'
              : `Tour dates & gig schedule for @${profileUser?.username}.`}
          </p>
        </div>

        {isOwnProfile && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-zinc-200 hover:border-white/40 hover:text-white"
            >
              <IconsaxAnimated name="security" size={16} />
              <span>Privacy</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 rounded-xl bg-[#DFE104] px-4 py-2 text-xs font-black text-black hover:bg-[#c9cb04]"
            >
              <IconsaxAnimated name="add" size={16} />
              <span>+ Add Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* Access Denied: Private */}
      {calendarData.status === 'restricted' && calendarData.reason === 'private' && (
        <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-10 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white/[0.04] text-zinc-400">
            <IconsaxAnimated name="lock" size={28} />
          </div>
          <h3 className="text-base font-bold text-zinc-200">Personal Calendar Is Private</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-zinc-500">
            @{profileUser?.username} has kept their personal calendar confidential. Only confirmed public events are visible.
          </p>
        </div>
      )}

      {/* Access Denied: Followers Only */}
      {calendarData.status === 'restricted' && calendarData.reason === 'followers_only' && (
        <div className="rounded-2xl border border-[#DFE104]/20 bg-gradient-to-b from-[#DFE104]/5 to-transparent p-10 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#DFE104]/10 text-[#DFE104]">
            <IconsaxAnimated name="user" size={28} />
          </div>
          <h3 className="text-base font-bold text-white">Followers-Only DJ Schedule</h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-zinc-400">
            @{profileUser?.username} only shares their tour dates, tentative bookings, and personal schedule with active followers.
          </p>
          <div className="mt-5">
            <button
              onClick={onFollowToggle}
              className="rounded-full bg-[#DFE104] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-transform hover:scale-105 active:scale-95"
            >
              Follow @{profileUser?.username} to Unlock
            </button>
          </div>
        </div>
      )}

      {/* Authorized Entries List */}
      {calendarData.status === 'authorized' && (
        <div>
          {calendarData.entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <p className="text-3xl mb-2">📅</p>
              <h4 className="text-sm font-bold text-zinc-300">No scheduled entries yet</h4>
              <p className="mt-1 text-xs text-zinc-500">
                {isOwnProfile
                  ? 'Click "+ Add Entry" to record your upcoming gigs, holds, or studio sessions.'
                  : `@${profileUser?.username} has no scheduled dates on their calendar.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {calendarData.entries.map((entry) => {
                const isGig = entry.entryType === 'gig';
                const isTentative = entry.entryType === 'tentative';
                const isPersonal = entry.entryType === 'personal';

                return (
                  <div
                    key={entry.id}
                    className="group relative flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E0E11] p-4 transition-all hover:border-white/20 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Date Badge */}
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.04] text-center border border-white/[0.06]">
                        <span className="text-[10px] font-bold uppercase text-[#DFE104]">
                          {entry.date ? new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short' }) : 'TBD'}
                        </span>
                        <span className="text-lg font-black text-white leading-none">
                          {entry.date ? new Date(entry.date + 'T00:00:00').getDate() : '--'}
                        </span>
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-white">{entry.title}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              isGig
                                ? 'bg-[#DFE104] text-black'
                                : isTentative
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {isGig ? 'Confirmed Gig' : isTentative ? 'Tentative Hold' : 'Personal Schedule'}
                          </span>

                          {isOwnProfile && (
                            <span className="text-[9px] font-bold text-zinc-500">
                              [{entry.visibility || 'private'}]
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-zinc-400">
                          {entry.venue && <span className="text-zinc-200 font-bold">{entry.venue}</span>}
                          {entry.city && <span> • {entry.city}</span>}
                          {(entry.startTime || entry.endTime) && (
                            <span className="text-zinc-500"> ({entry.startTime || ''}{entry.endTime ? ` - ${entry.endTime}` : ''})</span>
                          )}
                        </p>

                        {/* Private notes: visible ONLY to owner */}
                        {isOwnProfile && entry.notes && (
                          <div className="mt-2 rounded-lg bg-black/40 border border-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-400">
                            <span className="font-bold text-zinc-500">Private Note: </span>
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Owner Action Buttons */}
                    {isOwnProfile && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleOpenEditModal(entry)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-400 hover:text-white hover:border-white/30"
                          title="Edit Entry"
                        >
                          <IconsaxAnimated name="edit" size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingEntryId(entry.id)}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                          title="Delete Entry"
                        >
                          <IconsaxAnimated name="trash" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Privacy Settings Modal */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#0E0E11] p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white">DJ Calendar Privacy</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Control who can see your personal DJ calendar and schedule.
            </p>

            <div className="mt-5 space-y-3">
              {[
                {
                  id: 'private',
                  title: 'Private — Only Me (Default)',
                  desc: 'Only you can view your calendar. Gigs, holds and notes are completely hidden from all other users.',
                  badge: '🔒 Maximum Privacy'
                },
                {
                  id: 'followers',
                  title: 'Followers Only',
                  desc: 'Only users who actively follow your profile can view your tour dates and schedule. Non-followers cannot see your entries.',
                  badge: '👥 Fans & Industry'
                },
                {
                  id: 'public',
                  title: 'Public Calendar (Opt-in)',
                  desc: 'Anyone on DECKKNOB can view your non-private calendar dates. Private notes always remain hidden.',
                  badge: '🌐 Open Tour'
                }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleUpdatePrivacy(opt.id)}
                  disabled={saving}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    privacySettings.privacy === opt.id
                      ? 'border-[#DFE104] bg-[#DFE104]/10 text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black">{opt.title}</span>
                    <span className="text-[10px] font-bold text-[#DFE104]">{opt.badge}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsPrivacyModalOpen(false)}
                className="rounded-xl border border-white/20 px-5 py-2 text-xs font-bold text-zinc-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#0E0E11] p-6 shadow-2xl my-8">
            <h3 className="text-lg font-black text-white">
              {editingEntry ? 'Edit Calendar Entry' : 'New Calendar Entry'}
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Record a gig, booking hold, or personal rehearsal slot.
            </p>

            <form onSubmit={handleSaveEntry} className="mt-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Event / Gig Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Berghain Klubnacht / Studio Live Session"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                />
              </div>

              {/* Entry Type */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Entry Type</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {[
                    { id: 'gig', label: 'Gig' },
                    { id: 'tentative', label: 'Hold / Tentative' },
                    { id: 'personal', label: 'Personal' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormEntryType(t.id)}
                      className={`rounded-xl border py-2 text-xs font-black uppercase transition-all ${
                        formEntryType === t.id
                          ? 'border-[#DFE104] bg-[#DFE104] text-black'
                          : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Date *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Start Time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">End Time</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                  />
                </div>
              </div>

              {/* Venue & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Venue / Club</label>
                  <input
                    type="text"
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    placeholder="e.g. Tresor, Berlin"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Berlin, Germany"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                  />
                </div>
              </div>

              {/* Entry Visibility */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Entry Visibility
                  <span className="text-[10px] text-zinc-500 font-normal ml-2">(Bounded by calendar privacy)</span>
                </label>
                <select
                  value={formVisibility}
                  onChange={(e) => setFormVisibility(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                >
                  <option value="private">🔒 Private (Only Me)</option>
                  <option value="followers">👥 Followers (Visible to followers)</option>
                  <option value="public">🌐 Public (Visible on calendar)</option>
                </select>
              </div>

              {/* Link to existing Public Event */}
              {upcomingGigs.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Link Public Event (Optional)</label>
                  <select
                    value={formLinkedEventId}
                    onChange={(e) => setFormLinkedEventId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                  >
                    <option value="">None (Personal entry only)</option>
                    {upcomingGigs.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.venue || 'Venue TBD'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Private Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Private Notes
                  <span className="text-[10px] text-emerald-400 font-bold ml-2">✓ Strictly Confidential</span>
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Hospitality rider, soundcheck time, promoter contact, booking fee notes..."
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-white focus:border-[#DFE104] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#DFE104] px-5 py-2 text-xs font-black text-black hover:bg-[#c9cb04]"
                >
                  {saving ? 'Saving...' : editingEntry ? 'Save Changes' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-[#0E0E11] p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-500/10 text-red-400">
              <IconsaxAnimated name="trash" size={24} />
            </div>
            <h3 className="text-base font-black text-white">Delete Calendar Entry?</h3>
            <p className="mt-2 text-xs text-zinc-400">
              This entry will be removed from your personal schedule. Any separately published public event will NOT be deleted.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingEntryId(null)}
                className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEntry(deletingEntryId)}
                disabled={saving}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black text-white hover:bg-red-700"
              >
                {saving ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

