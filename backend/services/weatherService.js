// server/services/weatherService.js
// Centralized weather data service with OpenStreetMap (Nominatim) Geocoding + Live Open-Meteo Integration
// Resolves any Indian village, taluk, district, or city via OpenStreetMap and fetches live telemetry from Open-Meteo.

const axios = require('axios');

// In-memory caches to prevent redundant requests
const weatherCache = new Map();
const geoCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function computeHeatIndex(temp, humidity) {
  if (temp < 25) return Math.round(temp * 10) / 10;
  const hi = -8.78469475556 +
    1.61139411 * temp +
    2.33854883889 * humidity -
    0.14611605 * temp * humidity -
    0.012308094 * (temp ** 2) -
    0.0164248277778 * (humidity ** 2) +
    0.002211732 * (temp ** 2) * humidity +
    0.00072546 * temp * (humidity ** 2) -
    0.000003582 * (temp ** 2) * (humidity ** 2);

  return Math.round(hi * 10) / 10;
}

function computeWetBulb(temp, humidity) {
  const t = temp;
  const rh = humidity;
  const tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Math.round(tw * 10) / 10;
}

function getRiskLevel(heatIndex) {
  if (heatIndex >= 52) return 'EXTREME';
  if (heatIndex >= 44) return 'SEVERE';
  if (heatIndex >= 38) return 'HIGH';
  if (heatIndex >= 32) return 'MODERATE';
  return 'LOW';
}

function getRiskMessage(riskLevel) {
  const messages = {
    'LOW': 'Thermal conditions are comfortable and well within safe limits.',
    'MODERATE': 'Mild tropical warmth. Drink adequate water and avoid dehydration.',
    'HIGH': 'Noticeable heat strain during direct afternoon sunlight. Take periodic shade rest.',
    'SEVERE': 'Severe heat conditions. High risk of dehydration and heat exhaustion.',
    'EXTREME': 'Dangerous heatwave. Limit outdoor exposure between 12:00 PM and 3:30 PM.',
  };
  return messages[riskLevel] || messages['MODERATE'];
}

function getConditionFromWeatherCode(code, temp) {
  if (code === 0) return temp > 35 ? 'Clear & Scorchingly Hot' : 'Clear Sky';
  if (code === 1 || code === 2) return temp > 35 ? 'Partly Sunny & Heated' : 'Partly Cloudy';
  if (code === 3) return 'Overcast & Humid';
  if (code >= 45 && code <= 48) return 'Hazy / Low Visibility';
  if (code >= 51 && code <= 67) return 'Rain / Showers';
  if (code >= 80 && code <= 82) return 'Scattered Showers';
  if (code >= 95) return 'Thunderstorm Activity';
  return 'Hot & Sunny';
}

// 1. OpenStreetMap (OSM Nominatim) Search for ANY Village, Town, City, or Taluk in India
async function searchPlacesOSM(query) {
  if (!query || query.trim().length < 2) return [];

  const cacheKey = query.toLowerCase().trim();
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&addressdetails=1&limit=8`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'TaapChetna-HeatIntelligence/2.0 (OpenStreetMap + Open-Meteo Integration)',
      },
      timeout: 5000,
    });

    if (res.data && Array.isArray(res.data)) {
      const formatted = res.data.map((item) => {
        const addr = item.address || {};
        const village = addr.village || addr.suburb || addr.town || addr.city || item.name;
        const district = addr.county || addr.state_district || '';
        const state = addr.state || '';
        const displayName = [village, district, state].filter(Boolean).join(', ');

        return {
          id: item.place_id,
          name: village,
          displayName: displayName || item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          type: item.type || item.addresstype || 'place',
          importance: item.importance,
        };
      });

      geoCache.set(cacheKey, formatted);
      return formatted;
    }
  } catch (err) {
    console.warn('OpenStreetMap Nominatim search error:', err.message);
  }

  // Fallback to Open-Meteo Geocoder if OSM is busy
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const geoRes = await axios.get(geoUrl, { timeout: 4000 });
    if (geoRes.data && geoRes.data.results) {
      return geoRes.data.results.map((r) => ({
        id: r.id,
        name: r.name,
        displayName: `${r.name}${r.admin2 ? ', ' + r.admin2 : ''}${r.admin1 ? ', ' + r.admin1 : ''}, India`,
        lat: r.latitude,
        lon: r.longitude,
        type: 'place',
      }));
    }
  } catch (e) {
    // handled
  }

  return [];
}

// 2. OpenStreetMap (OSM Nominatim) Reverse Geocoding for GPS detection
async function reverseGeocodeOSM(lat, lon) {
  if (!lat || !lon) return null;
  const cacheKey = `rev_${Number(lat).toFixed(3)}_${Number(lon).toFixed(3)}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'TaapChetna-HeatIntelligence/2.0 (OpenStreetMap + Open-Meteo Integration)',
      },
      timeout: 5000,
    });

    if (res.data) {
      const addr = res.data.address || {};
      const village = addr.village || addr.suburb || addr.town || addr.city || addr.hamlet || addr.county || 'Detected Location';
      const district = addr.county || addr.state_district || '';
      const state = addr.state || '';
      const displayName = [village, district, state].filter(Boolean).join(', ') || res.data.display_name;

      const result = {
        name: village,
        displayName,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        type: 'gps_detected',
      };
      geoCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn('Reverse geocode OSM error:', err.message);
  }

  return {
    name: 'Detected Location',
    displayName: `Location (${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E)`,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    type: 'gps_detected',
  };
}

