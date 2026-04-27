import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';

export default function TodayEvents() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // TODO: Fetch from /api/events/?today=true
    setEvents([
      {
        id: 1,
        title: 'NEON UNDERGROUND',
        username: 'DJ_Neon',
        location_name: 'The Vault, Berlin',
        date_time: new Date().toISOString(),
        description: 'Hard techno all night long. No photos allowed.',
      },
      {
        id: 2,
        title: 'AMBER SUNSET SESSIONS',
        username: 'SunsetGroover',
        location_name: 'Rooftop 42',
        date_time: new Date(new Date().setHours(20, 0, 0, 0)).toISOString(),
        description: 'Deep house and organic vibes.',
      }
    ]);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-black italic text-neon-lime mb-4 tracking-tighter">
          TODAY'S PERFORMANCES
        </h1>
        <p className="text-xl text-gray-400 font-mono">NEONSPACE REAL-TIME EVENT DISCOVERY</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map(event => (
          <div key={event.id} className="neo-container glass-panel p-6 border-l-8 border-neon-pink group hover:-translate-y-1 transition-transform">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-black text-white group-hover:text-neon-pink transition-colors">
                {event.title}
              </h2>
              <div className="bg-neon-lime text-black px-2 py-1 text-xs font-black uppercase">
                TONIGHT
              </div>
            </div>
            
            <div className="space-y-2 mb-6 font-mono text-gray-300">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-neon-lime" />
                <span>{new Date(event.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-neon-lime" />
                <span>{event.location_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neon-pink rounded-full border border-black" />
                <span>By <span className="text-white font-bold">{event.username}</span></span>
              </div>
            </div>

            <p className="text-gray-400 mb-6 line-clamp-2">
              {event.description}
            </p>

            <button className="neo-button w-full bg-black text-white hover:bg-neon-pink hover:text-black transition-all">
              VIEW DETAILS
            </button>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 glass-panel neo-container">
          <Calendar size={64} className="mx-auto text-gray-700 mb-4" />
          <h3 className="text-2xl font-black text-gray-500 italic">NO EVENTS LISTED FOR TODAY</h3>
          <p className="text-gray-600 mt-2">CHECK BACK LATER OR BROWSE UPCOMING</p>
        </div>
      )}
    </div>
  );
}
