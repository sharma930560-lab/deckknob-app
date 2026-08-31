import { useEffect } from 'react';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import useNotificationStore from '../../stores/notificationStore';

export default function NotificationHub({ open, onClose }) {
  const { notifications, unreadCount, fetchNotifications, markAllRead } = useNotificationStore();

  useEffect(() => {
    if (open) {
      fetchNotifications().catch(() => {});
      if (unreadCount > 0) {
        markAllRead();
      }
    }
  }, [open]);

  return (
    <>
      {open && <button className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close notifications" />}
      <aside className={`fixed right-0 top-0 z-50 h-full w-[min(92vw,380px)] bg-[#09090B]/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#DFE104]">Live alerts</p>
            <h2 className="text-2xl font-black tracking-[-0.05em]">Notifications</h2>
          </div>
          <button onClick={onClose} className="dk-button h-10 w-10 bg-white/[0.06]" aria-label="Close">
            <IconsaxAnimated name="close" size={20} />
          </button>
        </div>
        <div className="space-y-2 p-4">
          {notifications.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 mt-10">No new notifications.</p>
          ) : (
            notifications.map((item) => (
              <div key={item.id} className={`flex gap-3 rounded-3xl p-4 ${item.is_read ? 'bg-white/[0.02]' : 'bg-white/[0.06]'}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#DFE104]/10 text-[#DFE104]">
                  <IconsaxAnimated name={item.notification_type || 'notification'} size={20} />
                </span>
                <div>
                  <p className="text-sm text-zinc-200">{item.message}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
