// server/controllers/authorityController.js
const asyncHandler = require('express-async-handler');
const Alert = require('../models/Alert');
const Ward = require('../models/Ward');
const weatherService = require('../services/weatherService');
const heatBurdenService = require('../services/heatBurdenService');

// Fallback wards definition with clear fallback flag if database has no records
const FALLBACK_WARDS = [
  { wardNumber: 'Ward 17', municipality: 'Kolkata Municipal Corporation', riskLevel: 'EXTREME', populationExposure: 'HIGH', outdoorWorkerExposure: 'HIGH', isFallback: true },
  { wardNumber: 'Ward 18', municipality: 'Kolkata Municipal Corporation', riskLevel: 'HIGH', populationExposure: 'MODERATE', outdoorWorkerExposure: 'HIGH', isFallback: true },
  { wardNumber: 'Ward 19', municipality: 'Kolkata Municipal Corporation', riskLevel: 'MODERATE', populationExposure: 'LOW', outdoorWorkerExposure: 'MODERATE', isFallback: true },
  { wardNumber: 'Ward 20', municipality: 'Kolkata Municipal Corporation', riskLevel: 'LOW', populationExposure: 'LOW', outdoorWorkerExposure: 'LOW', isFallback: true },
  { wardNumber: 'Ward 21', municipality: 'Kolkata Municipal Corporation', riskLevel: 'HIGH', populationExposure: 'HIGH', outdoorWorkerExposure: 'MODERATE', isFallback: true },
  { wardNumber: 'Ward 22', municipality: 'Kolkata Municipal Corporation', riskLevel: 'MODERATE', populationExposure: 'MODERATE', outdoorWorkerExposure: 'LOW', isFallback: true },
  { wardNumber: 'Ward 23', municipality: 'Kolkata Municipal Corporation', riskLevel: 'ELEVATED', populationExposure: 'MODERATE', outdoorWorkerExposure: 'HIGH', isFallback: true },
  { wardNumber: 'Ward 24', municipality: 'Kolkata Municipal Corporation', riskLevel: 'HIGH', populationExposure: 'HIGH', outdoorWorkerExposure: 'HIGH', isFallback: true },
];

const getDashboard = asyncHandler(async (req, res) => {
  const municipality = req.user?.municipality || 'Kolkata Municipal Corporation';
  const officer = req.user?.name || 'Municipal Officer';
  
  // Await the async weather fetch
  const locQuery = municipality.includes('Kolkata') ? 'Kolkata' : municipality;
  const currentWeather = await weatherService.getCurrentWeather(locQuery);

  // Fetch active alerts from database
  const activeAlerts = await Alert.find({ 
    $or: [{ municipality }, { municipality: 'Kolkata Municipal Corporation' }],
    status: 'ACTIVE' 
  }).sort('-createdAt').limit(10);

  // Fetch wards from DB, fallback to structured defaults if collection is empty
  let wards = await Ward.find({ municipality });
  if (!wards || wards.length === 0) {
    wards = await Ward.find({});
  }
  const wardData = (wards && wards.length > 0) ? wards : FALLBACK_WARDS;

  // Resolve state and fetch historical heat-health burden estimate from ML service
  const state = heatBurdenService.resolveStateFromMunicipality(municipality);
  const heatHealthBurden = await heatBurdenService.getHeatHealthBurden(state, 2024, currentWeather);

  res.json({
    municipality,
    officer,
    state,
    currentSituation: currentWeather.riskLevel,
    currentMessage: currentWeather.message,
    weather: currentWeather,
    wards: wardData,
    activeAlerts,
    heatHealthBurden,
  });
});

const getWards = asyncHandler(async (req, res) => {
  const municipality = req.query.municipality || req.user?.municipality;
  const query = municipality ? { municipality } : {};
  let wards = await Ward.find(query);
  if (!wards || wards.length === 0) {
    wards = await Ward.find({});
  }
  res.json((wards && wards.length > 0) ? wards : FALLBACK_WARDS);
});

const getAlerts = asyncHandler(async (req, res) => {
  const municipality = req.user?.municipality || req.query.municipality;
  const query = municipality ? { municipality } : {};
  const alerts = await Alert.find(query).sort('-createdAt');
  res.json(alerts);
});

const createAlert = asyncHandler(async (req, res) => {
  const { ward, riskLevel, message, actions } = req.body;
  const municipality = req.user?.municipality || 'Kolkata Municipal Corporation';
  const alert = await Alert.create({
    ward,
    municipality,
    riskLevel,
    status: 'ACTIVE',
    issuedBy: req.user?._id,
    message,
    actions: actions || [],
  });
  res.status(201).json(alert);
});

const updateAlert = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, actions } = req.body;
  const alert = await Alert.findByIdAndUpdate(id, { status, actions }, { new: true });
  if (!alert) return res.status(404).json({ message: 'Alert not found' });
  res.json(alert);
});

const getRecommendations = asyncHandler(async (req, res) => {
  const { ward, riskLevel } = req.query;
  const recommendations = {
    EXTREME: [
      'Activate cooling centres immediately',
      'Increase drinking-water availability in public areas',
      'Issue public heat awareness advisory',
      'Alert nearby health facilities for potential heat-related cases',
      'Reduce prolonged outdoor exposure for field personnel',
      'Deploy mobile awareness units in high-density zones',
    ],
    HIGH: [
      'Consider activating cooling centres',
      'Increase water distribution points',
      'Issue area-specific heat advisory',
      'Notify health facilities',
      'Prioritize high-exposure populations',
    ],
    ELEVATED: [
      'Monitor conditions closely',
      'Ensure water availability',
      'Prepare advisory communications',
      'Brief field staff on heat precautions',
    ],
    MODERATE: [
      'Continue routine monitoring',
      'Maintain standard water distribution',
    ],
    LOW: [
      'No special interventions required',
      'Continue standard operations',
    ],
  };
  res.json({
    ward: ward || 'All Wards',
    riskLevel: riskLevel || 'MODERATE',
    recommendations: recommendations[riskLevel] || recommendations.MODERATE,
  });
});

const getHeatHealthBurden = asyncHandler(async (req, res) => {
  const municipality = req.query.municipality || req.user?.municipality || 'Kolkata Municipal Corporation';
  const state = req.query.state || heatBurdenService.resolveStateFromMunicipality(municipality);
  const year = parseInt(req.query.year) || 2024;
  
  const burden = await heatBurdenService.getHeatHealthBurden(state, year);
  res.json(burden);
});

module.exports = {
  getDashboard,
  getWards,
  getAlerts,
  createAlert,
  updateAlert,
  getRecommendations,
  getHeatHealthBurden,
};
