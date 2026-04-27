import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Calendar, PlusSquare, User, Zap, Activity } from 'lucide-react';

export default function MainLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'FEED', path: '/feed', icon: Home, color: 'hover:text-neon-lime' },
    { name: 'TODAY', path: '/events/today', icon: Zap, color: 'hover:text-neon-pink' },
    { name: 'EVENTS', path: '/create-event', icon: Calendar, color: 'hover:text-neon-lime' },
    { name: 'POST', path: '/upload', icon: PlusSquare, color: 'hover:text-neon-pink' },
    { name: 'PRO', path: '/profile/me', icon: User, color: 'hover:text-neon-lime' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-base-dark text-white font-sans">
      {/* Left Toolbar / Sidebar */}
      <nav className="w-full lg:w-24 border-b-4 lg:border-b-0 lg:border-r-4 border-black glass-panel flex lg:flex-col items-center py-4 lg:py-8 px-2 space-y-0 lg:space-y-12 space-x-4 lg:space-x-0 overflow-x-auto lg:overflow-x-hidden sticky top-0 z-50 lg:h-screen">
        <div className="hidden lg:block mb-8">
          <div className="w-12 h-12 bg-white flex items-center justify-center font-black italic text-black text-xs border-2 border-black neo-container rotate-3">
            DK
          </div>
        </div>
        
        {navItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path} 
            className={`flex flex-col items-center gap-1 group transition-all ${location.pathname === item.path ? 'text-neon-pink' : 'text-gray-500'} ${item.color}`}
          >
            <item.icon size={28} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black italic tracking-widest">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Center Canvas */}
      <main className="flex-1 p-4 lg:p-12 relative overflow-hidden">
        <div className="scanline"></div>
        {/* Background Grid Pattern */}
        <div className="fixed inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-full lg:w-80 border-t-4 lg:border-t-0 lg:border-l-4 border-black glass-panel p-6 hidden lg:block sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <Activity size={20} className="text-neon-lime" />
          <h3 className="font-heading font-black italic text-neon-lime tracking-tighter text-xl underline decoration-4 underline-offset-4">LIVE UPDATES</h3>
        </div>
        
        <div className="space-y-6">
          <div className="neo-container bg-black/40 p-4 border-black border-2 text-xs font-mono">
            <span className="text-neon-pink font-bold">@DJ_Neon</span> posted a new event in Berlin.
            <div className="text-gray-600 mt-1">2m ago</div>
          </div>
          <div className="neo-container bg-black/40 p-4 border-black border-2 text-xs font-mono">
            <span className="text-neon-lime font-bold">@SynthWave</span> started following you.
            <div className="text-gray-600 mt-1">15m ago</div>
          </div>
          <div className="neo-container bg-black/40 p-4 border-black border-2 text-xs font-mono">
            <span className="text-neon-pink font-bold">@BeatBoxer</span> liked your post.
            <div className="text-gray-400 mt-2 block hover:underline cursor-pointer">"Midnight session..."</div>
            <div className="text-gray-600 mt-1">1h ago</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
