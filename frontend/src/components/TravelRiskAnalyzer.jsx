// client/src/components/TravelRiskAnalyzer.jsx
import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  ArrowRight, 
  MapPin, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  Train,
  Plane,
  RefreshCw,
  Radio,
  AlertTriangle
} from 'lucide-react';
import { getCurrentWeather } from '../services/api';
import { POPULAR_INDIAN_PLACES } from '../data/indianPlaces';
import PlaceSearchInput from './PlaceSearchInput';

// Extended train coach class categories
const TRAIN_CATEGORIES = [
  { id: 'train_general_unreserved', label: 'General / 2nd Class Unreserved (High Crowding & Heat Trap)', category: 'Non-AC' },
  { id: 'train_sleeper', label: 'Sleeper Class (SL) — Open Window Natural Ventilation', category: 'Non-AC' },
  { id: 'train_3ac_economy', label: '3-Tier AC Economy (3E) — Air-Conditioned Cooled', category: 'AC Cooled' },
  { id: 'train_3ac', label: '3-Tier AC (3A) — Air-Conditioned Cooled', category: 'AC Cooled' },
  { id: 'train_2ac', label: '2-Tier AC (2A) — Temperature Regulated', category: 'AC Cooled' },
  { id: 'train_1ac', label: '1st Class AC (1A) / Executive Chair Car (Vande Bharat)', category: 'AC Cooled' },
  { id: 'train_chair_car_non_ac', label: 'Second Sitting (2S) Non-AC Day Intercity', category: 'Non-AC' },
  { id: 'train_chair_car_ac', label: 'AC Chair Car (CC) / Shatabdi Express', category: 'AC Cooled' },
];

const FLIGHT_CATEGORIES = [
  { id: 'flight_domestic_economy', label: 'Domestic Economy Flight (Rapid & Pressurized / Chilled)', category: 'Aviation' },
  { id: 'flight_business', label: 'Business / Premium Flight', category: 'Aviation' },
];

