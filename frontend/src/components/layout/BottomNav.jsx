import { Link, useLocation } from 'react-router-dom';
import IconsaxAnimated from '../icons/IconsaxAnimated';

const navItems = [
  { to: '/feed', label: 'Home', icon: 'home' },
  { to: '/explore', label: 'Explore', icon: 'search' },
  { to: '/klyps', label: 'Klyps', icon: 'reel' },
  { to: '/profile/me', label: 'Profile', icon: 'user' },
];

export default function BottomNav({ onCreateClick }) {
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-white/[0.08] bg-[#09090B]/92 px-2 backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {navItems.slice(0, 2).map((item) => (
        <NavItem key={item.to} item={item} active={pathname === item.to} />
      ))}
      <button
        onClick={onCreateClick}
        className="dk-button h-12 w-12 bg-[#DFE104] text-black shadow-[0_0_24px_rgba(223,225,4,0.24)] active:scale-90 transition-transform"
        aria-label="Create"
      >
        <IconsaxAnimated name="add" size={24} />
      </button>
      {navItems.slice(2).map((item) => (
        <NavItem key={item.to} item={item} active={pathname === item.to} />
      ))}
    </nav>
  );
}

function NavItem({ item, active }) {
  return (
    <Link
      to={item.to}
      className={`grid min-h-11 min-w-11 place-items-center rounded-2xl transition-colors active:scale-95 ${
        active ? 'text-[#DFE104]' : 'text-zinc-500'
      }`}
      aria-label={item.label}
    >
      <IconsaxAnimated name={item.icon} size={23} filled={active} />
    </Link>
  );
}

