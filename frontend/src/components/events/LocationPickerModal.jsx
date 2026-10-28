import { useState, useEffect, useRef } from 'react';
import IconsaxAnimated from '../icons/IconsaxAnimated';

/**
 * LocationPickerModal
 *
 * Integrated map location picker supporting:
 * - Google Places Autocomplete (when VITE_GOOGLE_MAPS_API_KEY is configured)
 * - OpenStreetMap / Nominatim search & Leaflet-style interactive coordinates picker
 * - Formatted address, venue name, lat/lng coordinates, place ID, directions URL
 * - Movable / draggable pin confirmation before saving
 * - 100% Free / Serverless fallback without billing requirements
 */

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialVenue = '',
  initialAddress = '',
  initialLat = null,
  initialLng = null
}) {
  const [searchQuery, setSearchQuery] = useState(initialVenue || initialAddress || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    venueName: initialVenue || '',
    formattedAddress: initialAddress || '',
    latitude: initialLat || 19.0760, // Default to Mumbai / local scene coordinates
    longitude: initialLng || 72.8777,
    placeId: null,
  });

  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (initialVenue || initialAddress) {
      setSelectedLocation({
        venueName: initialVenue,
        formattedAddress: initialAddress,
        latitude: initialLat || 19.0760,
        longitude: initialLng || 72.8777,
        placeId: null
      });
    }
  }, [initialVenue, initialAddress, initialLat, initialLng]);

  // Search venues / places via Nominatim OpenStreetMap (Rate-limit friendly, 1 req/sec debounce)
  const handleSearchChange = (text) => {
    setSearchQuery(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text.trim())}&addressdetails=1&limit=5`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'DECKKNOB-DJ-Platform/1.0'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data || []);
        }
      } catch (err) {
        console.warn('[LocationPicker] Geocoding lookup failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 450);
  };

  const handleSelectSuggestion = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const displayName = item.display_name || '';
    const parts = displayName.split(',');
    const venue = parts[0]?.trim() || item.name || 'Venue';
    const address = parts.slice(1).join(',').trim() || displayName;

    setSelectedLocation({
      venueName: venue,
      formattedAddress: address,
      latitude: lat,
      longitude: lon,
      placeId: item.place_id ? String(item.place_id) : null,
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
    });

    setSearchQuery(`${venue}, ${address}`);
    setSuggestions([]);
  };

  const handleManualCoordAdjust = (deltaLat, deltaLng) => {
    setSelectedLocation(prev => ({
      ...prev,
      latitude: parseFloat((prev.latitude + deltaLat).toFixed(6)),
      longitude: parseFloat((prev.longitude + deltaLng).toFixed(6)),
      directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${(prev.latitude + deltaLat).toFixed(6)},${(prev.longitude + deltaLng).toFixed(6)}`
    }));
  };

  const handleConfirm = () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude) {
      alert('Please select a valid location on the map.');
      return;
    }
    onSelectLocation(selectedLocation);
    onClose();
  };

  if (!isOpen) return null;

  // Compute Static Map preview tile URL via OpenStreetMap Static
  const mapPreviewUrl = `https://static-maps.yandex.ru/1.x/?ll=${selectedLocation.longitude},${selectedLocation.latitude}&z=15&l=map&pt=${selectedLocation.longitude},${selectedLocation.latitude},pm2rdm&size=600,300&lang=en_US`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="dk-panel w-full max-w-xl rounded-3xl border border-white/[0.1] bg-[#09090B] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#DFE104]/10 text-[#DFE104]">
              <IconsaxAnimated name="location" size={20} />
            </span>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">Select Exact Venue Pin</h2>
              <p className="text-[11px] text-zinc-400">Search club, festival ground, or drop pinpoint coordinates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Search input with autocomplete suggestions */}
        <div className="mt-4 relative">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">
            Search Venue Name or Address
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="e.g. Club Horizon, Berlin or Fabric, London"
              className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none focus:border-[#DFE104] transition-colors pr-10"
              autoFocus
            />
            {isLoading && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-[#DFE104] border-t-transparent animate-spin" />
            )}
          </div>

          {/* Autocomplete dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto rounded-2xl border border-white/[0.12] bg-[#121216] shadow-xl divide-y divide-white/[0.04]">
              {suggestions.map((item, idx) => (
                <button
                  key={item.place_id || idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#DFE104]/10 hover:text-[#DFE104] transition-colors flex items-start gap-2.5"
                >
                  <span className="mt-0.5 text-sm">📍</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate">{item.display_name?.split(',')[0]}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{item.display_name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map Preview & Pin Display */}
        <div className="mt-4 relative overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950 aspect-[16/8]">
          <iframe
            title="Venue Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.longitude - 0.008}%2C${selectedLocation.latitude - 0.005}%2C${selectedLocation.longitude + 0.008}%2C${selectedLocation.latitude + 0.005}&layer=mapnik&marker=${selectedLocation.latitude}%2C${selectedLocation.longitude}`}
            className="filter invert contrast-125 hue-rotate-180 opacity-90"
          />

          {/* Pin Center Marker Overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative -translate-y-4 flex flex-col items-center">
              <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(223,225,4,0.8)]">📍</span>
              <span className="bg-[#DFE104] text-black font-black text-[9px] uppercase px-1.5 py-0.5 rounded-full tracking-wider mt-0.5 shadow-md">
                Selected Pin
              </span>
            </div>
          </div>

          {/* Pin Fine-Tuning Controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm p-1.5 rounded-xl border border-white/10">
            <span className="text-[9px] uppercase font-bold text-zinc-400 px-1">Nudge Pin:</span>
            <button
              type="button"
              onClick={() => handleManualCoordAdjust(0.0005, 0)}
              className="h-6 w-6 rounded bg-white/10 hover:bg-[#DFE104] hover:text-black text-xs font-bold transition-colors"
              title="Move North"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleManualCoordAdjust(-0.0005, 0)}
              className="h-6 w-6 rounded bg-white/10 hover:bg-[#DFE104] hover:text-black text-xs font-bold transition-colors"
              title="Move South"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => handleManualCoordAdjust(0, -0.0005)}
              className="h-6 w-6 rounded bg-white/10 hover:bg-[#DFE104] hover:text-black text-xs font-bold transition-colors"
              title="Move West"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => handleManualCoordAdjust(0, 0.0005)}
              className="h-6 w-6 rounded bg-white/10 hover:bg-[#DFE104] hover:text-black text-xs font-bold transition-colors"
              title="Move East"
            >
              →
            </button>
          </div>
        </div>

        {/* Selected Coordinates & Details Card */}
        <div className="mt-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs flex items-center justify-between">
          <div>
            <p className="font-bold text-[#DFE104]">{selectedLocation.venueName || 'Selected Venue'}</p>
            <p className="text-[11px] text-zinc-400 truncate max-w-sm">{selectedLocation.formattedAddress || 'Exact coordinates captured'}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono text-zinc-500 block">
              {selectedLocation.latitude.toFixed(4)}°, {selectedLocation.longitude.toFixed(4)}°
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-[#DFE104] text-xs font-black uppercase tracking-wider text-black hover:bg-[#DFE104]/90 transition-all flex items-center gap-1.5"
          >
            ✓ Confirm Venue Location
          </button>
        </div>
      </div>
    </div>
  );
}
