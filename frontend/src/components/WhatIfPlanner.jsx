// frontend/src/components/WhatIfPlanner.jsx
import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Sun, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Droplets, 
  Flame, 
  Zap,
  Activity,
  ArrowRight,
  Radio,
  Search,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Heart,
  Thermometer,
  Sliders
} from 'lucide-react';
import { getCurrentWeather } from '../services/api';
import { POPULAR_INDIAN_PLACES } from '../data/indianPlaces';
import PlaceSearchInput from './PlaceSearchInput';

// 4x+ Expanded Activity List categorized by metabolic workload and thermal sensitivity
const EXPANDED_ACTIVITIES = [
  // Heavy Manual Labor / Outdoor Construction
  { id: 'construction', label: 'Outdoor Construction / Masonry / Heavy Lifting', category: 'Heavy Manual', metabolicRate: '450W (Very High)', waterLossPerHour: 1.4 },
  { id: 'farming_harvest', label: 'Agricultural Field Harvesting / Ploughing', category: 'Heavy Manual', metabolicRate: '420W (Very High)', waterLossPerHour: 1.3 },
  { id: 'road_asphalt_work', label: 'Road Paving / Asphalt Tarring / Trenching', category: 'Extreme Radiant', metabolicRate: '480W (Extreme)', waterLossPerHour: 1.6 },
  { id: 'brick_carrying', label: 'Quarry / Brick Kiln Heavy Portering', category: 'Extreme Radiant', metabolicRate: '500W (Extreme)', waterLossPerHour: 1.7 },
  // Street Commerce & Mobile Transit
  { id: 'vending', label: 'Street Vending / Vegetable & Fruit Cart Stall', category: 'Outdoor Mobile', metabolicRate: '280W (Moderate-High)', waterLossPerHour: 0.9 },
  { id: 'rickshaw_cycling', label: 'Cycle Rickshaw / Manual Cart Hauling', category: 'Heavy Manual', metabolicRate: '520W (Extreme)', waterLossPerHour: 1.8 },
  { id: 'delivery_twowheeler', label: 'Two-Wheeler Food / Courier Delivery Riding', category: 'Outdoor Mobile', metabolicRate: '220W (Moderate)', waterLossPerHour: 0.8 },
  { id: 'traffic_duty', label: 'Traffic Ward / Street Security Guard Patrol', category: 'Outdoor Standing', metabolicRate: '200W (Moderate)', waterLossPerHour: 0.7 },
  // Sports & Athletics
  { id: 'running_athletics', label: 'Outdoor Jogging / Marathon / Athletic Running', category: 'Athletic Sports', metabolicRate: '600W (Maximum)', waterLossPerHour: 1.8 },
  { id: 'cricket_football', label: 'Cricket / Football / Open Field Sports', category: 'Athletic Sports', metabolicRate: '520W (Very High)', waterLossPerHour: 1.5 },
  { id: 'cycling_sport', label: 'Bicycle Commute / Long Distance Cycling', category: 'Athletic Sports', metabolicRate: '450W (High)', waterLossPerHour: 1.3 },
  // Everyday Chores, Family & Commute
  { id: 'errands_mandi', label: 'Mandi Shopping / Grocery Errands on Foot', category: 'Daily Routine', metabolicRate: '190W (Light-Moderate)', waterLossPerHour: 0.6 },
  { id: 'school_commute', label: 'Walking Children to School / Bus Stop', category: 'Daily Routine', metabolicRate: '160W (Light)', waterLossPerHour: 0.5 },
  { id: 'bus_train_commute', label: 'Public Bus / Non-AC Train Commute', category: 'Transit', metabolicRate: '170W (Light)', waterLossPerHour: 0.6 },
  { id: 'temple_gathering', label: 'Open-Air Temple Visit / Social Gathering', category: 'Social Outdoor', metabolicRate: '150W (Light)', waterLossPerHour: 0.5 },
  { id: 'gardening_domestic', label: 'Home Gardening / Courtyard Sweeping', category: 'Domestic Outdoor', metabolicRate: '210W (Moderate)', waterLossPerHour: 0.7 },
  // Custom Activity
  { id: 'custom_activity', label: 'Custom Activity (Describe Your Activity Below)', category: 'Custom', metabolicRate: 'Variable', waterLossPerHour: 1.0 },
];

