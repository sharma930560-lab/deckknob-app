import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import IconsaxAnimated from '../components/icons/IconsaxAnimated';
import KineticMarquee from '../components/ui/KineticMarquee';
import useExploreStore from '../stores/exploreStore';
import { locationService } from '../services/locationService';

const tags = ['techno', 'goa', 'warehouse', 'hardgroove', 'afrohouse', 'afterhours', 'vinyl', 'festival'];

export default function Explore() {
  const [query, setQuery] = useState('');
  const { trending, suggested, searchResults, isLoading, fetchTrending, fetchSuggested, search } = useExploreStore();
  const [matchingVenues, setMatchingVenues] = useState([]);
  const [trendingVenues, setTrendingVenues] = useState([]);

  // Load trending venues once
  useEffect(() => {
    fetchTrending();
    fetchSuggested();
    // Default search for venues returns MOCK preseeded list
    locationService.searchLocations('omnia').then((res) => {
      setTrendingVenues([
        { id: 'venue_omnia', name: 'OMNIA Nightclub', city: 'Mumbai', category: 'Nightclub / Lounge', image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=300&q=80', rating: 4.8 },
        { id: 'venue_pulse', name: 'PULSE INDEX', city: 'Mumbai', category: 'Underground Club', image: 'https://images.unsplash.com/photo-1545128485-c400e7702796?auto=format&fit=crop&w=300&q=80', rating: 4.9 }
      ]);
    });
  }, [fetchTrending, fetchSuggested]);

  // Search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        search(query);
        // Search matching venues
        locationService.searchLocations(query).then((res) => {
          // Map predicted search results to simulated items if matching local DB
          const mapped = res.map(item => ({
            id: item.id,
            name: item.name,
            address: item.address,
            category: 'Club / Lounge'
          }));
          setMatchingVenues(mapped);
        });
      } else {
        setMatchingVenues([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Build explore tiles from trending data
  const exploreTiles = useMemo(() => {
    const tiles = [];
    (trending.posts || []).forEach(post => {
      tiles.push({ id: `post-${post.id}`, image: post.media_url || post.mediaUrl, label: post.user?.username || '', isReel: false });
    });
    (trending.reels || []).forEach(reel => {
      tiles.push({ id: `reel-${reel.id}`, image: reel.poster || reel.media_url || reel.mediaUrl, label: reel.user?.username || '', isReel: true });
    });
    return tiles;
  }, [trending]);

  const filtered = useMemo(() => {
    if (!query) return exploreTiles;
    return exploreTiles.filter((tile) => tile.label.toLowerCase().includes(query.toLowerCase()));
  }, [query, exploreTiles]);

  const showSearchSection = query.length >= 2;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 space-y-8">
      {/* Title */}
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#DFE104]">Explore the scene</p>
        <h1 className="mt-2 text-5xl font-black uppercase tracking-tight sm:text-6xl lg:text-7xl">Find the frequency</h1>
      </section>

      {/* Search Input Bar */}
      <div className="dk-panel flex items-center gap-3 rounded-full px-4 py-3 bg-white/[0.03] border border-white/[0.08]">
        <IconsaxAnimated name="search" size={22} className="text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search DJs, clubs, event venues, tags..."
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
        />
      </div>

      <div className="overflow-hidden rounded-full border-y border-white/[0.1] py-2 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
        <KineticMarquee speed="30s">{tags.map((tag) => `#${tag} / `).join('')}</KineticMarquee>
      </div>

      {/* Search results mapping */}
      {showSearchSection && (
        <section className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Search Results</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* DJs/Users */}
            {(searchResults.users || []).map(user => (
              <Link key={user.id || user.username} to={`/profile/${user.username}`} className="flex items-center gap-3 dk-panel rounded-2xl p-3 bg-white/[0.02]">
                <img src={user.profile_pic || `https://ui-avatars.com/api/?name=${user.username}&background=DFE104&color=000&bold=true`} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">{user.username}</p>
                  <p className="text-xs text-zinc-500 uppercase">{user.role || 'DJ'}</p>
                </div>
              </Link>
            ))}

            {/* Matching Venues/Clubs */}
            {matchingVenues.map(ven => (
              <Link key={ven.id} to={`/venues/${ven.id}`} className="flex items-center gap-3 dk-panel rounded-2xl p-3 bg-white/[0.02] border border-[#DFE104]/10">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#DFE104]/10 text-[#DFE104]">
                  <IconsaxAnimated name="location" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate uppercase tracking-wider">{ven.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{ven.address}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Suggested DJs */}
      {!query && suggested.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Suggested DJs</p>
          <div className="no-scrollbar flex gap-3 overflow-x-auto">
            {suggested.map((dj) => (
              <Link key={dj.id || dj.username} to={`/profile/${dj.username}`} className="dk-panel w-44 shrink-0 rounded-3xl p-4 bg-white/[0.02] border border-white/[0.08]">
                <img src={dj.profile_pic || dj.avatar || `https://ui-avatars.com/api/?name=${dj.username}&background=DFE104&color=000&bold=true`} alt="" className="h-16 w-16 rounded-full object-cover" />
                <p className="mt-3 truncate font-bold text-white uppercase tracking-wide text-sm">{dj.username}</p>
                <p className="text-xs text-zinc-500">{dj.role || dj.genre || 'DJ'}</p>
                <button className="dk-button mt-4 h-9 w-full bg-[#DFE104] text-xs font-black uppercase tracking-wider text-black">Follow</button>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trending Venues & Club Directory */}
      {!query && trendingVenues.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Trending Clubs & Venues</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {trendingVenues.map((ven) => (
              <Link key={ven.id} to={`/venues/${ven.id}`} className="group relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-zinc-950 p-4 flex gap-4 transition-all hover:bg-white/[0.03]">
                <img src={ven.image} alt={ven.name} className="h-20 w-20 rounded-2xl object-cover" />
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#DFE104] bg-[#DFE104]/10 px-2 py-0.5 rounded-full">
                    {ven.category}
                  </span>
                  <h3 className="font-black text-white text-base truncate uppercase tracking-wider mt-1">{ven.name}</h3>
                  <p className="text-xs text-zinc-500 truncate">{ven.city}</p>
                  <p className="text-xs text-[#DFE104] font-black">★ {ven.rating}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {suggested.length === 0 && exploreTiles.length === 0 && !isLoading && (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase">Nothing to explore yet.</p>
        </div>
      )}

      {/* Explore Grid */}
      {filtered.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Featured Media</p>
          <div className="grid grid-cols-3 gap-1">
            {filtered.slice(0, 15).map((tile, index) => (
              <div key={`${tile.id}-${index}`} className={`group relative overflow-hidden ${index % 9 === 0 ? 'col-span-2 row-span-2' : ''}`}>
                <img src={tile.image} alt="" className="aspect-square h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/45" />
                {tile.isReel && (
                  <IconsaxAnimated name="reel" size={22} className="absolute right-3 top-3 text-white" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
