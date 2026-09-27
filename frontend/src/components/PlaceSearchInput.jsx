// client/src/components/PlaceSearchInput.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X, Compass, Navigation, CheckCircle2 } from 'lucide-react';
import { searchPlacesOSM, reverseGeocodeCoords } from '../services/api';
import { POPULAR_INDIAN_PLACES } from '../data/indianPlaces';

/**
 * PlaceSearchInput - Intelligent Indian Location Resolution
 * 1. GPS Auto-Detect: Uses browser GPS + OpenStreetMap reverse geocoding to resolve the citizen's exact village/town.
 * 2. Instant Local Search: Zero-lag autocomplete from comprehensive Indian district/tehsil database.
 * 3. Live OpenStreetMap Search: Nationwide Nominatim search querying ANY Indian village, hamlet, or ward.
 */
export default function PlaceSearchInput({
  value,
  onChange,
  onSelectCoords,
  placeholder = 'Search ANY village, town, taluk, or city in India...',
  className = '',
  label = 'Location',
  showLabel = true,
  badgeText = 'GPS & OSM Live',
  allowGPS = true,
}) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectingGPS, setDetectingGPS] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // GPS Auto-Detection Handler
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS geolocation not supported by this browser.');
      setTimeout(() => setGpsError(''), 4000);
      return;
    }

    setDetectingGPS(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await reverseGeocodeCoords(latitude, longitude);
          const resolvedName = res.data?.displayName || res.data?.name || `GPS Location (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)`;
          
          setSearchTerm(resolvedName);
          setIsGpsActive(true);
          setIsOpen(false);

          if (onChange) onChange(resolvedName);
          if (onSelectCoords) {
            onSelectCoords({
              lat: latitude,
              lon: longitude,
              name: resolvedName,
              isGPS: true,
            });
          }
        } catch {
          const fallback = `GPS Location (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`;
          setSearchTerm(fallback);
          setIsGpsActive(true);
          setIsOpen(false);
          if (onChange) onChange(fallback);
          if (onSelectCoords) {
            onSelectCoords({
              lat: latitude,
              lon: longitude,
              name: fallback,
              isGPS: true,
            });
          }
        } finally {
          setDetectingGPS(false);
        }
      },
      (err) => {
        setDetectingGPS(false);
        setGpsError(err.code === 1 ? 'Location permission denied. Please allow GPS access or search manually.' : 'GPS timeout. Please search manually.');
        setTimeout(() => setGpsError(''), 5000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Hybrid Search: Instant local places + debounced OpenStreetMap Nominatim
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (searchTerm === value && isGpsActive) return;

    // 1. Instant local match
    const qLower = searchTerm.toLowerCase().trim();
    const localMatches = POPULAR_INDIAN_PLACES
      .filter((p) => p.toLowerCase().includes(qLower))
      .slice(0, 5)
      .map((p, idx) => ({
        id: `local_${idx}`,
        name: p.split(',')[0],
        displayName: p,
        type: 'district_place',
        isLocal: true,
      }));

    setSuggestions(localMatches);
    if (localMatches.length > 0) setIsOpen(true);

    // 2. Debounced nationwide OpenStreetMap live search
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPlacesOSM(searchTerm);
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          // Merge local + OSM results
          const osmItems = res.data;
          setSuggestions([...localMatches, ...osmItems]);
          setIsOpen(true);
        }
      } catch (err) {
        console.warn('OSM search error:', err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, value]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (place) => {
    const locName = place.displayName || place.name;
    setSearchTerm(locName);
    setIsGpsActive(false);
    setIsOpen(false);
    if (onChange) onChange(locName);
    if (onSelectCoords) {
      onSelectCoords({
        lat: place.lat || null,
        lon: place.lon || null,
        name: locName,
        isGPS: false,
      });
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsGpsActive(false);
    setSuggestions([]);
    if (onChange) onChange('');
    if (onSelectCoords) onSelectCoords(null);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            {label}
          </label>
          <div className="flex items-center gap-1.5">
            {isGpsActive && (
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> GPS Locked
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-stone-300 dark:border-slate-700">
              {badgeText}
            </span>
          </div>
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsGpsActive(false);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-slate-950 border border-stone-300 dark:border-slate-700 rounded-xl pl-9 pr-24 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 shadow-sm"
        />

        <div className="absolute left-3 text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          ) : (
            <Search className="w-4 h-4 text-slate-500" />
          )}
        </div>

        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {allowGPS && (
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={detectingGPS}
              title="Auto-Detect My Current GPS Location"
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                isGpsActive
                  ? 'btn-3d btn-3d-emerald text-white'
                  : 'btn-3d btn-3d-surface text-orange-600 dark:text-orange-400'
              }`}
            >
              {detectingGPS ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
              ) : (
                <Navigation className={`w-3.5 h-3.5 ${isGpsActive ? 'text-white fill-white' : 'text-orange-600'}`} />
              )}
              <span>{detectingGPS ? 'Detecting...' : isGpsActive ? 'GPS Active' : 'Auto GPS'}</span>
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
          ⚠️ {gpsError}
        </p>
      )}

      {/* Suggestion Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          <div className="p-2 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-stone-100 dark:bg-slate-950/80 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
            <span>Matching Indian Places ({suggestions.length})</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono">OpenStreetMap + Database</span>
          </div>

          {/* Quick GPS option at top of dropdown */}
          {allowGPS && (
            <button
              type="button"
              onClick={handleDetectGPS}
              className="w-full text-left px-3.5 py-2 bg-orange-50/60 dark:bg-orange-950/30 hover:bg-orange-100/80 border-b border-orange-200 dark:border-orange-900/40 flex items-center gap-2 text-xs font-bold text-orange-800 dark:text-orange-300 transition-colors cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Use My Current Device Location (Auto GPS)</span>
            </button>
          )}

          <div className="divide-y divide-stone-100 dark:divide-slate-800">
            {suggestions.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-orange-50 dark:hover:bg-slate-800 flex items-start gap-2.5 transition-colors cursor-pointer"
              >
                <Compass className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                    {item.displayName}
                  </p>
                  {item.lat && item.lon ? (
                    <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                      GPS: {Number(item.lat).toFixed(3)}°N, {Number(item.lon).toFixed(3)}°E • {item.type}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                      District / Region Hub
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