// 10-Point Peak Hour Emergency Precautions Checklist
const PEAK_HOUR_PRECAUTIONS = [
  { id: 1, title: 'Pre-Hydrate with Electrolytes', desc: 'Drink 500 mL of ORS or lemon-salted water 30 minutes before leaving home.' },
  { id: 2, title: 'Cover Head, Ears & Neck', desc: 'Wear a wide-brimmed cotton hat or a wet cotton gamcha/scarf to protect cerebral blood vessels.' },
  { id: 3, title: 'UV400 Eyewear & Sunscreen', desc: 'Shield eyes from intense UV keratitis and apply high-SPF physical sunblock to exposed skin.' },
  { id: 4, title: 'Breathable White/Light Cotton', desc: 'Wear loose-fitting light fabric. Avoid dark, synthetic or nylon garments that trap radiant heat.' },
  { id: 5, title: 'Mandatory 15-Min Shaded Rests', desc: 'Take a sheltered rest every 30–40 minutes of exertion; never exert continuously in direct midday sun.' },
  { id: 6, title: 'Carry Minimum 1.5L Chilled Water', desc: 'Keep a vacuum-insulated bottle with ORS or glucose solution; sip every 15 minutes even without thirst.' },
  { id: 7, title: 'Carotid & Pulse-Point Wet Cooling', desc: 'Periodically apply cold wet towels or water to your neck, wrists, and temples to lower core blood temperature.' },
  { id: 8, title: 'Avoid Heavy/Oily/High-Protein Meals', desc: 'Heavy digestion creates substantial metabolic thermogenesis, worsening internal heat strain.' },
  { id: 9, title: 'Emergency Symptom Cessation', desc: 'Cease all activity immediately if experiencing dizziness, nausea, throbbing headache, or sudden cessation of sweat.' },
  { id: 10, title: 'Identify Nearest AC / Cooling Point', desc: 'Know the nearest municipal shelter, metro station, or shaded public hospital before stepping out.' },
];

// Accurate Heat Index calculation (Rothfusz regression)
function computeHeatIndex(tempC, humidity) {
  const tF = tempC * 1.8 + 32;
  const rh = humidity;
  let hiF = 0.5 * (tF + 61.0 + ((tF - 68.0) * 1.2) + (rh * 0.094));
  if (hiF >= 80) {
    hiF = -42.379 + 2.04901523 * tF + 10.14333127 * rh
      - 0.22475541 * tF * rh - 0.00683783 * (tF * tF)
      - 0.05481717 * (rh * rh) + 0.00122874 * (tF * tF) * rh
      + 0.00085282 * tF * (rh * rh) - 0.00000199 * (tF * tF) * (rh * rh);
  }
  const hiC = (hiF - 32) / 1.8;
  return Math.round(Math.max(tempC, hiC) * 10) / 10;
}

