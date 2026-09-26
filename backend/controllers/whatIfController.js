// server/controllers/whatIfController.js
const asyncHandler = require('express-async-handler');
const weatherService = require('../services/weatherService');

const compareSlots = asyncHandler(async (req, res) => {
  const { location, activity, date, durationHours, slots, coords } = req.body;
  const loc = location || 'Delhi';
  // Default slots: 8 AM, 2 PM, 6 PM
  const slotHours = (slots && slots.length > 0) ? slots : [8, 14, 18];
  
  const result = await weatherService.evaluateTimeSlots(loc, slotHours, coords);
  
  res.json({
    activity: activity || 'Outdoor Activity',
    date: date || new Date().toISOString().split('T')[0],
    durationHours: durationHours || 1,
    ...result,
  });
});

module.exports = { compareSlots };