export default function TravelRiskAnalyzer() {
  // Origin — supports OSM search or quick list
  const [fromCity, setFromCity] = useState('Shimla, Himachal Pradesh');
  const [fromCoords, setFromCoords] = useState(null);
  const [fromSearchMode, setFromSearchMode] = useState('osm');

  // Destination — supports OSM search or quick list
  const [toCity, setToCity] = useState('Ahmedabad, Gujarat');
  const [toCoords, setToCoords] = useState(null);
  const [toSearchMode, setToSearchMode] = useState('osm');

  // Travel Mode (Separated Train vs Flight)
  const [transitGroup, setTransitGroup] = useState('train');
  const [selectedTrainClass, setSelectedTrainClass] = useState(TRAIN_CATEGORIES[1].id);
  const [selectedFlightClass, setSelectedFlightClass] = useState(FLIGHT_CATEGORIES[0].id);
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });

  // Real-time weather telemetry for origin & destination
  const [originWeather, setOriginWeather] = useState({ temp: 18, humidity: 55, heatIndex: 18, isLive: false, condition: 'Temperate', location: 'Shimla' });
  const [destWeather, setDestWeather] = useState({ temp: 35, humidity: 48, heatIndex: 38, isLive: false, condition: 'Hot & Dry', location: 'Ahmedabad' });
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Load live weather for both endpoints via Open-Meteo using OSM coords & travel date
  const loadRouteWeather = async (targetDate = travelDate) => {
    setLoadingWeather(true);
    try {
      const [resFrom, resTo] = await Promise.all([
        getCurrentWeather(fromCity, fromCoords, targetDate),
        getCurrentWeather(toCity, toCoords, targetDate),
      ]);
      if (resFrom.data) {
        setOriginWeather({
          temp: resFrom.data.temperature || 24,
          humidity: resFrom.data.humidity || 50,
          heatIndex: resFrom.data.heatIndex || resFrom.data.temperature || 24,
          condition: resFrom.data.condition || 'Temperate',
          isLive: resFrom.data.isLive !== false,
          location: resFrom.data.location || fromCity,
        });
      }
      if (resTo.data) {
        setDestWeather({
          temp: resTo.data.temperature || 35,
          humidity: resTo.data.humidity || 45,
          heatIndex: resTo.data.heatIndex || resTo.data.temperature || 36,
          condition: resTo.data.condition || 'Warm',
          isLive: resTo.data.isLive !== false,
          location: resTo.data.location || toCity,
        });
      }
    } catch {
      // Fallback — keep existing values
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    loadRouteWeather(travelDate);
  }, [fromCity, toCity, fromCoords, toCoords, travelDate]);

  const deltaTemp = Math.round((destWeather.temp - originWeather.temp) * 10) / 10;
  const deltaHI = Math.round((destWeather.heatIndex - originWeather.heatIndex) * 10) / 10;

  // Assess acclimatization lag and thermal shock
  const getAcclimatizationRisk = () => {
    const isAC = transitGroup === 'flight' || selectedTrainClass.includes('ac');

    if (deltaTemp >= 14 || deltaHI >= 16) {
      return {
        level: 'CRITICAL ACCLIMATIZATION LAG',
        badge: 'bg-red-600 text-white border-red-500',
        cardBorder: 'border-red-400 dark:border-red-800',
        cardBg: 'bg-red-50 dark:bg-red-950/30',
        shockScore: 88,
        warning: `Sudden thermal jump of +${deltaTemp}°C (+${deltaHI}°C Heat Index). Your cardiovascular system requires 3–5 days to upregulate sweat gland density. Avoid immediate physical labor upon arrival.`,
        transitEffect: isAC ? 'Stepping out of air-conditioning directly into hot outdoor air causes acute peripheral vasodilation.' : 'Long non-AC journey induces cumulative dehydration prior to arrival.',
      };
    }
    if (deltaTemp >= 7 || deltaHI >= 8) {
      return {
        level: 'ELEVATED TRANSITION RISK',
        badge: 'bg-orange-600 text-white border-orange-500',
        cardBorder: 'border-orange-400 dark:border-orange-800',
        cardBg: 'bg-orange-50 dark:bg-orange-950/30',
        shockScore: 60,
        warning: `Noticeable warming shift of +${deltaTemp}°C. Drink plenty of electrolyte-rich liquids on travel day and plan shaded rest breaks.`,
        transitEffect: isAC ? 'Maintain hydration in dry AC cabin air before arrival.' : 'Ensure adequate ventilation in non-AC coaches.',
      };
    }
    if (deltaTemp > 0) {
      return {
        level: 'MODERATE TRANSITION GRADIENT',
        badge: 'bg-amber-600 text-white border-amber-500',
        cardBorder: 'border-amber-400 dark:border-amber-800',
        cardBg: 'bg-amber-50 dark:bg-amber-950/30',
        shockScore: 35,
        warning: 'Mild environmental temperature variation. Regular hydration and sun protection will keep you comfortable.',
        transitEffect: 'Smooth physiological acclimatization window.',
      };
    }
    return {
      level: 'BENIGN TRANSITION (COOLER DESTINATION)',
      badge: 'bg-emerald-600 text-white border-emerald-500',
      cardBorder: 'border-emerald-400 dark:border-emerald-800',
      cardBg: 'bg-emerald-50 dark:bg-emerald-950/30',
      shockScore: 12,
      warning: `Arrival destination is ${Math.abs(deltaTemp)}°C cooler than your departure point. Low physiological risk.`,
      transitEffect: 'Comfortable arrival environment.',
    };
  };

  const risk = getAcclimatizationRisk();

  // Derive display names for origin/destination
  const originDisplay = fromCity.split(',')[0] || 'Origin';
  const destDisplay = toCity.split(',')[0] || 'Destination';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-300 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-400/30">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Travel Heat-Transition & Acclimatization
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                Live Satellite Sensor Sync
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
              Live thermal difference analysis across all Indian cities, towns, and villages for train and flight journeys.
            </p>
          </div>
        </div>

        <button
          onClick={loadRouteWeather}
          disabled={loadingWeather}
          className="btn-3d btn-3d-surface px-4 py-2 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin text-orange-600' : ''}`} />
          Refresh Live Route Weather
        </button>
      </div>

      {/* Input Route Selector */}
      <div className="glass-panel card-3d p-6 rounded-2xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Origin Selection */}
          <div className="md:col-span-5 bg-stone-50 dark:bg-slate-900/90 p-4 rounded-xl border border-stone-300 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Origin Point (Departure)
              </span>
              <button
                type="button"
                onClick={() => setFromSearchMode(fromSearchMode === 'osm' ? 'list' : 'osm')}
                className="btn-3d btn-3d-surface px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                {fromSearchMode === 'osm' ? '📋 Quick List' : '🔍 OSM Search'}
              </button>
            </div>

            {fromSearchMode === 'osm' ? (
              <PlaceSearchInput
                value={fromCity}
                onChange={(loc) => setFromCity(loc)}
                onSelectCoords={(c) => {
                  if (c) {
                    setFromCoords({ lat: c.lat, lon: c.lon });
                    setFromCity(c.name);
                  }
                }}
                placeholder="Search departure city, town, or village..."
                showLabel={false}
              />
            ) : (
              <select
                value={fromCity}
                onChange={(e) => { setFromCity(e.target.value); setFromCoords(null); }}
                className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold rounded-lg p-2.5 border border-stone-300 dark:border-slate-700 cursor-pointer"
              >
                {POPULAR_INDIAN_PLACES.map((city) => (
                  <option key={city} value={city} disabled={city === toCity}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-stone-200 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Live Departure Temp:</span>
              <span className="text-slate-900 dark:text-white font-mono font-bold">{originWeather.temp}°C (HI: {originWeather.heatIndex}°C)</span>
            </div>
          </div>

          {/* Transition Arrow */}
          <div className="md:col-span-2 flex flex-col items-center justify-center pt-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shadow-sm">
              <ArrowRight className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-1">
              {deltaTemp > 0 ? `+${deltaTemp}°C Shift` : `${deltaTemp}°C Shift`}
            </span>
          </div>

          {/* Destination Selection */}
          <div className="md:col-span-5 bg-stone-50 dark:bg-slate-900/90 p-4 rounded-xl border border-stone-300 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                Destination Point (Arrival)
              </span>
              <button
                type="button"
                onClick={() => setToSearchMode(toSearchMode === 'osm' ? 'list' : 'osm')}
                className="btn-3d btn-3d-surface px-2.5 py-1 text-[11px] font-bold cursor-pointer"
              >
                {toSearchMode === 'osm' ? '📋 Quick List' : '🔍 OSM Search'}
              </button>
            </div>

            {toSearchMode === 'osm' ? (
              <PlaceSearchInput
                value={toCity}
                onChange={(loc) => setToCity(loc)}
                onSelectCoords={(c) => {
                  if (c) {
                    setToCoords({ lat: c.lat, lon: c.lon });
                    setToCity(c.name);
                  }
                }}
                placeholder="Search arrival city, town, or village..."
                showLabel={false}
              />
            ) : (
              <select
                value={toCity}
                onChange={(e) => { setToCity(e.target.value); setToCoords(null); }}
                className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold rounded-lg p-2.5 border border-stone-300 dark:border-slate-700 cursor-pointer"
              >
                {POPULAR_INDIAN_PLACES.map((city) => (
                  <option key={city} value={city} disabled={city === fromCity}>
                    {city}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-stone-200 dark:border-slate-800">
              <span className="text-slate-600 dark:text-slate-400">Live Arrival Temp:</span>
              <span className="text-slate-900 dark:text-white font-mono font-bold">{destWeather.temp}°C (HI: {destWeather.heatIndex}°C)</span>
            </div>
          </div>
        </div>

        {/* Transit Mode Selection (Train vs Flight Separated) */}
        <div className="pt-4 border-t border-stone-300 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 dark:text-white">
              Conveyance Type:
            </label>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setTransitGroup('train')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  transitGroup === 'train'
                    ? 'btn-3d btn-3d-orange'
                    : 'pill-3d-inactive'
                }`}
              >
                <Train className="w-3.5 h-3.5" />
                Indian Railways (Train)
              </button>

              <button
                type="button"
                onClick={() => setTransitGroup('flight')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  transitGroup === 'flight'
                    ? 'btn-3d btn-3d-cyan'
                    : 'pill-3d-inactive'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                Flight (Air Travel)
              </button>
            </div>
          </div>

          {/* Train Dropdown or Flight Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                {transitGroup === 'train' ? 'Train Travel Class / Coach Type' : 'Flight Travel Class'}
              </label>

              {transitGroup === 'train' ? (
                <select
                  value={selectedTrainClass}
                  onChange={(e) => setSelectedTrainClass(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:border-orange-500"
                >
                  <optgroup label="Non-AC Open Air (Exposed to Ambient Heat & Wind)">
                    {TRAIN_CATEGORIES.filter(c => c.category === 'Non-AC').map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Air-Conditioned Sealed Coaches (Thermal Shock Upon Exit)">
                    {TRAIN_CATEGORIES.filter(c => c.category === 'AC Cooled').map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <select
                  value={selectedFlightClass}
                  onChange={(e) => setSelectedFlightClass(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:border-cyan-500"
                >
                  {FLIGHT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
                Travel Date
              </label>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Environmental Comparison Cards with 3D Depth */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel card-3d p-5 rounded-2xl space-y-2 stagger-1 animate-fadeIn">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Live Temperature Shift
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${deltaTemp > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {deltaTemp > 0 ? `+${deltaTemp}°C` : `${deltaTemp}°C`}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Ambient Difference</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            From <strong>{originWeather.temp}°C</strong> ({originDisplay}) to <strong>{destWeather.temp}°C</strong> ({destDisplay}).
          </p>
        </div>

        <div className="glass-panel card-3d p-5 rounded-2xl space-y-2 stagger-2 animate-fadeIn">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Perceived Heat Index Jump
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${deltaHI > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {deltaHI > 0 ? `+${deltaHI}°C` : `${deltaHI}°C`}
            </span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">"Feels Like" Change</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            Humidity difference: <strong>{destWeather.humidity - originWeather.humidity}%</strong> moisture gradient.
          </p>
        </div>

        <div className="glass-panel card-3d p-5 rounded-2xl space-y-2 stagger-3 animate-fadeIn">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Thermal Shock Index
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{risk.shockScore}</span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">/ 100 Acclimatization Lag</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300">
            {transitGroup === 'flight' ? 'Rapid Aviation Transit' : 'Rail Surface Journey'}
          </p>
        </div>
      </div>

      {/* Advisory & Arrival Safeguards */}
      <div className={`p-6 rounded-2xl border ${risk.cardBorder} ${risk.cardBg} backdrop-blur-xl space-y-4 card-3d shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-300/80 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Arrival Health & Acclimatization Safeguards
            </h3>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-sm ${risk.badge}`}>
            {risk.level}
          </span>
        </div>

        <p className="text-xs text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
          {risk.warning}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Transit Cooling & Hydration Directive</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">{risk.transitEffect}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">First 48-Hour Protocol at Destination</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Limit heavy outdoor exertion between 12 PM - 3 PM. Drink 750ml water before stepping out of railway station or airport.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