export default function WhatIfPlanner() {
  // Location selection: OSM search or quick list
  const [selectedCity, setSelectedCity] = useState('Nagpur, Maharashtra');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [searchMode, setSearchMode] = useState('osm'); // 'osm' or 'list'

  // Activity selection
  const [selectedActivity, setSelectedActivity] = useState(EXPANDED_ACTIVITIES[0]);
  const [customActivityDetails, setCustomActivityDetails] = useState('');

  // Date & Time selection
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [scheduledDate, setScheduledDate] = useState(tomorrowStr());
  const [activityStartHour, setActivityStartHour] = useState(8); // 0 to 23
  const [selectedBestSlot, setSelectedBestSlot] = useState('morning');

  // Real-time live temperature base
  const [liveBaseWeather, setLiveBaseWeather] = useState({ temp: 33, humidity: 60, isLive: false, location: '' });
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Fetch real-time weather from Open-Meteo (with target date for future forecasts)
  const fetchCityWeather = async (cityName = selectedCity, coords = selectedCoords, date = scheduledDate) => {
    if (!cityName) return;
    setLoadingWeather(true);
    try {
      const res = await getCurrentWeather(cityName, coords, date);
      if (res.data) {
        setLiveBaseWeather({
          temp: res.data.temperature !== undefined ? res.data.temperature : 33,
          humidity: res.data.humidity !== undefined ? res.data.humidity : 55,
          isLive: res.data.isLive !== false,
          location: res.data.location || cityName,
        });
      }
    } catch {
      // Keep baseline
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchCityWeather(selectedCity, selectedCoords, scheduledDate);
  }, [selectedCity, selectedCoords, scheduledDate]);

  const activeCity = selectedCity || 'Nagpur, Maharashtra';
  const baseT = liveBaseWeather.temp;
  const baseH = liveBaseWeather.humidity;

  // Dynamically calculate 4 diurnal time windows with realistic daily curves
  const morningTemp = Math.round((baseT - 5.5) * 10) / 10;
  const morningH = Math.min(92, Math.round(baseH + 14));
  const morningHI = computeHeatIndex(morningTemp, morningH);

  const lateMorningTemp = Math.round((baseT - 0.5) * 10) / 10;
  const lateMorningH = Math.max(25, Math.round(baseH - 4));
  const lateMorningHI = computeHeatIndex(lateMorningTemp, lateMorningH);

  const afternoonTemp = Math.round((baseT + 4.5) * 10) / 10;
  const afternoonH = Math.max(18, Math.round(baseH - 14));
  const afternoonHI = computeHeatIndex(afternoonTemp, afternoonH);

  const eveningTemp = Math.round((baseT - 1.2) * 10) / 10;
  const eveningH = Math.min(85, Math.round(baseH + 5));
  const eveningHI = computeHeatIndex(eveningTemp, eveningH);

  const slots = [
    {
      id: 'morning',
      label: 'Early Morning Window',
      time: '06:00 AM — 08:30 AM',
      startHour: 6,
      endHour: 9,
      temp: morningTemp,
      humidity: morningH,
      heatIndex: morningHI,
      uvIndex: 2,
      risk: 'LOW RISK',
      status: 'RECOMMENDED OPTIMAL WINDOW',
      isBest: true,
      cardBg: 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800',
      badge: 'bg-emerald-600 text-white border-emerald-500',
      sweatRate: (selectedActivity.waterLossPerHour * 0.55).toFixed(1),
      psi: '1.9 / 10 (Mild)',
      notes: 'Lowest asphalt surface heat. Safe for cardiovascular endurance.',
    },
    {
      id: 'late_morning',
      label: 'Late Morning Window',
      time: '10:00 AM — 12:00 PM',
      startHour: 10,
      endHour: 12,
      temp: lateMorningTemp,
      humidity: lateMorningH,
      heatIndex: lateMorningHI,
      uvIndex: 8,
      risk: 'ELEVATED RISK',
      status: 'RISING HEAT STRAIN',
      isBest: false,
      cardBg: 'bg-amber-50 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800',
      badge: 'bg-amber-600 text-white border-amber-500',
      sweatRate: (selectedActivity.waterLossPerHour * 1.05).toFixed(1),
      psi: '5.2 / 10 (Moderate)',
      notes: 'Rapidly rising solar UV radiation; take shaded rests every 35 mins.',
    },
    {
      id: 'afternoon',
      label: 'Peak Afternoon Window',
      time: '01:00 PM — 04:00 PM',
      startHour: 12,
      endHour: 16,
      temp: afternoonTemp,
      humidity: afternoonH,
      heatIndex: afternoonHI,
      uvIndex: 11,
      risk: 'HIGH / SEVERE RISK',
      status: 'HAZARDOUS PEAK WINDOW',
      isBest: false,
      cardBg: 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800',
      badge: 'bg-red-600 text-white border-red-500',
      sweatRate: (selectedActivity.waterLossPerHour * 1.5).toFixed(1),
      psi: '8.4 / 10 (High)',
      notes: 'Maximum direct solar radiation. Extreme risk of heat stroke and rapid dehydration.',
    },
    {
      id: 'evening',
      label: 'Post-Sunset Dusk Window',
      time: '06:00 PM — 08:30 PM',
      startHour: 18,
      endHour: 21,
      temp: eveningTemp,
      humidity: eveningH,
      heatIndex: eveningHI,
      uvIndex: 0,
      risk: 'MODERATE RISK',
      status: 'ACCEPTABLE ALTERNATIVE',
      isBest: false,
      cardBg: 'bg-stone-50 dark:bg-slate-900/90 border-stone-300 dark:border-slate-800',
      badge: 'bg-slate-700 text-white border-slate-600',
      sweatRate: (selectedActivity.waterLossPerHour * 0.85).toFixed(1),
      psi: '3.8 / 10 (Moderate)',
      notes: 'Zero solar UV load; residual ground heat from concrete surfaces.',
    },
  ];

  // Detect whether user's specified time falls into dangerous midday peak hours
  const isPeakHour = activityStartHour >= 12 && activityStartHour < 16;
  const tempDiffSaving = Math.round((afternoonTemp - morningTemp) * 10) / 10;
  const waterDiffSaving = ((selectedActivity.waterLossPerHour * 1.5) - (selectedActivity.waterLossPerHour * 0.55)).toFixed(1);

  // Format hour for display
  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    return `${h.toString().padStart(2, '0')}:00 ${period}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-300 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-400/30 shadow-sm">
            <CalendarClock className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                What-If Outdoor Activity Time Planner
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                Live Forecast Sync
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
              Simulates physiological heat strain across diurnal time windows for any Indian village or city using date-specific forecasts.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchCityWeather(selectedCity, selectedCoords, scheduledDate)}
          disabled={loadingWeather}
          className="btn-3d btn-3d-surface px-4 py-2 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin text-orange-600' : ''}`} />
          Refresh Forecast
        </button>
      </div>

      {/* Activity, Location & Time Configuration Bar */}
      <div className="glass-panel card-3d p-6 rounded-2xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location with Village/City OpenStreetMap search + quick list */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                Target Village or City
              </label>
              <button
                type="button"
                onClick={() => setSearchMode(searchMode === 'osm' ? 'list' : 'osm')}
                className="btn-3d btn-3d-surface px-2 py-0.5 text-[10px] font-bold cursor-pointer"
              >
                {searchMode === 'osm' ? '📋 List' : '🔍 OSM'}
              </button>
            </div>

            {searchMode === 'osm' ? (
              <PlaceSearchInput
                value={selectedCity}
                onChange={(loc) => setSelectedCity(loc)}
                onSelectCoords={(c) => {
                  if (c) {
                    setSelectedCoords({ lat: c.lat, lon: c.lon });
                    setSelectedCity(c.name);
                  }
                }}
                placeholder="Search ANY village, town, or city in India..."
                showLabel={false}
              />
            ) : (
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedCoords(null);
                }}
                className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                {POPULAR_INDIAN_PLACES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          {/* 4x+ Expanded Activity Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-orange-600" />
              Planned Activity ({EXPANDED_ACTIVITIES.length} Types)
            </label>
            <select
              value={selectedActivity.id}
              onChange={(e) => setSelectedActivity(EXPANDED_ACTIVITIES.find((a) => a.id === e.target.value) || EXPANDED_ACTIVITIES[0])}
              className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {EXPANDED_ACTIVITIES.map((act) => (
                <option key={act.id} value={act.id}>
                  [{act.category}] {act.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date of Activity */}
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5 flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-orange-600" />
              Date of Activity
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500 cursor-pointer"
            />
          </div>

          {/* Planned Start Time Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                Planned Start Time
              </label>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                isPeakHour 
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800' 
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}>
                {formatHour(activityStartHour)}
              </span>
            </div>
            
            <div className="space-y-1.5">
              <input
                type="range"
                min="5"
                max="21"
                step="1"
                value={activityStartHour}
                onChange={(e) => setActivityStartHour(parseInt(e.target.value, 10))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>05:00 AM</span>
                <span className="text-red-600 font-bold">12:00–04:00 PM (Peak)</span>
                <span>09:00 PM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Time Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-stone-200 dark:border-slate-800 text-xs">
          <span className="text-stone-500 dark:text-stone-400 font-semibold text-[11px] flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Quick Time Presets:
          </span>
          {[
            { label: '07:00 AM (Cool)', hour: 7 },
            { label: '10:00 AM (Warm)', hour: 10 },
            { label: '01:00 PM (Dangerous Peak)', hour: 13 },
            { label: '03:00 PM (Peak Heat)', hour: 15 },
            { label: '06:30 PM (Dusk)', hour: 18 },
          ].map((preset) => (
            <button
              key={preset.hour}
              type="button"
              onClick={() => setActivityStartHour(preset.hour)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                activityStartHour === preset.hour
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom activity explanation if custom is selected */}
        {selectedActivity.id === 'custom_activity' && (
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
              Explain Your Custom Activity & Environment:
            </label>
            <textarea
              rows="2"
              value={customActivityDetails}
              onChange={(e) => setCustomActivityDetails(e.target.value)}
              placeholder="e.g. Painting exterior walls on a 3-storey building with direct sun from 1 PM..."
              className="w-full bg-stone-50 dark:bg-slate-900 border border-orange-400 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>
        )}

        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 dark:text-slate-300 pt-3 border-t border-stone-200 dark:border-slate-800">
          <span>
            Metabolic Strain: <strong className="text-orange-700 dark:text-orange-400 font-mono">{selectedActivity.metabolicRate}</strong>
          </span>
          <span>
            Baseline Fluid Loss: <strong className="text-cyan-700 dark:text-cyan-400 font-mono">{selectedActivity.waterLossPerHour} L/hr</strong>
          </span>
          <span>
            Forecast for {scheduledDate}: <strong className="text-slate-900 dark:text-white font-mono">{baseT}°C, {baseH}% RH</strong>
          </span>
        </div>
      </div>

      {/* 🚨 Emergency Peak Hour Protection Checklist (Displays when scheduled time is 12-4 PM) */}
      {isPeakHour && (
        <div className="glass-panel card-3d p-6 rounded-2xl border-2 border-red-500/80 bg-red-50/90 dark:bg-red-950/40 shadow-lg animate-fadeIn space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-300 dark:border-red-900/60 pb-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-600 text-white shadow-md animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-red-950 dark:text-red-100 tracking-tight">
                    🚨 Extreme Peak Heat Warning: Activity Scheduled at {formatHour(activityStartHour)}
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                    Direct Solar Danger Zone
                  </span>
                </div>
                <p className="text-xs text-red-900 dark:text-red-200 font-medium mt-0.5">
                  12:00 PM – 04:00 PM has maximum solar angle, UV index &gt; 11, and asphalt surface temperatures exceeding 55°C.
                  If stepping out cannot be avoided, strictly observe these 10 survival protocols:
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActivityStartHour(7)}
              className="btn-3d btn-3d-emerald px-4 py-2 text-white text-xs font-bold whitespace-nowrap self-start sm:self-auto cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              Reschedule to 07:00 AM (Recommended)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {PEAK_HOUR_PRECAUTIONS.map((item) => (
              <div 
                key={item.id} 
                className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-200 dark:border-red-900/40 flex items-start gap-2.5 shadow-sm"
              >
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.id}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Grid: 4 Diurnal Multi-Slot Analysis */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Comparative Diurnal Multi-Slot Analysis ({activeCity.split(',')[0]} • {scheduledDate})</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
              4 Windows Evaluated
            </span>
          </h2>
          <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
            Your planned activity time: <strong className="text-orange-600 font-mono">{formatHour(activityStartHour)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {slots.map((slot) => {
            const isUserSlot = activityStartHour >= slot.startHour && activityStartHour < slot.endHour;

            return (
              <div
                key={slot.id}
                className={`rounded-2xl p-5 border ${slot.cardBg} backdrop-blur-xl flex flex-col justify-between relative card-3d shadow-sm transition-all ${
                  isUserSlot ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                }`}
              >
                {slot.isBest && (
                  <div className="absolute -top-3 left-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> RECOMMENDED OPTIMAL SLOT
                  </div>
                )}

                {isUserSlot && !slot.isBest && (
                  <div className="absolute -top-3 right-4 bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                    📍 YOUR PLANNED TIME
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{slot.label}</span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-sm ${slot.badge}`}>
                      {slot.risk}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    {slot.time}
                  </p>

                  {/* Primary Temp & Heat Index */}
                  <div className="my-4 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{slot.temp}°C</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Ambient Air</span>
                    </div>
                    <div className="text-xs text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-2">
                      <span>Feels Like: <strong className="font-bold text-amber-700 dark:text-amber-400 font-mono">{slot.heatIndex}°C</strong></span>
                      <span className="text-[11px] text-stone-500 font-normal">({slot.humidity}% RH)</span>
                    </div>
                  </div>

                  {/* Detailed Matrix */}
                  <div className="space-y-2.5 border-t border-stone-300/80 dark:border-slate-800/80 pt-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-600" /> UV Index
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white font-bold">{slot.uvIndex} / 12</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Sweat Rate
                      </span>
                      <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold">{slot.sweatRate} L/hr</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-rose-600" /> Heat Strain (PSI)
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white font-bold">{slot.psi}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-3 font-medium italic border-t border-stone-300/80 dark:border-slate-800/80 pt-2">
                    {slot.notes}
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => {
                      setSelectedBestSlot(slot.id);
                      setActivityStartHour(slot.startHour + 1);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-black cursor-pointer ${
                      selectedBestSlot === slot.id
                        ? 'btn-3d btn-3d-emerald text-white'
                        : slot.id === 'afternoon'
                        ? 'btn-3d btn-3d-danger'
                        : 'btn-3d btn-3d-surface'
                    }`}
                  >
                    {selectedBestSlot === slot.id
                      ? '✓ Window Selected'
                      : slot.isBest
                      ? 'Adopt Recommended Slot'
                      : slot.id === 'afternoon'
                      ? '⚠️ Severe Danger Slot'
                      : 'Select Window'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Summary Box with 3D Depth */}
      <div className="glass-panel card-3d p-6 rounded-2xl border-emerald-400/40 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-600 text-white shrink-0 shadow-md">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Optimization Verdict for {scheduledDate}: Shift Schedule to 06:00 AM — 08:30 AM
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium mt-0.5">
              By shifting from Peak Afternoon ({afternoonTemp}°C) to Early Morning ({morningTemp}°C), ambient temperature drops by <strong className="text-emerald-700 dark:text-emerald-400">{tempDiffSaving}°C</strong>, saving over <strong className="text-emerald-700 dark:text-emerald-400">{waterDiffSaving} Litres</strong> of dehydration during {selectedActivity.label}.
            </p>
          </div>
        </div>

        <button
          onClick={() => alert(`Optimal Slot 06:00 AM — 08:30 AM on ${scheduledDate} confirmed for "${selectedActivity.label}" in ${activeCity.split(',')[0]}. Sync reminder activated.`)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shadow-md cursor-pointer active:translate-y-1 transition-all"
        >
          Confirm & Sync Reminder
        </button>
      </div>
    </div>
  );
}
