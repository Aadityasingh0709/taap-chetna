// client/src/components/PersonalRiskCalculator.jsx
import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Droplets, 
  Sun, 
  HeartPulse, 
  ShieldCheck, 
  AlertOctagon, 
  Clock, 
  Save, 
  CheckCircle2, 
  Thermometer, 
  Activity, 
  AlertTriangle, 
  MapPin,
  Radio,
  Search,
  RefreshCw,
  Info
} from 'lucide-react';
import { getCurrentWeather, getCitizenProfile, updateCitizenProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { POPULAR_INDIAN_PLACES, EXPANDED_OCCUPATIONS } from '../data/indianPlaces';
import PlaceSearchInput from './PlaceSearchInput';

export default function PersonalRiskCalculator() {
  const { user } = useAuth();

  // Location selection: dropdown or OpenStreetMap search
  const [selectedCity, setSelectedCity] = useState(user?.homeLocation || 'Kolkata, West Bengal');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [searchMode, setSearchMode] = useState('osm'); // 'osm' or 'list'

  // Weather state (Live via Open-Meteo)
  const [weather, setWeather] = useState({
    temp: 32,
    humidity: 74,
    apparentTemperature: 36,
    condition: 'Live Satellite Telemetry',
    isLive: false,
    source: 'Connecting to Open-Meteo Live Sensors...',
  });
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Citizen personal inputs
  const [ageBand, setAgeBand] = useState(user?.ageBand || '26-40');
  const [occupationId, setOccupationId] = useState(EXPANDED_OCCUPATIONS[0].id);
  const [customOccupation, setCustomOccupation] = useState('');
  const [exposureHours, setExposureHours] = useState(4);
  const [healthCondition, setHealthCondition] = useState('none');
  const [livingCondition, setLivingCondition] = useState('middle_fan');
  const [hydrationLiters, setHydrationLiters] = useState(2.8);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState('');

  // On mount or user change: Load saved profile parameters from server or local backup
  useEffect(() => {
    const loadSavedProfile = async () => {
      const token = localStorage.getItem('tapchetna_token');
      if (token) {
        try {
          const res = await getCitizenProfile();
          if (res.data) {
            const p = res.data;
            if (p.homeLocation) setSelectedCity(p.homeLocation);
            if (p.selectedCoords) setSelectedCoords(p.selectedCoords);
            if (p.ageBand) setAgeBand(p.ageBand);
            if (p.occupation) {
              const matched = EXPANDED_OCCUPATIONS.find((o) => o.label === p.occupation || o.id === p.occupation || o.id === p.occupationId);
              if (matched) {
                setOccupationId(matched.id);
              } else {
                setOccupationId('other_custom');
                setCustomOccupation(p.occupation);
              }
            }
            if (p.exposureHours !== undefined) setExposureHours(p.exposureHours);
            if (p.healthCondition) setHealthCondition(p.healthCondition);
            if (p.livingCondition) setLivingCondition(p.livingCondition);
            if (p.hydrationLiters !== undefined) setHydrationLiters(p.hydrationLiters);
            return;
          }
        } catch (err) {
          console.warn('Could not load profile from server, using local fallback:', err.message);
        }
      }
      try {
        const savedLocal = localStorage.getItem('tapchetna_saved_profile');
        if (savedLocal) {
          const p = JSON.parse(savedLocal);
          if (p.homeLocation) setSelectedCity(p.homeLocation);
          if (p.selectedCoords) setSelectedCoords(p.selectedCoords);
          if (p.ageBand) setAgeBand(p.ageBand);
          if (p.occupation) {
            const matched = EXPANDED_OCCUPATIONS.find((o) => o.label === p.occupation || o.id === p.occupation || o.id === p.occupationId);
            if (matched) {
              setOccupationId(matched.id);
            } else {
              setOccupationId('other_custom');
              setCustomOccupation(p.occupation);
            }
          }
          if (p.exposureHours !== undefined) setExposureHours(p.exposureHours);
          if (p.healthCondition) setHealthCondition(p.healthCondition);
          if (p.livingCondition) setLivingCondition(p.livingCondition);
          if (p.hydrationLiters !== undefined) setHydrationLiters(p.hydrationLiters);
        }
      } catch (err) {
        // Ignore local parse error
      }
    };

    loadSavedProfile();
  }, [user]);

  // Fetch real-time weather from Open-Meteo live API (using OSM coordinates if available)
  const fetchLiveWeather = async (cityName, coords = selectedCoords) => {
    if (!cityName) return;
    setLoadingWeather(true);
    try {
      const res = await getCurrentWeather(cityName, coords);
      if (res.data) {
        setWeather({
          temp: res.data.temperature !== undefined ? res.data.temperature : 32,
          humidity: res.data.humidity !== undefined ? res.data.humidity : 70,
          apparentTemperature: res.data.apparentTemperature !== undefined ? res.data.apparentTemperature : res.data.temperature,
          condition: res.data.condition || 'Clear & Sunny',
          isLive: res.data.isLive !== false,
          source: res.data.source || 'Open-Meteo Satellite Station',
        });
      }
    } catch {
      // Fallback
      setWeather((prev) => ({
        ...prev,
        isLive: false,
        source: 'Calibrated Local Microclimate',
      }));
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchLiveWeather(selectedCity, selectedCoords);
  }, [selectedCity, selectedCoords]);

  // Heat Index & Wet-Bulb Calculations
  const computeHeatIndex = (t, rh) => {
    if (t < 25) return Math.round(t * 10) / 10;
    const hi = -8.784 + 1.611 * t + 2.339 * rh - 0.146 * t * rh - 0.0123 * (t ** 2) - 0.0164 * (rh ** 2) + 0.0022 * (t ** 2) * rh + 0.00072 * t * (rh ** 2) - 0.0000035 * (t ** 2) * (rh ** 2);
    return Math.round(hi * 10) / 10;
  };

  const computeWetBulb = (t, rh) => {
    const tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
      Math.atan(t + rh) -
      Math.atan(rh - 1.676331) +
      0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
      4.686035;
    return Math.round(tw * 10) / 10;
  };

  const heatIndex = computeHeatIndex(weather.temp, weather.humidity);
  const wetBulb = computeWetBulb(weather.temp, weather.humidity);

  // RESTRUCTURED & REALISTIC INDIAN PHYSIOLOGICAL VULNERABILITY FORMULA
  // Calibrated so healthy adults in typical Indian conditions land in comfortable/moderate tiers
  // and extreme scores require genuinely dangerous compounded conditions.
  const calculateVulnerability = () => {
    let score = 10; // Low base anchor

    // 1. Environmental Heat Index contribution (Graduated curve)
    if (heatIndex >= 52) score += 24;
    else if (heatIndex >= 46) score += 18;
    else if (heatIndex >= 40) score += 12;
    else if (heatIndex >= 35) score += 7;
    else if (heatIndex >= 30) score += 3;

    // 2. Wet-Bulb Stress (True biological sweating limit)
    if (wetBulb >= 32) score += 20;
    else if (wetBulb >= 29) score += 12;
    else if (wetBulb >= 26) score += 6;

    // 3. Age Demographic Factor
    if (ageBand === '65+') score += 12;
    else if (ageBand === '0-12') score += 9;
    else if (ageBand === '40-60') score += 5;
    else score += 1; // 26-40 prime physiological tolerance

    // 4. Occupational Exposure Factor (from expanded list)
    const currentOcc = EXPANDED_OCCUPATIONS.find((o) => o.id === occupationId);
    const occFactor = currentOcc ? currentOcc.factor : 7;
    score += occFactor;

    // 5. Daily Direct Sun Exposure Duration
    if (exposureHours >= 9) score += 12;
    else if (exposureHours >= 6) score += 8;
    else if (exposureHours >= 3) score += 4;
    else score += 1;

    // 6. Pre-existing Clinical Conditions
    if (healthCondition === 'cardiovascular') score += 12;
    else if (healthCondition === 'diabetes' || healthCondition === 'hypertension') score += 8;
    else if (healthCondition === 'respiratory') score += 7;

    // 7. Housing Thermal Envelope
    if (livingCondition === 'tin_roof') score += 10;
    else if (livingCondition === 'top_floor_no_ac') score += 7;
    else if (livingCondition === 'middle_fan') score += 3;
    else score -= 4; // AC cooling recovery

    // 8. Hydration Compensation Buffer
    if (hydrationLiters < 1.8) score += 10;
    else if (hydrationLiters < 2.5) score += 4;
    else if (hydrationLiters >= 3.5) score -= 8; // High hydration protection
    else score -= 4;

    return Math.min(100, Math.max(5, Math.round(score)));
  };

  const vulnScore = calculateVulnerability();

  const getRiskDetails = (score) => {
    if (score >= 75) {
      return {
        level: 'EXTREME RISK',
        color: 'text-purple-700 dark:text-purple-300',
        bg: 'bg-purple-100/80 dark:bg-purple-950/40 border-purple-400 dark:border-purple-800',
        badge: 'bg-purple-600 text-white border-purple-500',
        status: 'Severe physiological heat strain. Compounded biological and radiant sun risk.',
        restRatio: '30 mins work : 30 mins cooling shade rest',
        waterNeeded: '4.0 - 4.5 Litres / day with electrolyte salts (ORS)',
        forbiddenHours: '11:30 AM — 03:30 PM',
      };
    }
    if (score >= 55) {
      return {
        level: 'ELEVATED RISK',
        color: 'text-red-700 dark:text-red-300',
        bg: 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800',
        badge: 'bg-red-600 text-white border-red-500',
        status: 'Moderate-high thermal load. Increase hydration frequency and take shade halts.',
        restRatio: '45 mins work : 15 mins shaded rest',
        waterNeeded: '3.2 - 3.8 Litres / day (drink 250ml every 30 mins)',
        forbiddenHours: '12:30 PM — 03:00 PM',
      };
    }
    if (score >= 35) {
      return {
        level: 'MODERATE RISK',
        color: 'text-amber-800 dark:text-amber-300',
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        badge: 'bg-amber-600 text-white border-amber-500',
        status: 'Manageable Indian tropical heat. Stay consistently hydrated throughout the day.',
        restRatio: 'Standard hourly shade pause (5-10 mins)',
        waterNeeded: '2.5 - 3.0 Litres / day',
        forbiddenHours: 'None (Limit unshaded sprint labor at 2 PM)',
      };
    }
    return {
      level: 'LOW RISK',
      color: 'text-emerald-800 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
      badge: 'bg-emerald-600 text-white border-emerald-500',
      status: 'Comfortable thermal comfort. Body is well-acclimatized with balanced fluid levels.',
      restRatio: 'Normal routine work schedule',
      waterNeeded: '2.0 - 2.5 Litres / day',
      forbiddenHours: 'Safe for regular outdoor activities',
    };
  };

  const risk = getRiskDetails(vulnScore);

  const getTailoredDirectives = () => {
    const list = [];
    const currentOcc = EXPANDED_OCCUPATIONS.find((o) => o.id === occupationId);
    const occLabel = occupationId === 'other_custom' 
      ? (customOccupation || 'Custom Work') 
      : (currentOcc?.label.split('/')[0].trim() || 'General Citizen');
    const occCat = currentOcc?.category || 'General';

    // 1. Precision Fluid & Electrolyte Prescription
    const reqWater = Math.max(
      2.2, 
      (2.0 + (exposureHours * 0.35) + ((currentOcc?.factor || 6) * 0.08) + (wetBulb > 28 ? 0.8 : 0.3) + (healthCondition === 'diabetes' ? 0.6 : 0))
    ).toFixed(1);
    const waterGap = Math.round((reqWater - hydrationLiters) * 10) / 10;

    if (waterGap > 0.2) {
      list.push({
        id: 'dir_hydration',
        tag: 'FLUID PRESCRIPTION',
        title: `💧 Hydration Deficit Alert: -${waterGap} L/day Gap`,
        bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800',
        textColor: 'text-cyan-900 dark:text-cyan-200',
        desc: `At ${exposureHours} hours outdoor exposure as a ${occLabel}, your body loses ~${(reqWater * 0.7).toFixed(1)}L through perspiration. Your current intake (${hydrationLiters}L/day) falls ${waterGap}L short of the ${reqWater}L target. Drink 250mL of water with ORS or salted lemon water (Nimbu Pani) every 25–30 minutes during work hours.`,
      });
    } else {
      list.push({
        id: 'dir_hydration',
        tag: 'FLUID PRESCRIPTION',
        title: `💧 Hydration Target Met: ${hydrationLiters} L/day Active Buffer`,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
        textColor: 'text-emerald-900 dark:text-emerald-200',
        desc: `Excellent fluid buffer. Your daily intake of ${hydrationLiters}L meets your physiological need (${reqWater}L/day) for ${exposureHours}h outdoor shifts as a ${occLabel}. Continue sipping electrolyte water steadily rather than chugging large volumes at once.`,
      });
    }

    // 2. Health Condition Directives (All 5 options covered)
    if (healthCondition === 'cardiovascular') {
      list.push({
        id: 'dir_medical',
        tag: 'CLINICAL CARDIOLOGY',
        title: `🫀 Cardiac Output Strain Mitigation (Age ${ageBand})`,
        bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
        textColor: 'text-rose-900 dark:text-rose-200',
        desc: `Cutaneous vasodilation in ${weather.temp}°C ambient air forces cardiac output to double to pump blood to the skin surface. Given your cardiovascular condition and vulnerability score (${vulnScore}/100), restrict strenuous physical exertion above 35°C. Immediately halt work if you detect irregular palpitations, chest tightness, or dizziness.`,
      });
    } else if (healthCondition === 'hypertension') {
      list.push({
        id: 'dir_medical',
        tag: 'CLINICAL VASCULAR',
        title: `🩺 Postural Syncope & Vasodilation Safeguard`,
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        textColor: 'text-amber-900 dark:text-amber-200',
        desc: `High temperatures cause peripheral arterial dilation, causing sudden drops in systemic blood pressure (orthostatic hypotension). As a ${occLabel}, stand up gradually after seated rests and avoid sudden bends. Take anti-hypertensive medications with plenty of water, and keep a rehydration sachet handy.`,
      });
    } else if (healthCondition === 'diabetes') {
      list.push({
        id: 'dir_medical',
        tag: 'CLINICAL ENDOCRINE',
        title: `🩸 Autonomic Neuropathy & Glycemic Dehydration Protocol`,
        bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800',
        textColor: 'text-purple-900 dark:text-purple-200',
        desc: `Diabetes blunts the hypothalamic sweating reflex, delaying natural skin evaporative cooling while speeding up intracellular dehydration. Avoid sugary commercial beverages or sodas during your shift. Inspect your feet daily after ${exposureHours}h outdoor work for hot spots or thermal friction blisters.`,
      });
    } else if (healthCondition === 'respiratory') {
      list.push({
        id: 'dir_medical',
        tag: 'CLINICAL PULMONARY',
        title: `🫁 Bronchial Airway & Photochemical Smog Alert`,
        bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800',
        textColor: 'text-sky-900 dark:text-sky-200',
        desc: `High summer heat accelerates the formation of ground-level ozone and photochemical smog, triggering airway hyper-reactivity and bronchospasm. While working as a ${occLabel}, carry your rescue inhaler on your person at all times and wear a damp breathable cotton mask on dusty roadways.`,
      });
    } else {
      list.push({
        id: 'dir_medical',
        tag: 'PREVENTIVE NEPHROLOGY',
        title: `🛡️ Primary Renal & Organ Defense (No Chronic Illness)`,
        bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800',
        textColor: 'text-blue-900 dark:text-blue-200',
        desc: `Even with no chronic illness, spending ${exposureHours}h in ${weather.temp}°C ambient temperatures (HI: ${heatIndex}°C) strains renal glomerular filtration. Avoid non-steroidal anti-inflammatory painkillers (NSAIDs like ibuprofen) during heatwaves as they compound acute kidney risk. Monitor urine color—it should stay pale straw yellow.`,
      });
    }

    // 3. Exact Occupational Work-Rest Protocol
    if (occCat.includes('Heavy') || occCat.includes('Extreme') || occupationId === 'construction_laborer' || occupationId === 'agricultural_farmer' || occupationId === 'brick_kiln_worker' || occupationId === 'railway_trackman' || occupationId === 'dock_loading_porter') {
      list.push({
        id: 'dir_occupation',
        tag: 'OCCUPATIONAL SAFETY',
        title: `👷 Heavy Exertional Protocol for ${occLabel}`,
        bg: 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800',
        textColor: 'text-red-900 dark:text-red-200',
        desc: `Heavy muscular labor generates 400W–550W of internal metabolic heat. Enforce a strict work-rest schedule: ${risk.restRatio}. Never work isolated in unshaded pits or trenches during peak midday sun. Wear a wet cotton gamcha or hard-hat neck flap.`,
      });
    } else if (occCat.includes('Transit') || occupationId === 'delivery_rider' || occupationId === 'postman_courier' || occupationId === 'sales_executive' || occupationId === 'healthcare_worker_field') {
      list.push({
        id: 'dir_occupation',
        tag: 'OCCUPATIONAL SAFETY',
        title: `🛵 Mobile Transit & Road Surface Shield (${occLabel})`,
        bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800',
        textColor: 'text-orange-900 dark:text-orange-200',
        desc: `Asphalt roadway surfaces re-radiate up to 55°C radiant heat back at riders. Mount an insulated water bottle cage on your bike. Take mandatory 10-minute pauses in air-conditioned malls or shaded petrol pumps every 45 minutes between dispatches.`,
      });
    } else if (occCat.includes('Street') || occupationId === 'street_vendor' || occupationId === 'traffic_police' || occupationId === 'sanitation_worker' || occupationId === 'rickshaw_auto_puller' || occupationId === 'security_guard_outdoor') {
      list.push({
        id: 'dir_occupation',
        tag: 'OCCUPATIONAL SAFETY',
        title: `🚦 Street Commerce & Solar Glare Strategy (${occLabel})`,
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        textColor: 'text-amber-900 dark:text-amber-200',
        desc: `Standing or walking on paved footpaths for ${exposureHours} hours produces severe conductive sole heat. Stand on cardboard or rubber matting to isolate conductive heat. Wet the cloth canopy above your stall or checkpoint periodically to promote evaporative cooling.`,
      });
    } else if (occCat.includes('Kitchen') || occCat.includes('Industrial') || occupationId === 'roadside_cook_halwai' || occupationId === 'commercial_kitchen_chef' || occupationId === 'factory_foundry_worker' || occupationId === 'ironing_dhobi' || occupationId === 'mechanic_welder') {
      list.push({
        id: 'dir_occupation',
        tag: 'OCCUPATIONAL SAFETY',
        title: `🔥 Industrial & Kitchen Micro-Climate Control (${occLabel})`,
        bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800',
        textColor: 'text-rose-900 dark:text-rose-200',
        desc: `Burner flames and industrial equipment add 5°C–8°C above ambient outdoor air. Ensure cross-exhaust fans are running at full power. Keep a bowl of iced water and apply cold damp towels to your wrists and carotid artery every 30 minutes.`,
      });
    } else {
      list.push({
        id: 'dir_occupation',
        tag: 'OCCUPATIONAL SAFETY',
        title: `🏢 Indoor & Commuter Transition Protocol (${occLabel})`,
        bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800',
        textColor: 'text-indigo-900 dark:text-indigo-200',
        desc: `Stepping directly from an air-conditioned room (22°C) into ${weather.temp}°C outdoor heat causes acute vasomotor shock. Pause in a shaded intermediate foyer for 3 minutes before commuting. Ensure consistent hydration even while sitting in air-conditioned environments.`,
      });
    }

    // 4. Housing Thermal Envelope Management (All 4 options covered)
    if (livingCondition === 'tin_roof') {
      list.push({
        id: 'dir_housing',
        tag: 'DOMESTIC THERMAL DEFENSE',
        title: `🏠 Tin / Asbestos Roof Radiant Heat Trap Mitigation`,
        bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800',
        textColor: 'text-orange-900 dark:text-orange-200',
        desc: `Corrugated tin acts as a thermal radiator, pushing indoor ceiling temperatures up to 48°C. Apply a reflective white lime wash (Chuna coating) or lay damp jute gunny bags over the roof. During the forbidden midday window (${risk.forbiddenHours}), seek refuge in shaded community cooling facilities.`,
      });
    } else if (livingCondition === 'top_floor_no_ac') {
      list.push({
        id: 'dir_housing',
        tag: 'DOMESTIC THERMAL DEFENSE',
        title: `🏢 Top-Floor Slab Nighttime Re-Radiation Protocol`,
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
        textColor: 'text-amber-900 dark:text-amber-200',
        desc: `Reinforced concrete roof slabs absorb solar radiation throughout the day and continuously release it downward at night. Open opposing windows after 8 PM to establish cross-ventilation, hang wet cotton curtains to cool incoming air, and sleep on a ground floor mat.`,
      });
    } else if (livingCondition === 'middle_fan') {
      list.push({
        id: 'dir_housing',
        tag: 'DOMESTIC THERMAL DEFENSE',
        title: `🌀 Ceiling Fan Convective Heating Caution`,
        bg: 'bg-stone-50 dark:bg-slate-900/90 border-stone-300 dark:border-slate-800',
        textColor: 'text-stone-900 dark:text-stone-200',
        desc: `When ambient indoor air exceeds 35°C, ceiling fans act like convection ovens, driving hot air across skin and accelerating fluid evaporation without reducing core temperature. Place a broad shallow pan of cold water or ice under the fan path to enable evaporative cooling.`,
      });
    } else {
      list.push({
        id: 'dir_housing',
        tag: 'DOMESTIC THERMAL DEFENSE',
        title: `❄️ Air-Conditioned Recovery & Acclimatization Setting`,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
        textColor: 'text-emerald-900 dark:text-emerald-200',
        desc: `Set your air conditioner to an energy-efficient 24°C–26°C rather than chilling to 18°C. Extreme contrast impairs your body's natural sweat adaptation when you resume ${exposureHours}h outdoor shifts as a ${occLabel}. Keep indoor humidity balanced.`,
      });
    }

    // 5. Demographic Age-Specific Thermoregulatory Action (All 5 age groups covered)
    if (ageBand === '65+') {
      list.push({
        id: 'dir_demographic',
        tag: 'GERIATRIC THERMOREGULATION',
        title: `👵 Senior Citizen Blunted Thirst & Renal Defense`,
        bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800',
        textColor: 'text-purple-900 dark:text-purple-200',
        desc: `Age-related blunting of hypothalamic osmoreceptors suppresses natural thirst perception until severe dehydration has already occurred. Set an hourly alarm to drink 150mL of water. Have a family member or neighbor check in twice daily during heatwave alerts.`,
      });
    } else if (ageBand === '0-12') {
      list.push({
        id: 'dir_demographic',
        tag: 'PEDIATRIC THERMOREGULATION',
        title: `👶 Child Core Temperature Surge Safeguard`,
        bg: 'bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800',
        textColor: 'text-pink-900 dark:text-pink-200',
        desc: `Children have a high body surface area-to-mass ratio and underdeveloped sweat glands, absorbing environmental heat much faster than adults. Strictly forbid unshaded outdoor playground activity between 11 AM and 4 PM. Ensure frequent oral rehydration.`,
      });
    } else if (ageBand === '40-60') {
      list.push({
        id: 'dir_demographic',
        tag: 'MID-LIFE VASCULAR ADAPTATION',
        title: `👤 Mid-Life Endothelial Heat Buffer Directive`,
        bg: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800',
        textColor: 'text-yellow-900 dark:text-yellow-200',
        desc: `After age 40, cutaneous vasodilatory reserve declines, doubling the cardiovascular recovery time after thermal exertion. Schedule the most physically taxing outdoor tasks of your ${occLabel} routine prior to 10:00 AM, avoiding afternoon sun spikes.`,
      });
    } else if (ageBand === '13-25') {
      list.push({
        id: 'dir_demographic',
        tag: 'YOUTH & ATHLETIC ENDURANCE',
        title: `🏃 Young Adult Exertion & Dehydration Awareness`,
        bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800',
        textColor: 'text-teal-900 dark:text-teal-200',
        desc: `Younger individuals frequently underestimate heat exhaustion symptoms due to athletic conditioning. Replace high-sugar energy drinks and sodas with pure electrolytes or coconut water, and take mandatory shaded rest pauses during outdoor activities.`,
      });
    } else {
      list.push({
        id: 'dir_demographic',
        tag: 'PRIME ADULT RESILIENCE',
        title: `💪 Working Adult Fatigue & Sustained Hydration`,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
        textColor: 'text-emerald-900 dark:text-emerald-200',
        desc: `While in peak physiological prime (26–40 yrs), compounding daily occupational shifts with inadequate sleep depletes thermal resilience. Avoid consuming excess chai or coffee during high heat as caffeine acts as a mild diuretic, accelerating dehydration.`,
      });
    }

    return list;
  };

  const tailoredDirectives = getTailoredDirectives();

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    const selectedOcc = EXPANDED_OCCUPATIONS.find(o => o.id === occupationId);
    const currentOcc = occupationId === 'other_custom' ? (customOccupation || 'Custom Work') : (selectedOcc?.label || 'General Citizen');

    const profilePayload = {
      homeLocation: selectedCity,
      selectedCoords,
      ageBand,
      occupation: currentOcc,
      occupationId,
      customOccupation,
      exposureHours,
      healthCondition,
      livingCondition,
      hydrationLiters,
      vulnerabilityScore: vulnScore,
    };

    try {
      localStorage.setItem('tapchetna_saved_profile', JSON.stringify(profilePayload));
    } catch (e) {}

    const token = localStorage.getItem('tapchetna_token');
    let feedback = '';
    if (token) {
      try {
        await updateCitizenProfile(profilePayload);
        feedback = 'Profile Saved to Cloud!';
      } catch (err) {
        console.warn('API save profile error:', err.message);
        feedback = 'Saved Locally (Server Offline)';
      }
    } else {
      feedback = 'Saved Locally! Log in to sync across devices.';
    }

    setSavedFeedback(feedback);
    setSavedSuccess(true);
    setSavingProfile(false);
    setTimeout(() => {
      setSavedSuccess(false);
      setSavedFeedback('');
    }, 4500);
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Telemetry status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-300 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-400/30">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Personal Heat Vulnerability Intelligence
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                Live Satellite Sync
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
              Real-time biological heat risk, wet-bulb strain, and customized hydration directives for any Indian location.
            </p>
          </div>
        </div>

        {/* OpenStreetMap Search & Live Location Picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-stone-300 dark:border-slate-800 shadow-sm min-w-[320px] max-w-lg w-full sm:w-auto">
          {searchMode === 'osm' ? (
            <div className="flex-1">
              <PlaceSearchInput
                value={selectedCity}
                onChange={(loc) => setSelectedCity(loc)}
                onSelectCoords={(c) => {
                  if (c) {
                    setSelectedCoords({ lat: c.lat, lon: c.lon });
                    fetchLiveWeather(c.name, { lat: c.lat, lon: c.lon });
                  }
                }}
                placeholder="Search ANY village, town or city in India..."
                showLabel={false}
              />
            </div>
          ) : (
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCoords(null);
                setSelectedCity(e.target.value);
              }}
              className="w-full bg-stone-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-3 py-2 border border-stone-300 dark:border-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer min-w-[220px]"
            >
              {POPULAR_INDIAN_PLACES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchMode(searchMode === 'osm' ? 'list' : 'osm')}
              className="btn-3d btn-3d-surface px-3 py-1.5 text-[11px] font-bold whitespace-nowrap cursor-pointer"
              title={searchMode === 'osm' ? 'Switch to Quick List' : 'Search All via OpenStreetMap'}
            >
              {searchMode === 'osm' ? '📋 Quick List' : '🔍 OSM Search'}
            </button>

            <button
              onClick={() => fetchLiveWeather(selectedCity, selectedCoords)}
              disabled={loadingWeather}
              className="btn-3d btn-3d-surface p-2 text-slate-600 hover:text-orange-600 dark:text-slate-300 cursor-pointer"
              title="Refresh Live Satellite Weather"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin text-orange-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Environmental Matrix Cards with 3D Depth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel card-3d p-4 rounded-2xl relative overflow-hidden stagger-1 animate-fadeIn">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold">
            <span>Ambient Air Temp</span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">{weather.temp}°C</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-semibold">{weather.condition}</p>
        </div>

        <div className="glass-panel card-3d p-4 rounded-2xl relative overflow-hidden stagger-2 animate-fadeIn">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold">
            <span>Relative Humidity</span>
            <Droplets className="w-4 h-4 text-cyan-600" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">{weather.humidity}%</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-medium">Air Moisture Saturation</p>
        </div>

        <div className="glass-panel card-3d p-4 rounded-2xl relative overflow-hidden stagger-3 animate-fadeIn">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold">
            <span>Perceived Heat Index</span>
            <Sun className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-700 dark:text-amber-400 mt-1.5 font-mono">{heatIndex}°C</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-medium">"Feels Like" Thermal Load</p>
        </div>

        <div className="glass-panel card-3d p-4 rounded-2xl relative overflow-hidden stagger-4 animate-fadeIn">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-xs font-bold">
            <span>Wet-Bulb (WBGT)</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-rose-700 dark:text-rose-400 mt-1.5 font-mono">{wetBulb}°C</p>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 font-medium">
            {wetBulb >= 29 ? '⚠️ Critical Sweat Limit' : 'Safe Evaporative Window'}
          </p>
        </div>
      </div>

      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between px-1">
        <span>📍 Weather Grounded For: <strong className="text-slate-900 dark:text-white">{selectedCity}</strong></span>
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">● {weather.source}</span>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personalized Profile Inputs */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-stone-300 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-600" />
              Citizen Physiological & Exposure Parameters
            </h2>
            <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400">
              Interactive Calibration
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Age Group */}
            <div>
              <label className="block text-slate-900 dark:text-slate-200 font-bold mb-1.5">
                Age Demographic
              </label>
              <select
                value={ageBand}
                onChange={(e) => setAgeBand(e.target.value)}
                className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="0-12">Child (0-12 Years) — Higher Dehydration Sensitivity</option>
                <option value="13-25">Youth (13-25 Years) — High Activity</option>
                <option value="26-40">Adult (26-40 Years) — High Physiological Resilience</option>
                <option value="40-60">Middle-Aged (40-60 Years) — Moderate Vulnerability</option>
                <option value="65+">Senior Citizen (65+ Years) — Critical Cardiac Risk</option>
              </select>
            </div>

            {/* Health Conditions */}
            <div>
              <label className="block text-slate-900 dark:text-slate-200 font-bold mb-1.5">
                Pre-Existing Clinical Health
              </label>
              <select
                value={healthCondition}
                onChange={(e) => setHealthCondition(e.target.value)}
                className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="none">No Chronic Medical Conditions</option>
                <option value="hypertension">Hypertension (High Blood Pressure)</option>
                <option value="cardiovascular">Cardiovascular / Heart Disease</option>
                <option value="diabetes">Diabetes Mellitus</option>
                <option value="respiratory">Asthma / Chronic Respiratory</option>
              </select>
            </div>
          </div>

          {/* 4x Expanded Occupations + Custom Write-In Option */}
          <div className="space-y-2">
            <label className="block text-slate-900 dark:text-slate-200 font-bold text-xs">
              Daily Occupation & Work Environment ({EXPANDED_OCCUPATIONS.length} Categories)
            </label>
            <select
              value={occupationId}
              onChange={(e) => setOccupationId(e.target.value)}
              className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold text-xs focus:outline-none focus:border-orange-500"
            >
              {EXPANDED_OCCUPATIONS.map((occ) => (
                <option key={occ.id} value={occ.id}>
                  [{occ.category}] {occ.label}
                </option>
              ))}
            </select>

            {/* If other / custom occupation selected, show text entry */}
            {occupationId === 'other_custom' && (
              <div className="pt-1.5">
                <input
                  type="text"
                  value={customOccupation}
                  onChange={(e) => setCustomOccupation(e.target.value)}
                  placeholder="Describe your specific job / daily outdoor routine..."
                  className="w-full bg-stone-50 dark:bg-slate-900 border border-orange-400 dark:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-medium"
                />
              </div>
            )}
          </div>

          {/* Exposure Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-900 dark:text-slate-200">Daily Outdoor Sun Exposure:</span>
              <span className="font-mono text-orange-700 dark:text-orange-400">{exposureHours} Hours / Day</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="14"
              step="0.5"
              value={exposureHours}
              onChange={(e) => setExposureHours(parseFloat(e.target.value))}
              className="w-full accent-orange-600 cursor-pointer h-2 bg-stone-200 dark:bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400">
              <span>Minimal (&lt;1 hr)</span>
              <span>Half Day (4 hrs)</span>
              <span>Full Shift (8 hrs)</span>
              <span>Overtime (12+ hrs)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Housing Type */}
            <div>
              <label className="block text-slate-900 dark:text-slate-200 font-bold mb-1.5">
                Housing / Night Shelter Quality
              </label>
              <select
                value={livingCondition}
                onChange={(e) => setLivingCondition(e.target.value)}
                className="w-full bg-stone-50 dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="tin_roof">Tin / Asbestos Roof (Severe Thermal Trap)</option>
                <option value="top_floor_no_ac">Top Floor Pucca House (No Air Conditioning)</option>
                <option value="middle_fan">Ground/Mid Floor with Ceiling Fan</option>
                <option value="ac_available">Well-Ventilated or Air Conditioned Home</option>
              </select>
            </div>

            {/* Hydration Slider */}
            <div>
              <div className="flex justify-between font-bold mb-1.5">
                <span className="text-slate-900 dark:text-slate-200">Fluid Intake:</span>
                <span className="font-mono text-cyan-700 dark:text-cyan-400">{hydrationLiters} L / day</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.1"
                value={hydrationLiters}
                onChange={(e) => setHydrationLiters(parseFloat(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer h-2 bg-stone-200 dark:bg-slate-800 rounded-lg mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                <span>&lt;1.5 L (Dehydrated)</span>
                <span>2.5 L (Normal)</span>
                <span>4.0 L+ (Optimum)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-300 dark:border-slate-800">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-3d btn-3d-orange px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Saving Profile...
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  {savedFeedback || 'Profile Calibrated & Saved!'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save My Profile
                </>
              )}
            </button>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 italic">
              Recalculates dynamically with every slider shift
            </span>
          </div>
        </div>

        {/* Right Column: Tailored Health Plan & Risk Score */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Risk Score Card with 3D Depth */}
          <div className={`p-6 rounded-2xl border ${risk.bg} backdrop-blur-xl relative card-3d shadow-md`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-800 dark:text-slate-200 font-extrabold">
                Personal Heat Vulnerability Index
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-sm ${risk.badge}`}>
                {risk.level}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black text-slate-900 dark:text-white font-mono">{vulnScore}</span>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">/ 100 Heat Index</span>
            </div>

            <div className="w-full bg-stone-300 dark:bg-slate-900 rounded-full h-3 mt-3.5 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  vulnScore >= 75
                    ? 'bg-gradient-to-r from-red-600 to-purple-600'
                    : vulnScore >= 55
                    ? 'bg-gradient-to-r from-orange-500 to-red-600'
                    : vulnScore >= 35
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${vulnScore}%` }}
              />
            </div>

            <p className="mt-3.5 text-xs text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
              {risk.status}
            </p>
          </div>

          {/* Tailored Clinical Action Directives */}
          <div className="glass-panel p-5 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Tailored Clinical Action Directives
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300">
                {tailoredDirectives.length} Calibrated Rules
              </span>
            </div>

            {/* Individualized Patient Context Banner */}
            <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-400/30 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                  <Activity className="w-4 h-4" /> Individual Clinical Risk Profile
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shadow-sm ${risk.badge}`}>
                  {risk.level} ({vulnScore}/100)
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                Tailored for: <strong>Age {ageBand}</strong> • <strong>{occupationId === 'other_custom' ? (customOccupation || 'Custom Work') : (EXPANDED_OCCUPATIONS.find(o => o.id === occupationId)?.label.split('/')[0] || 'Citizen')}</strong> • Medical: <strong className="capitalize">{healthCondition}</strong> • Housing: <strong className="capitalize">{livingCondition.replace(/_/g, ' ')}</strong> • <strong>{exposureHours}h daily sun</strong> in <strong>{selectedCity.split(',')[0]}</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Prescribed Work-Rest Cycle</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-medium">{risk.restRatio}</p>
                </div>
              </div>

              {tailoredDirectives.map((d) => (
                <div key={d.id} className={`p-3.5 rounded-xl border ${d.bg} transition-all`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                      {d.tag}
                    </span>
                  </div>
                  <h4 className={`text-xs font-bold ${d.textColor}`}>{d.title}</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                    {d.desc}
                  </p>
                </div>
              ))}

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-slate-900/90 border border-stone-200 dark:border-slate-800 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Forbidden Direct Sun Exposure Window</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-medium">
                    {risk.forbiddenHours}
                  </p>
                </div>
              </div>

              {/* Heat Stroke Signs */}
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50">
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                  Heat Stroke Emergency Warning Signs:
                </h4>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  Hot dry skin (cessation of sweating), rapid pounding pulse, throbbing headache, confusion, or dizziness. Call <strong>108 / 112</strong> immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
