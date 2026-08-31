import { Link, useLocation } from 'react-router-dom';
import IconsaxAnimated from '../icons/IconsaxAnimated';

const navItems = [
  { to: '/feed', label: 'Home', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'search' },
  { to: '/events', label: 'Events', icon: 'calendar' },
  { to: '/klyps', label: 'Klyps', icon: 'reel' },
  { to: '/profile/me', label: 'Profile', icon: 'user' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function Sidebar({ onCreateClick }) {
  const { pathname } = useLocation();

  return (
    <nav className="hidden lg:flex sticky top-0 h-screen w-24 xl:w-72 shrink-0 flex-col justify-between border-r border-white/[0.08] bg-[#09090B]/80 px-4 py-6 backdrop-blur-xl">
      <div>
        <Link to="/feed" className="mb-10 flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#DFE104] text-sm font-black text-black">DK</span>
          <span className="hidden text-2xl font-black tracking-[-0.08em] text-[#FAFAFA] xl:block">DECKKNOB</span>
        </Link>

        <div className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.to || (item.to === '/events' && pathname.startsWith('/events'));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-300 ${
                  active ? 'bg-[#DFE104] text-black' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                }`}
                aria-label={item.label}
              >
                <IconsaxAnimated name={item.icon} size={24} filled={active} />
                <span className="hidden text-sm font-bold uppercase tracking-[0.12em] xl:block">{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={onCreateClick}
            className="group flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-zinc-400 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
            aria-label="Create"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#DFE104] text-black">
              <IconsaxAnimated name="add" size={20} />
            </span>
            <span className="hidden text-sm font-bold uppercase tracking-[0.12em] xl:block">Create</span>
          </button>
        </div>
      </div>

      <div className="hidden rounded-3xl bg-white/[0.04] p-4 xl:block">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#DFE104]">Tonight</p>
        <p className="mt-2 text-sm text-zinc-300">PULSE INDEX opens at 10:30 PM in Mumbai.</p>
      </div>
    </nav>
  );
}
