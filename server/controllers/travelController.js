// server/controllers/travelController.js
const asyncHandler = require('express-async-handler');
const weatherService = require('../services/weatherService');

const checkTravel = asyncHandler(async (req, res) => {
  const { fromLocation, toLocation, travelDate, travelMode, durationHours } = req.body;
  if (!fromLocation || !toLocation) {
    return res.status(400).json({ message: 'Please provide from and to locations' });
  }
  const comparison = await weatherService.compareLocations(fromLocation, toLocation);

  const precautions = [];
  if (comparison.transitionRisk === 'HIGH' || comparison.transitionRisk === 'ELEVATED') {
    precautions.push('Stay hydrated — drink oral rehydration salts (ORS) or electrolyte water frequently');
    precautions.push('Take cooling pauses upon arrival before engaging in heavy physical outdoor work');
    precautions.push('Limit unshaded outdoor exposure during midday hours (11:30 AM — 3:30 PM)');
    precautions.push('Allow 2-3 days for biological heat acclimatization');
  } else if (comparison.transitionRisk === 'MODERATE') {
    precautions.push('Carry a refillable water bottle and wear loose, breathable cotton');
    precautions.push('Plan outdoor transit during cooler morning or evening hours');
  } else {
    precautions.push('Thermal conditions are comparable — standard daily precautions apply');
  }

  res.json({
    ...comparison,
    travelMode: travelMode || 'train_sleeper',
    durationHours: durationHours || 4,
    travelDate: travelDate || new Date().toISOString(),
    precautions,
  });
});

module.exports = { checkTravel };
