import { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import CreateSheet from './CreateSheet';
import IconsaxAnimated from '../icons/IconsaxAnimated';
import useExploreStore from '../../stores/exploreStore';
import useNotificationStore from '../../stores/notificationStore';

export default function AppShell() {
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const { suggested, fetchSuggested } = useExploreStore();
  const { notifications, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    try { fetchSuggested(); } catch {}
    try { fetchNotifications(); } catch {}
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#09090B] text-[#FAFAFA]">
      <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center justify-between border-b border-white/[0.08] bg-[#09090B]/86 px-3 sm:px-4 backdrop-blur-xl lg:hidden">
        <Link to="/feed" className="text-lg sm:text-xl font-black tracking-[-0.08em]">DECKKNOB</Link>
        <Link to="/events/today" className="dk-button h-10 px-3 text-[#DFE104]">
          <IconsaxAnimated name="calendar" size={20} />
        </Link>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        <Sidebar onCreateClick={() => setCreateSheetOpen(true)} />
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
        <aside className="hidden h-screen w-[360px] shrink-0 space-y-6 overflow-y-auto border-l border-white/[0.08] px-6 py-8 xl:block">
          <section className="dk-panel rounded-[2rem] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Scene Radar</p>
              <IconsaxAnimated name="trend" size={18} className="text-[#DFE104]" />
            </div>
            <div className="mt-5 space-y-4">
              {suggested.length === 0 && (
                 <p className="text-zinc-500 text-xs">No suggestions currently.</p>
              )}
              {suggested.slice(0, 5).map((dj) => (
                <Link key={dj.id || dj.username} to={`/profile/${dj.username}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={dj.profile_pic || dj.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} alt={dj.username} className="h-11 w-11 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-bold">{dj.username}</p>
                      <p className="text-xs text-zinc-500">{dj.role || dj.genre || 'DJ'}</p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-[#DFE104]">Follow</button>
                </Link>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Notifications</p>
            {notifications.length === 0 && (
              <p className="text-zinc-500 text-xs mt-2">No recent notifications.</p>
            )}
            {notifications.slice(0, 5).map((item) => (
              <div key={item.id} className={`flex gap-3 rounded-2xl p-3 ${item.is_read ? 'bg-white/[0.02]' : 'bg-white/[0.06]'}`}>
                <IconsaxAnimated name={item.notification_type || 'notification'} size={18} className="mt-0.5 text-[#DFE104]" />
                <div>
                  <p className="text-sm text-zinc-200">{item.message}</p>
                  <p className="text-xs text-zinc-600">
                     {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>

      <BottomNav onCreateClick={() => setCreateSheetOpen(true)} />
      <CreateSheet open={createSheetOpen} onClose={() => setCreateSheetOpen(false)} />
    </div>
  );
}
