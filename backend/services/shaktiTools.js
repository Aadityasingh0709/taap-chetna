/**
 * shaktiTools.js
 * Tool registry and server-side execution engine for Shakti.
 * 
 * Reuses existing verified backend services (weatherService, citizen risk formulas, travel comparisons).
 * Validates all inputs and enforces an explicit allowlist.
 */

const weatherService = require('./weatherService');

const SHAKTI_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Fetch live satellite weather telemetry, ambient temperature, relative humidity, perceived heat index, and wet-bulb temperature for any Indian city or town.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'Name of the city, town, or district in India (e.g., "Kolkata", "Delhi", "Ahmedabad", "Chennai", "Jaipur").',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate_personal_heat_risk',
      description: 'Calculate an evidence-based biological heat vulnerability score (0-100) and personalized hydration target based on citizen demographic and occupational factors.',
      parameters: {
        type: 'object',
        properties: {
          temperature: {
            type: 'number',
            description: 'Ambient air temperature in Celsius (default 34).',
          },
          humidity: {
            type: 'number',
            description: 'Relative humidity percentage (default 65).',
          },
          ageBand: {
            type: 'string',
            enum: ['0-5', '6-17', '18-25', '26-40', '41-60', '60+'],
            description: 'Citizen age demographic band.',
          },
          occupation: {
            type: 'string',
            description: 'Citizen occupation or work type (e.g., "Construction Laborer", "Delivery Rider", "Street Vendor", "Office Worker").',
          },
          exposureHours: {
            type: 'number',
            description: 'Number of daily outdoor hours spent in direct sun/ambient air.',
          },
          healthCondition: {
            type: 'string',
            enum: ['none', 'cardiovascular', 'respiratory', 'diabetes', 'hypertension'],
            description: 'Pre-existing chronic medical condition.',
          },
          livingCondition: {
            type: 'string',
            enum: ['middle_fan', 'tin_roof_uninsulated', 'top_floor_no_ac', 'air_conditioned'],
            description: 'Home housing and thermal envelope.',
          },
          hydrationLiters: {
            type: 'number',
            description: 'Current daily water intake in liters.',
          },
        },
        required: ['temperature', 'humidity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_travel_risk',
      description: 'Analyze thermal transition shock and acclimatization risk when traveling between two Indian locations.',
      parameters: {
        type: 'object',
        properties: {
          fromLocation: {
            type: 'string',
            description: 'Origin city or town in India (e.g., "Kolkata").',
          },
          toLocation: {
            type: 'string',
            description: 'Destination city or town in India (e.g., "Jaipur").',
          },
          travelMode: {
            type: 'string',
            enum: ['bus_non_ac', 'bus_ac', 'train_sleeper', 'train_ac', 'car_cab_ac', 'motorcycle_open'],
            description: 'Transit mode utilized for the journey.',
          },
          travelDate: {
            type: 'string',
            description: 'Optional date of travel in YYYY-MM-DD format.',
          },
        },
        required: ['fromLocation', 'toLocation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'plan_outdoor_activities',
      description: 'Evaluate hourly heat stress across multiple time slots for a given location to identify the safest, lowest-risk window for outdoor activity.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'Indian city or location where activity will occur (e.g., "Lucknow").',
          },
          slots: {
            type: 'array',
            items: { type: 'number' },
            description: 'Hours to evaluate in 24-hour format (e.g., [7, 10, 14, 18]). Defaults to morning, afternoon, and evening.',
          },
          date: {
            type: 'string',
            description: 'Optional date in YYYY-MM-DD format.',
          },
        },
        required: ['location'],
      },
    },
  },
];

/**
 * Execute a validated tool call on the backend using real application services.
 */
