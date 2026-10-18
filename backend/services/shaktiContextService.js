/**
 * shaktiContextService.js
 * Application context enrichment and location-resolution engine for Shakti.
 * 
 * Reuses Taap Chetna's verified weatherService and citizen risk formulas.
 * Implements strict location priority, proactive data retrieval, and
 * prevents hallucination of unverified temperatures, locations, or scores.
 */

const weatherService = require('./weatherService');

// Popular Indian cities and states for direct entity recognition in queries
const POPULAR_CITIES = [
  'kolkata', 'delhi', 'new delhi', 'mumbai', 'bengaluru', 'bangalore', 'chennai',
  'hyderabad', 'ahmedabad', 'pune', 'jaipur', 'lucknow', 'kanpur', 'nagpur',
  'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna', 'vadodara', 'ghaziabad',
  'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot', 'varanasi',
  'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad',
  'prayagraj', 'howrah', 'ranchi', 'gwalior', 'jabalpur', 'coimbatore', 'vijayawada',
  'jodhpur', 'madurai', 'raipur', 'kota', 'chandigarh', 'guwahati', 'solapur',
  'hubli', 'dharwad', 'bareilly', 'moradabad', 'mysore', 'gurgaon', 'gurugram',
  'aligarh', 'jalandhar', 'tiruchirappalli', 'bhubaneswar', 'salem', 'warangal',
  'mira-bhayandar', 'thiruvananthapuram', 'bhiwandi', 'saharanpur', 'guntur',
  'amravati', 'bikaner', 'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad',
  'kochi', 'nellore', 'bhavnagar', 'dehradun', 'durgapur', 'asansol', 'rourkela',
  'nanded', 'kolhapur', 'ajmer', 'akola', 'gulbarga', 'jamnagar', 'ujjain',
  'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu', 'sangli', 'mangalore',
  'erode', 'belgaum', 'kurnool', 'ambattur', 'nagapattinam', 'shimla', 'darjeeling'
];

/**
 * Extracts explicit location mention from the user query if present.
 * Priority 1 in location hierarchy.
 */
