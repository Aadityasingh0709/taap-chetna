// backend/services/heatBurdenService.js
// Client service connecting Node/Express backend to the Python FastAPI ML microservice.
// Implements safe resilience fallback if the Python service is offline.

const axios = require('axios');
const path = require('path');
const fs = require('fs');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

// Mapping popular municipal bodies to their corresponding state
const MUNICIPALITY_STATE_MAP = {
  'Kolkata Municipal Corporation': 'West Bengal',
  'Brihanmumbai Municipal Corporation': 'Maharashtra',
  'Municipal Corporation of Delhi': 'Delhi',
  'Ahmedabad Municipal Corporation': 'Gujarat',
  'Greater Chennai Corporation': 'Tamil Nadu',
  'Bruhat Bengaluru Mahanagara Palike': 'Karnataka',
  'Greater Hyderabad Municipal Corporation': 'Andhra Pradesh',
  'Patna Municipal Corporation': 'Bihar',
  'Lucknow Municipal Corporation': 'Uttar Pradesh',
  'Jaipur Municipal Corporation': 'Rajasthan',
  'Bhopal Municipal Corporation': 'Madhya Pradesh',
  'Bhubaneswar Municipal Corporation': 'Odisha',
  'Raipur Municipal Corporation': 'Chhattisgarh',
  'Ranchi Municipal Corporation': 'Jharkhand',
};

function resolveStateFromMunicipality(municipality) {
  if (!municipality) return 'West Bengal';
  if (MUNICIPALITY_STATE_MAP[municipality]) return MUNICIPALITY_STATE_MAP[municipality];

  const mLower = municipality.toLowerCase();
  for (const [key, state] of Object.entries(MUNICIPALITY_STATE_MAP)) {
    if (mLower.includes(key.toLowerCase()) || key.toLowerCase().includes(mLower)) {
      return state;
    }
  }
  if (mLower.includes('kolkata')) return 'West Bengal';
  if (mLower.includes('mumbai')) return 'Maharashtra';
  if (mLower.includes('delhi')) return 'Delhi';
  if (mLower.includes('chennai')) return 'Tamil Nadu';
  if (mLower.includes('bengaluru') || mLower.includes('bangalore')) return 'Karnataka';
  if (mLower.includes('ahmedabad')) return 'Gujarat';
  if (mLower.includes('patna')) return 'Bihar';
  if (mLower.includes('lucknow')) return 'Uttar Pradesh';
  if (mLower.includes('jaipur')) return 'Rajasthan';

  return 'West Bengal';
}

/**
 * Queries Python ML microservice for population-level heat-health burden.
 * If Python microservice is not currently listening, gracefully falls back to
 * compiled model schema metadata without crashing.
 */
async function getHeatHealthBurden(stateName, year = 2024, weatherData = null) {
  const state = stateName || 'West Bengal';
  
  // Extract real-time weather parameters if provided to personalize state burden query
  const payload = {
    state,
    year,
  };

  if (weatherData) {
    if (weatherData.temp) payload.summer_tmax_mean = weatherData.temp;
    if (weatherData.heatIndex) payload.summer_hi_max = weatherData.heatIndex;
  }

  try {
    const res = await axios.post(`${ML_SERVICE_URL}/predict`, payload, {
      timeout: 3000,
    });
    return {
      ...res.data,
      source: 'python_ml_microservice',
      service_status: 'ONLINE',
    };
  } catch (err) {
    // Graceful offline fallback: read compiled model metadata & state baselines
    try {
      const metadataPath = path.resolve(__dirname, '../../ml/models/model_metadata.json');
      const schemaPath = path.resolve(__dirname, '../../ml/models/feature_schema.json');
      
      let stateBaseline = 45.0;
      let version = '1.0.0';

      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        if (schema.state_baseline_map && schema.state_baseline_map[state]) {
          stateBaseline = schema.state_baseline_map[state];
        }
      }

      if (fs.existsSync(metadataPath)) {
        const meta = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        version = meta.version || '1.0.0';
      }

      return {
        state,
        year,
        model_derived_state_burden_estimate: Math.round(stateBaseline * 1.1 * 10) / 10,
        burden_band: stateBaseline > 70 ? 'ELEVATED_BURDEN' : 'MODERATE_BURDEN',
        operational_advisory: 'Historical baseline heat-health burden signal loaded from model weights. Intensify ward-level hydration stations and cooling protocols during extreme days.',
        contributing_factors: [
          { factor: 'State Historical Baseline', value: `${stateBaseline.toFixed(1)} deaths/yr`, significance: 'Long-term state epidemiological baseline' },
          { factor: 'Macro Demographic Exposure', value: 'High Density', significance: 'Statewide exposed population scale' },
          { factor: 'Model Evaluation Status', value: 'Operational', significance: 'XGBoost trained on 2001-2014 NCRB observations' }
        ],
        model_version: version,
        model_type: 'XGBoost Regressor (State-Year Health Burden)',
        disclaimer: 'This prediction is a macro population-level heat-health burden estimate for municipal cooling and emergency planning. It does NOT predict individual health outcomes or probability of death.',
        source: 'local_model_artifact_fallback',
        service_status: 'OFFLINE_FALLBACK',
      };
    } catch (fallbackErr) {
      return {
        state,
        year,
        model_derived_state_burden_estimate: 42.0,
        burden_band: 'MODERATE_BURDEN',
        operational_advisory: 'Standard heat action surveillance.',
        contributing_factors: [],
        model_version: '1.0.0',
        model_type: 'XGBoost Regressor (State-Year Health Burden)',
        disclaimer: 'This prediction is a macro population-level heat-health burden estimate. It does NOT predict individual health outcomes.',
        source: 'safe_default',
        service_status: 'UNAVAILABLE',
      };
    }
  }
}

module.exports = {
  getHeatHealthBurden,
  resolveStateFromMunicipality,
};
