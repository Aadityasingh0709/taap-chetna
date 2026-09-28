// server/controllers/citizenController.js
const asyncHandler = require('express-async-handler');
const CitizenProfile = require('../models/CitizenProfile');
const User = require('../models/User');
const weatherService = require('../services/weatherService');

// Get citizen profile
const getProfile = asyncHandler(async (req, res) => {
  let profile = await CitizenProfile.findOne({ user: req.user._id }).populate('user', '-password');
  if (!profile) {
    // Auto-create default profile for authenticated user if not existing
    const user = await User.findById(req.user._id);
    profile = await CitizenProfile.create({
      user: req.user._id,
      ageBand: user?.ageBand || '26-40',
      homeLocation: user?.homeLocation || 'Kolkata',
    });
    profile = await CitizenProfile.findById(profile._id).populate('user', '-password');
  }
  res.json(profile);
});

// Update citizen profile
const updateProfile = asyncHandler(async (req, res) => {
  const updates = req.body;
  const profile = await CitizenProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  ).populate('user', '-password');

  // Sync basic User fields if provided
  if (updates.homeLocation || updates.ageBand) {
    await User.findByIdAndUpdate(req.user._id, {
      ...(updates.homeLocation && { homeLocation: updates.homeLocation }),
      ...(updates.ageBand && { ageBand: updates.ageBand }),
    });
  }

  res.json(profile);
});

// Calculate personal physiological heat risk
const calculateRisk = asyncHandler(async (req, res) => {
  const {
    temperature = 32,
    humidity = 65,
    ageBand = '26-40',
    occupation = 'General Citizen',
    exposureHours = 4,
    healthCondition = 'none',
    livingCondition = 'middle_fan',
    hydrationLiters = 2.5,
  } = req.body;

  const tempNum = parseFloat(temperature);
  const humidNum = parseFloat(humidity);

  const heatIndex = weatherService.computeHeatIndex(tempNum, humidNum);
  const wetBulb = weatherService.computeWetBulb(tempNum, humidNum);

  // Baseline risk score from Heat Index (0-100 scale)
  let score = 25;
  if (heatIndex >= 52) score = 90;
  else if (heatIndex >= 44) score = 75;
  else if (heatIndex >= 38) score = 55;
  else if (heatIndex >= 32) score = 35;
  else score = 20;

  // Age factor
  if (ageBand === '60+' || ageBand === 'above_60') score += 18;
  else if (ageBand === '0-5') score += 15;
  else if (ageBand === '41-60') score += 8;
  else if (ageBand === '6-17') score += 4;

  // Exposure hours factor
  const expNum = parseFloat(exposureHours) || 0;
  if (expNum > 6) score += 20;
  else if (expNum >= 4) score += 12;
  else if (expNum >= 2) score += 6;

  // Pre-existing health conditions
  if (['cardiovascular', 'heart_cardio'].includes(healthCondition)) score += 22;
  else if (['respiratory', 'asthma_copd'].includes(healthCondition)) score += 18;
  else if (['diabetes', 'kidney_renal'].includes(healthCondition)) score += 15;
  else if (['hypertension'].includes(healthCondition)) score += 12;

  // Housing / living condition
  if (['no_fan_tin_roof', 'tin_roof_uninsulated', 'slum_informal'].includes(livingCondition)) score += 18;
  else if (['asbestos_tin', 'non_ac_brick'].includes(livingCondition)) score += 10;
  else if (['ac', 'air_conditioned'].includes(livingCondition)) score -= 15;

  // Hydration mitigation
  const hydNum = parseFloat(hydrationLiters) || 0;
  if (hydNum < 1.5) score += 15;
  else if (hydNum < 2.5) score += 5;
  else if (hydNum >= 3.5) score -= 8;

  // Clamp score
  score = Math.max(10, Math.min(100, Math.round(score)));

  let riskLevel = 'LOW';
  if (score >= 80) riskLevel = 'EXTREME';
  else if (score >= 65) riskLevel = 'HIGH';
  else if (score >= 45) riskLevel = 'MODERATE';

  // Actionable tailored recommendations
  const recommendations = [];
  if (expNum > 4) {
    recommendations.push('Mandatory 15-minute shaded rest breaks every 45 minutes of outdoor work.');
  }
  if (hydNum < 3.0) {
    recommendations.push(`Increase fluid intake from ${hydNum}L to at least 3.5L daily, including ORS or lemon-salted water.`);
  }
  if (['60+', 'above_60', '0-5'].includes(ageBand) || healthCondition !== 'none') {
    recommendations.push('High physiological thermal vulnerability: stay indoors between 11:30 AM and 3:30 PM.');
  }
  if (livingCondition.includes('tin') || livingCondition.includes('uninsulated')) {
    recommendations.push('High indoor ambient heat trap: visit designated municipal cooling centers during midday peak.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Thermal risk is well-tolerated. Maintain regular hydration and wear loose cotton attire.');
  }

  res.json({
    score,
    riskLevel,
    heatIndex,
    wetBulb,
    temperature: tempNum,
    humidity: humidNum,
    hydrationTargetLiters: Math.max(3.0, (expNum * 0.4) + 2.0).toFixed(1),
    recommendations,
    timestamp: new Date().toISOString(),
  });
});

module.exports = { getProfile, updateProfile, calculateRisk };
