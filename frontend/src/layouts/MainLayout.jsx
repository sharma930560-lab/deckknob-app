import { Outlet, Link } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-base-dark text-white">
      {/* Left Toolbar / Sidebar */}
      <nav className="w-full lg:w-24 border-b lg:border-b-0 lg:border-r-4 border-black glass-panel flex lg:flex-col items-center py-4 px-2 space-y-0 lg:space-y-8 space-x-8 lg:space-x-0 overflow-x-auto lg:overflow-x-hidden">
        <Link to="/feed" className="font-heading font-black italic hover:text-neon-lime transition-colors">FEED</Link>
        <Link to="/events" className="font-heading font-black italic hover:text-neon-pink transition-colors">EVENTS</Link>
        <Link to="/upload" className="font-heading font-black italic hover:text-neon-lime transition-colors">POST</Link>
        <Link to="/profile/me" className="font-heading font-black italic hover:text-neon-pink transition-colors mt-auto">PRO</Link>
      </nav>

      {/* Center Canvas */}
      <main className="flex-1 p-4 lg:p-8 relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l-4 border-black glass-panel p-4 hidden lg:block">
        <h3 className="font-heading font-black italic text-neon-lime mb-4">ACTIVITY</h3>
        <p className="text-sm text-gray-400">Activity feed coming soon...</p>
      </aside>
    </div>
  );
}