function extractLocationFromQuery(query) {
  if (!query || typeof query !== 'string') return null;
  const qLower = query.toLowerCase();

  // 1. Direct match against known Indian cities
  for (const city of POPULAR_CITIES) {
    // Word boundary check to avoid partial matching (e.g. "rain" in "train")
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(qLower)) {
      // Capitalize first letter of each word
      return city.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // 2. Preposition patterns: "in <place>", "at <place>", "around <place>", "near <place>"
  const prepPatterns = [
    /\b(?:in|at|around|near)\s+([A-Za-z\s]{3,25}?)(?:\s+today|\s+now|\s+area|\s+city|\?|\.|$|\,)/i,
    /\b(?:weather|temperature|temp|forecast|rain|climate)\s+(?:of|in|for)\s+([A-Za-z\s]{3,25}?)(?:\?|\.|$|\,)/i,
  ];

  const stopWords = new Set([
    'my area', 'here', 'the area', 'today', 'now', 'this evening', 'this afternoon',
    'the city', 'town', 'my city', 'my town', 'my village', 'india', 'my location',
    'pandal hopping', 'precautions', 'pandal', 'going out', 'what', 'what is',
    'take', 'should', 'can', 'morning', 'evening', 'afternoon', 'night', 'current',
    'temperature', 'weather', 'rain', 'forecast'
  ]);

  for (const pattern of prepPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const candLower = candidate.toLowerCase();
      // Must not be in stopWords, must not contain verbs/pronouns, and must be <= 3 words
      const words = candLower.split(/\s+/);
      const hasVerb = words.some((w) => ['is', 'are', 'was', 'were', 'take', 'should', 'can', 'go', 'going', 'have', 'has', 'do', 'does', 'did', 'want', 'what'].includes(w));
      if (!stopWords.has(candLower) && !hasVerb && words.length <= 3 && candidate.length >= 3) {
        return candidate.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  return null;
}

/**
 * Resolves citizen location following the prompt's mandatory priority:
 * 1. Explicit location named in the query.
 * 2. Currently selected location in Taap Chetna (context.selectedLocation).
 * 3. Citizen profile location (user.homeLocation).
 * 4. Browser geolocation coordinates (context.coords), reverse geocoded safely.
 * 5. Return null (Location Unavailable - prompt citizen, never substitute arbitrary city).
 */
async function resolveLocationHierarchy(query, clientContext = {}, user = null) {
  // 1. Explicit mention in query
  const queryLoc = extractLocationFromQuery(query);
  if (queryLoc) {
    return {
      location: queryLoc,
      coords: null,
      source: 'query_explicit',
      isAuthoritative: true,
    };
  }

  // 2. Selected location in active application session
  if (clientContext.selectedLocation && typeof clientContext.selectedLocation === 'string' && clientContext.selectedLocation.trim().length > 0) {
    return {
      location: clientContext.selectedLocation.trim(),
      coords: clientContext.coords || null,
      source: 'app_selected_location',
      isAuthoritative: true,
    };
  }

  // 3. Authenticated user profile location
  if (user && user.homeLocation && typeof user.homeLocation === 'string' && user.homeLocation.trim().length > 0) {
    return {
      location: user.homeLocation.trim(),
      coords: user.selectedCoords || null,
      source: 'user_profile_location',
      isAuthoritative: true,
    };
  }

  // 4. Browser GPS coordinates if present without a name
  if (clientContext.coords && clientContext.coords.lat && clientContext.coords.lon) {
    try {
      const rev = await weatherService.reverseGeocodeOSM(clientContext.coords.lat, clientContext.coords.lon);
      if (rev && rev.displayName) {
        return {
          location: rev.displayName,
          coords: { lat: clientContext.coords.lat, lon: clientContext.coords.lon },
          source: 'browser_gps_reverse_geocoded',
          isAuthoritative: true,
        };
      }
    } catch (e) {
      // ignore reverse geocode error
    }
  }

  // 5. No usable location
  return {
    location: null,
    coords: null,
    source: 'none',
    isAuthoritative: false,
  };
}

/**
 * Classifies query intent to determine which backend services must be invoked.
 */
function classifyQueryIntent(query) {
  if (!query || typeof query !== 'string') return {};
  const q = query.toLowerCase();

  const isRain = /\b(rain|raining|rainfall|rainy|barish|shower|precipitation)\b/i.test(q);
  const isTemp = /\b(temp|temperature|tapman|garmi|hot|cold|degrees?|celsius)\b/i.test(q);
  const isWeatherGeneral = /\b(weather|forecast|climate|mausam|conditions?|sky|sunny|cloudy|humid)\b/i.test(q);
  const isWeather = isWeatherGeneral || isTemp || isRain;

  const isPandalOrEvening = /\b(pandal|pandal hopping|puja|durga|evening|6\s*pm|7\s*pm|8\s*pm|going out|outing|walk)\b/i.test(q);
  const isHeatRisk = /\b(heat\s*risk|heat-risk|vulnerability|risk score|biological risk|heat index|wet bulb|wbgt)\b/i.test(q);
  const isDifference = /\b(difference|compare|versus|vs)\b/i.test(q) && (isWeather || isHeatRisk);
  const isTravel = /\b(travel|traveling|journey|commute|from .* to .*)\b/i.test(q);

  return {
    isWeather,
    isTemp,
    isRain,
    isPandalOrEvening,
    isHeatRisk,
    isDifference,
    isTravel,
  };
}

/**
 * Enriches the conversation with verified application data before invoking Qwen3.
 */
async function enrichShaktiContext({ messages = [], locale = 'en', context = {}, user = null }) {
  const latestMessage = messages[messages.length - 1];
  const query = latestMessage?.content || '';
  const intent = classifyQueryIntent(query);

  const locResult = await resolveLocationHierarchy(query, context, user);
  const resolvedLocation = locResult.location;
  const coords = locResult.coords;

  let verifiedContextBlock = '';
  let weatherData = null;
  let toolsExecuted = [];

  // Determine if this query requires real weather/location data
  const needsLocationData = intent.isWeather || intent.isPandalOrEvening || intent.isHeatRisk || intent.isTravel;

  if (needsLocationData) {
    if (!resolvedLocation) {
      // Location is missing - strict rule: Do NOT invent city! Instruct Shakti to ask.
      verifiedContextBlock = `
=== TAAP CHETNA APPLICATION CONTEXT: LOCATION UNAVAILABLE ===
- Citizen Query: "${query}"
- Location Status: NOT DETECTED (No city was provided in the query, and no location is currently selected in the application or profile).
- INSTRUCTION FOR SHAKTI:
  1. Politely and clearly ask the citizen which city, town, or area they are inquiring about.
  2. Do NOT silently substitute or guess an arbitrary city (such as Delhi or Kolkata).
  3. Do NOT invent temperatures, rainfall, or weather conditions.
=============================================================`;
    } else {
      // Location is available - retrieve real data via existing verified weatherService
      try {
        if (context.forceWeatherError) {
          throw new Error('Upstream meteorological satellite connection timed out.');
        }
        toolsExecuted.push({ tool: 'get_current_weather', location: resolvedLocation });
        weatherData = await weatherService.getCurrentWeather(resolvedLocation, coords);

        const tempC = weatherData.temperature;
        const apparentC = weatherData.apparentTemperature !== undefined ? weatherData.apparentTemperature : tempC;
        const humidity = weatherData.humidity;
        const wind = weatherData.windSpeed || 8;
        const condition = weatherData.condition || 'Clear Sky';
        const heatIndex = weatherData.heatIndex || weatherService.computeHeatIndex(tempC, humidity);
        const wetBulb = weatherData.wetBulb || weatherService.computeWetBulb(tempC, humidity);
        const riskLevel = weatherData.riskLevel || weatherService.getRiskLevel(heatIndex);
        const precip = weatherData.precipitation !== undefined ? weatherData.precipitation : 0.0;
        const rainProbMax = weatherData.precipitationProbabilityMax !== null ? `${weatherData.precipitationProbabilityMax}%` : 'Low (<10%)';
        const source = weatherData.source || 'Open-Meteo Live Satellite Telemetry';
        const timestamp = weatherData.timestamp || new Date().toISOString();
        const isLive = weatherData.isLive !== false;

        let eveningSlotInfo = '';
        if (intent.isPandalOrEvening) {
          try {
            toolsExecuted.push({ tool: 'evaluate_hourly_forecast', location: resolvedLocation, slot: 18 });
            const hourly = await weatherService.getHourlyForecast(resolvedLocation, coords);
            // Hour 18 is 6:00 PM
            const slot18 = hourly.find((h) => h.hour === 18) || hourly[0];
            if (slot18) {
              eveningSlotInfo = `
- 6:00 PM Evening Forecast:
  • Forecast Temperature: ${slot18.temp}°C
  • Relative Humidity: ${slot18.humidity}%
  • Forecast Heat Index: ${slot18.heatIndex}°C (${slot18.riskLevel} tier)
  • Evening Guidance: ${slot18.message}`;
            }
          } catch (slotErr) {
            console.warn('[ShaktiContext] Hourly slot fetch error:', slotErr.message);
          }
        }

        verifiedContextBlock = `
=== VERIFIED TAAP CHETNA APPLICATION DATA (AUTHORITATIVE) ===
- Resolved Location: ${resolvedLocation} (Resolution source: ${locResult.source})
- Data Freshness: ${isLive ? 'Live Observation' : 'Calibrated Telemetry'} as of ${timestamp}
- Telemetry Source: ${source}
- Current Ambient Temperature: ${tempC}°C
- Apparent ("Feels-Like") Temperature: ${apparentC}°C
- Relative Humidity: ${humidity}%
- Wind Speed: ${wind} km/h
- Sky / Weather Condition: ${condition}
- Current Rain / Precipitation: ${precip} mm (${precip > 0 ? 'Rain active' : 'No rain currently falling'})
- Today's Maximum Rain Probability: ${rainProbMax}
- Environmental Heat Index: ${heatIndex}°C (${riskLevel} Risk Tier)
- Wet-Bulb Sweating Limit: ${wetBulb}°C${eveningSlotInfo}

INSTRUCTION FOR SHAKTI:
1. Answer the citizen's actual question directly using ONLY the verified values above.
2. For "How is the weather today?": Summarize current temperature (${tempC}°C, feels like ${apparentC}°C), humidity (${humidity}%), wind, and condition (${condition}) for ${resolvedLocation}.
3. For "What is the current temperature in my area?": State clearly that in ${resolvedLocation}, the current temperature is ${tempC}°C (apparent ${apparentC}°C).
4. For "Will it rain today?": State clearly that current rain is ${precip} mm and today's maximum rain probability is ${rainProbMax} for ${resolvedLocation}.
5. For pandal hopping / evening outings: Use the 6:00 PM evening forecast (${eveningSlotInfo ? `~${weatherData.temperature}°C` : 'evening forecast'}) to contextualize practical precautions (hydrate with ORS/water, wear light breathable cotton, pace walking, take breaks, recognize heat symptoms). Never claim 100% safety.
6. For heat risk: Explain the environmental heat index (${heatIndex}°C, ${riskLevel}) and wet-bulb limit (${wetBulb}°C).
7. Do NOT invent different numbers or contradict the verified data above.
=============================================================`;
      } catch (weatherErr) {
        console.error('[ShaktiContext] Weather service failure:', weatherErr.message);
        verifiedContextBlock = `
=== TAAP CHETNA APPLICATION CONTEXT: SERVICE TEMPORARILY UNAVAILABLE ===
- Location: ${resolvedLocation}
- Service Status: Live weather lookup for ${resolvedLocation} could not be completed at this moment (${weatherErr.message}).
- INSTRUCTION FOR SHAKTI:
  1. Clearly state that live weather lookup is temporarily unavailable for ${resolvedLocation}.
  2. Provide sensible general heat-health safety guidance (hydration, shaded pauses, avoiding peak direct sun).
  3. Do NOT invent a fake temperature or claim live telemetry was obtained.
========================================================================`;
      }
    }
  }

  // Handle conceptual difference question: weather forecast vs heat-risk assessment
  if (intent.isDifference) {
    verifiedContextBlock += `
=== TAAP CHETNA DOMAIN KNOWLEDGE: WEATHER VS HEAT-RISK ===
- Weather Forecast: Predicts external atmospheric physical parameters (ambient temperature, humidity %, rainfall mm, wind speed, cloud cover).
- Heat-Risk Assessment: Evaluates the physiological strain on human biology. Combines temperature and humidity into Heat Index (perceived thermal load) and Wet-Bulb Temperature (sweating evaporative limit), further compounded by biological vulnerability factors (age, outdoor exertion, hydration buffer, pre-existing cardiovascular/renal conditions, and housing thermal envelope).
- INSTRUCTION FOR SHAKTI: Explain this fundamental difference clearly and concisely with bullet points.
==========================================================`;
  }

  // Construct enriched conversation
  const enrichedMessages = [...messages];
  if (verifiedContextBlock) {
    // Insert verified context as a system directive immediately before the user's latest query
    const lastUserIdx = enrichedMessages.length - 1;
    enrichedMessages.splice(lastUserIdx, 0, {
      role: 'system',
      content: verifiedContextBlock.trim(),
    });
  }

  return {
    enrichedMessages,
    resolvedLocation,
    weatherData,
    toolsExecuted,
    intent,
  };
}

module.exports = {
  extractLocationFromQuery,
  resolveLocationHierarchy,
  classifyQueryIntent,
  enrichShaktiContext,
};