async function executeShaktiTool(toolName, rawArgs = {}) {
  // Allowlist validation
  const allowed = SHAKTI_TOOL_DEFINITIONS.some((t) => t.function.name === toolName);
  if (!allowed) {
    return {
      success: false,
      error: `Tool "${toolName}" is not registered in the Shakti tool allowlist.`,
    };
  }

  let args = rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      args = JSON.parse(rawArgs);
    } catch {
      return { success: false, error: 'Malformed tool arguments JSON.' };
    }
  }

  try {
    switch (toolName) {
      case 'get_current_weather': {
        const location = (args.location || '').trim();
        if (!location) {
          return { success: false, error: 'Location name is required for weather check.' };
        }

        const data = await weatherService.getCurrentWeather(location);
        return {
          success: true,
          location: data.location || location,
          temperatureC: data.temperature,
          apparentTemperatureC: data.apparentTemperature,
          humidityPercent: data.humidity,
          heatIndexC: data.heatIndex,
          wetBulbC: data.wetBulb,
          riskLevel: data.riskLevel,
          condition: data.condition,
          source: data.source,
          timestamp: data.timestamp || new Date().toISOString(),
        };
      }

      case 'calculate_personal_heat_risk': {
        const temp = parseFloat(args.temperature) || 34;
        const hum = parseFloat(args.humidity) || 65;
        const heatIndex = weatherService.computeHeatIndex(temp, hum);
        const wetBulb = weatherService.computeWetBulb(temp, hum);

        let score = 25;
        if (heatIndex >= 52) score = 90;
        else if (heatIndex >= 44) score = 75;
        else if (heatIndex >= 38) score = 55;
        else if (heatIndex >= 32) score = 35;
        else score = 20;

        const age = args.ageBand || '26-40';
        if (age === '60+' || age === 'above_60') score += 18;
        else if (age === '0-5') score += 15;
        else if (age === '41-60') score += 8;
        else if (age === '6-17') score += 4;

        const expHours = parseFloat(args.exposureHours) || 4;
        if (expHours > 6) score += 20;
        else if (expHours >= 4) score += 12;
        else if (expHours >= 2) score += 6;

        const health = args.healthCondition || 'none';
        if (health === 'cardiovascular') score += 22;
        else if (health === 'respiratory') score += 18;
        else if (health === 'diabetes') score += 15;
        else if (health === 'hypertension') score += 12;

        const living = args.livingCondition || 'middle_fan';
        if (living.includes('tin')) score += 18;
        else if (living.includes('top_floor')) score += 12;
        else if (living === 'air_conditioned') score -= 15;

        const hydration = parseFloat(args.hydrationLiters) || 2.5;
        if (hydration < 1.8) score += 15;
        else if (hydration < 2.5) score += 5;
        else if (hydration >= 3.5) score -= 8;

        score = Math.max(10, Math.min(100, Math.round(score)));

        let riskLevel = 'LOW';
        if (score >= 80) riskLevel = 'EXTREME';
        else if (score >= 65) riskLevel = 'HIGH';
        else if (score >= 45) riskLevel = 'MODERATE';

        const reqWater = Math.max(3.0, (expHours * 0.4) + 2.0).toFixed(1);

        return {
          success: true,
          score,
          riskLevel,
          heatIndexC: heatIndex,
          wetBulbC: wetBulb,
          recommendedDailyWaterLiters: reqWater,
          workRestRecommendation: score >= 65 ? '45 mins work : 15 mins shaded rest' : 'Standard 10-minute rest every 60 mins',
        };
      }

      case 'check_travel_risk': {
        const fromLoc = (args.fromLocation || '').trim();
        const toLoc = (args.toLocation || '').trim();
        if (!fromLoc || !toLoc) {
          return { success: false, error: 'Both fromLocation and toLocation are required.' };
        }

        const comp = await weatherService.compareLocations(fromLoc, toLoc, null, null, args.travelDate);
        return {
          success: true,
          from: comp.from,
          to: comp.to,
          tempDifferenceC: comp.tempDiff,
          heatIndexDifferenceC: comp.heatIndexDiff,
          transitionRisk: comp.transitionRisk,
          travelMode: args.travelMode || 'transit',
          keyGuidance: comp.transitionRisk === 'HIGH' || comp.transitionRisk === 'ELEVATED'
            ? 'High thermal shock: destination is substantially hotter. Allow 3-4 days for acclimatization and carry continuous hydration.'
            : 'Moderate thermal delta: maintain regular hydration and avoid midday exertion upon arrival.',
        };
      }

      case 'plan_outdoor_activities': {
        const loc = (args.location || '').trim();
        if (!loc) {
          return { success: false, error: 'Location is required for activity planning.' };
        }

        const slotHours = (Array.isArray(args.slots) && args.slots.length > 0) ? args.slots : [7, 10, 14, 18];
        const result = await weatherService.evaluateTimeSlots(loc, slotHours, null, args.date);

        return {
          success: true,
          location: result.location,
          targetDate: result.targetDate,
          evaluatedSlots: result.slots.map((s) => ({
            time: s.time,
            temperatureC: s.temp,
            heatIndexC: s.heatIndex,
            riskLevel: s.riskLevel,
          })),
          recommendedBestSlot: {
            time: result.recommended?.time,
            heatIndexC: result.recommended?.heatIndex,
            riskLevel: result.recommended?.riskLevel,
          },
        };
      }

      default:
        return { success: false, error: `Unhandled tool: ${toolName}` };
    }
  } catch (err) {
    console.error(`[ShaktiToolError] Failed executing ${toolName}:`, err.message);
    return {
      success: false,
      error: `Could not retrieve live data for ${toolName}: ${err.message}`,
    };
  }
}

module.exports = {
  SHAKTI_TOOL_DEFINITIONS,
  executeShaktiTool,
};
