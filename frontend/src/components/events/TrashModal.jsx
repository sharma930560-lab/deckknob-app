import { useState, useEffect } from 'react';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import { eventService } from '../../services/eventService';
import { useToast } from '../ui/Toast';

export default function TrashModal({ isOpen, onClose, currentUid, onEventRestored, onEventDeleted }) {
  const { showToast } = useToast();
  const [trashedEvents, setTrashedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmPermanentDeleteEvent, setConfirmPermanentDeleteEvent] = useState(null);

  const fetchTrashed = async () => {
    if (!currentUid) return;
    setLoading(true);
    try {
      const data = await eventService.getTrashedEvents(currentUid);
      setTrashedEvents(data);
    } catch (err) {
      console.error('[TrashModal] fetchTrashed error:', err);
      showToast('Could not load trash.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTrashed();
    }
  }, [isOpen, currentUid]);

  const handleRestore = async (ev) => {
    setActionLoadingId(ev.id);
    try {
      await eventService.restoreEvent(ev.id, currentUid);
      showToast(`Restored "${ev.title}" to calendar!`, 'success');
      setTrashedEvents(prev => prev.filter(item => item.id !== ev.id));
      onEventRestored?.(ev);
    } catch (err) {
      showToast(err.message || 'Failed to restore event.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmPermanentDeleteEvent) return;
    const ev = confirmPermanentDeleteEvent;
    setActionLoadingId(ev.id);
    try {
      await eventService.permanentlyDeleteEvent(ev.id, currentUid);
      showToast(`Permanently deleted "${ev.title}".`, 'info');
      setTrashedEvents(prev => prev.filter(item => item.id !== ev.id));
      setConfirmPermanentDeleteEvent(null);
      onEventDeleted?.(ev);
    } catch (err) {
      showToast(err.message || 'Failed to permanently delete event.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="dk-panel relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2.5rem] border border-white/[0.12] bg-[#111111] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗑️</span>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Event Trash</h2>
              <p className="text-xs text-zinc-400">Recover deleted events or delete them permanently</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-zinc-400 hover:bg-white/[0.15] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 animate-pulse">
              Loading trashed events...
            </div>
          ) : trashedEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center">
              <span className="text-3xl block mb-2">✨</span>
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-300">Trash is Empty</p>
              <p className="text-xs text-zinc-500 mt-1">Deleted events will appear here and can be restored.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trashedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/30">
                        Trashed
                      </span>
                      {ev.deletionReason && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ({ev.deletionReason})
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 text-sm font-black text-white truncate">{ev.title}</h3>
                    <p className="text-xs text-zinc-400 truncate">
                      📍 {ev.venue} • Deleted {ev.deletedAt ? new Date(ev.deletedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(ev)}
                      disabled={actionLoadingId === ev.id}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-50"
                    >
                      ↺ Restore
                    </button>
                    <button
                      onClick={() => setConfirmPermanentDeleteEvent(ev)}
                      disabled={actionLoadingId === ev.id}
                      className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Modal for Permanent Delete */}
        {confirmPermanentDeleteEvent && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <div className="dk-panel w-full max-w-md rounded-[2rem] border border-red-500/40 bg-[#161618] p-6 shadow-2xl">
              <div className="flex items-center gap-2 text-red-400">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-base font-black uppercase tracking-wider text-white">Permanently Delete?</h3>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-300">
                Are you sure you want to permanently delete <strong className="text-white">"{confirmPermanentDeleteEvent.title}"</strong>? This will permanently remove the event record from DECKKNOB and cannot be undone.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmPermanentDeleteEvent(null)}
                  disabled={actionLoadingId === confirmPermanentDeleteEvent.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  disabled={actionLoadingId === confirmPermanentDeleteEvent.id}
                  className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoadingId === confirmPermanentDeleteEvent.id ? 'Deleting...' : 'Yes, Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