async function fetchLiveWeatherByCoords(lat, lon, locationName = 'Your Location') {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature&forecast_days=1&timezone=auto`;
    const weatherRes = await axios.get(weatherUrl, { timeout: 5000 });
    const current = weatherRes.data?.current;

    if (current) {
      const temp = Math.round(current.temperature_2m * 10) / 10;
      const humidity = Math.round(current.relative_humidity_2m);
      const apparentTemp = Math.round(current.apparent_temperature * 10) / 10;
      const heatIndex = computeHeatIndex(temp, humidity);
      const wetBulb = computeWetBulb(temp, humidity);
      const riskLevel = getRiskLevel(heatIndex);
      const condition = getConditionFromWeatherCode(current.weather_code, temp);

      const liveData = {
        location: locationName,
        lat,
        lon,
        isLive: true,
        isFallback: false,
        source: 'Open-Meteo Live Satellite Telemetry',
        osmSource: 'OpenStreetMap Ground Coordinates',
        timestamp: new Date().toISOString(),
        temperature: temp,
        humidity,
        windSpeed: current.wind_speed_10m || 8,
        apparentTemperature: apparentTemp,
        heatIndex,
        wetBulb,
        condition,
        riskLevel,
        message: getRiskMessage(riskLevel),
        hourly: weatherRes.data?.hourly || null,
      };

      weatherCache.set(cacheKey, { timestamp: Date.now(), data: liveData });
      return liveData;
    }
  } catch (err) {
    console.warn(`Open-Meteo fetch failed for coords ${lat}, ${lon}:`, err.message);
  }

  // Calibrated simulation fallback
  return getSimulatedWeather(locationName, lat, lon);
}

// Location string based fetch (calls searchPlacesOSM first to get precise OSM coords)
async function fetchLiveWeather(locationName, coords = null) {
  if (coords && coords.lat && coords.lon) {
    return await fetchLiveWeatherByCoords(coords.lat, coords.lon, locationName);
  }

  const cleanName = locationName ? locationName.split(',')[0].trim() : 'Kolkata';

  // 1. Resolve OSM Coordinates
  const places = await searchPlacesOSM(cleanName);
  let lat = 22.57;
  let lon = 88.36;
  let resolvedDisplayName = locationName;

  if (places.length > 0) {
    lat = places[0].lat;
    lon = places[0].lon;
    resolvedDisplayName = places[0].displayName || locationName;
  }

  return await fetchLiveWeatherByCoords(lat, lon, resolvedDisplayName);
}

function getSimulatedWeather(location, lat = 22.57, lon = 88.36) {
  const now = new Date();
  const hour = now.getHours();
  const tempOffset = hour >= 13 && hour <= 15 ? 4 : hour >= 5 && hour <= 7 ? -4 : 0;
  const temp = Math.round((33 + tempOffset) * 10) / 10;
  const humidity = 68;
  const heatIndex = computeHeatIndex(temp, humidity);
  const wetBulb = computeWetBulb(temp, humidity);
  const riskLevel = getRiskLevel(heatIndex);

  return {
    location,
    lat,
    lon,
    isLive: false,
    isFallback: true,
    source: 'Calibrated Indian Meteorological Simulation',
    timestamp: now.toISOString(),
    temperature: temp,
    humidity,
    windSpeed: 10,
    apparentTemperature: heatIndex,
    heatIndex,
    wetBulb,
    condition: 'Warm & Humid',
    riskLevel,
    message: getRiskMessage(riskLevel),
  };
}

async function getCurrentWeather(location, coords = null) {
  return await fetchLiveWeather(location, coords);
}

async function getHourlyForecast(location, coords = null) {
  const live = await fetchLiveWeather(location, coords);
  const hours = [];
  const now = new Date();
  const currentHour = now.getHours();

  for (let i = 0; i < 12; i++) {
    const h = (currentHour + i) % 24;
    let temp = live.temperature;
    let humidity = live.humidity;

    if (live.hourly && live.hourly.temperature_2m && live.hourly.temperature_2m[h] !== undefined) {
      temp = Math.round(live.hourly.temperature_2m[h] * 10) / 10;
      humidity = Math.round(live.hourly.relative_humidity_2m[h] || live.humidity);
    } else {
      const offset = (h >= 13 && h <= 15) ? 3 : (h >= 4 && h <= 7) ? -4 : 0;
      temp = Math.round((live.temperature + offset) * 10) / 10;
    }

    const heatIndex = computeHeatIndex(temp, humidity);
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    const riskLevel = getRiskLevel(heatIndex);

    hours.push({
      hour: h,
      label,
      temp,
      humidity,
      heatIndex,
      riskLevel,
      message: getRiskMessage(riskLevel),
    });
  }

  return hours;
}

async function compareLocations(fromLocation, toLocation, fromCoords = null, toCoords = null) {
  const [from, to] = await Promise.all([
    fetchLiveWeather(fromLocation, fromCoords),
    fetchLiveWeather(toLocation, toCoords),
  ]);

  const tempDiff = Math.round((to.temperature - from.temperature) * 10) / 10;
  const humidDiff = Math.round((to.humidity - from.humidity) * 10) / 10;
  const hiDiff = Math.round((to.heatIndex - from.heatIndex) * 10) / 10;

  let transitionRisk = 'LOW';
  if (Math.abs(hiDiff) >= 14 || Math.abs(tempDiff) >= 12) transitionRisk = 'HIGH';
  else if (Math.abs(hiDiff) >= 8 || Math.abs(tempDiff) >= 7) transitionRisk = 'ELEVATED';
  else if (Math.abs(hiDiff) >= 4 || Math.abs(tempDiff) >= 4) transitionRisk = 'MODERATE';

  let transitionMessage = '';
  if (hiDiff > 8) {
    transitionMessage = `Destination is significantly warmer (+${hiDiff}°C heat index) than departure. Acclimatization lag expected on arrival.`;
  } else if (hiDiff > 3) {
    transitionMessage = `Destination is moderately warmer (+${hiDiff}°C). Stay well hydrated during the journey.`;
  } else if (hiDiff < -3) {
    transitionMessage = `Destination is cooler (${hiDiff}°C difference). Transition should feel refreshing.`;
  } else {
    transitionMessage = 'Departure and arrival destinations share very similar ambient thermal profiles.';
  }

  return {
    from,
    to,
    tempDiff,
    humidDiff,
    hiDiff,
    transitionRisk,
    transitionMessage,
  };
}

// 5. Evaluate time windows for What-If planner based on hourly forecast telemetry
async function evaluateTimeSlots(location, slotHours = [8, 14, 18], coords = null) {
  const live = await fetchLiveWeather(location, coords);

  const evaluatedSlots = slotHours.map((slot) => {
    let hour = typeof slot === 'number' ? slot : parseInt(slot, 10);
    if (isNaN(hour)) hour = 12;
    hour = ((hour % 24) + 24) % 24;

    let temp = live.temperature;
    let humidity = live.humidity;

    if (live.hourly && live.hourly.temperature_2m && live.hourly.temperature_2m[hour] !== undefined) {
      temp = Math.round(live.hourly.temperature_2m[hour] * 10) / 10;
      humidity = Math.round(live.hourly.relative_humidity_2m?.[hour] || live.humidity);
    } else {
      const offset = (hour >= 13 && hour <= 15) ? 4 : (hour >= 4 && hour <= 7) ? -4 : (hour >= 10 && hour <= 12) ? 2 : 0;
      temp = Math.round((live.temperature + offset) * 10) / 10;
    }

    const heatIndex = computeHeatIndex(temp, humidity);
    const wetBulb = computeWetBulb(temp, humidity);
    const riskLevel = getRiskLevel(heatIndex);
    const label = hour === 0 ? '12:00 AM' : hour < 12 ? `${String(hour).padStart(2, '0')}:00 AM` : hour === 12 ? '12:00 PM' : `${String(hour - 12).padStart(2, '0')}:00 PM`;

    return {
      hour,
      time: label,
      temp,
      humidity,
      heatIndex,
      wetBulb,
      riskLevel,
      risk: riskLevel,
      message: getRiskMessage(riskLevel),
    };
  });

  const recommendedSlot = evaluatedSlots.reduce((best, curr) => (curr.heatIndex < best.heatIndex ? curr : best), evaluatedSlots[0]);

  return {
    location: live.location || location,
    isLive: live.isLive,
    isFallback: live.isFallback ?? !live.isLive,
    source: live.source,
    timestamp: new Date().toISOString(),
    slots: evaluatedSlots,
    recommended: recommendedSlot,
    recommendedSlot,
  };
}

module.exports = {
  searchPlacesOSM,
  reverseGeocodeOSM,
  getCurrentWeather,
  getHourlyForecast,
  compareLocations,
  evaluateTimeSlots,
  computeHeatIndex,
  computeWetBulb,
  getRiskLevel,
  getRiskMessage,
};
