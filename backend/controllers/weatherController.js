// server/controllers/weatherController.js
const asyncHandler = require('express-async-handler');
const weatherService = require('../services/weatherService');

// GET /api/weather/search?q=Singur
const searchPlaces = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  if (!query || query.trim().length < 2) {
    return res.json([]);
  }
  const results = await weatherService.searchPlacesOSM(query);
  res.json(results);
});

// GET /api/weather/current?location=Kolkata&lat=22.57&lon=88.36&date=2026-10-02
const getCurrent = asyncHandler(async (req, res) => {
  const location = req.query.location || 'Kolkata';
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon ? parseFloat(req.query.lon) : null;
  const date = req.query.date || null;
  const coords = (lat !== null && lon !== null) ? { lat, lon } : null;

  const data = await weatherService.getCurrentWeather(location, coords, date);
  res.json(data);
});

// GET /api/weather/forecast?location=Kolkata&lat=22.57&lon=88.36
const getForecast = asyncHandler(async (req, res) => {
  const location = req.query.location || 'Kolkata';
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon ? parseFloat(req.query.lon) : null;
  const coords = (lat !== null && lon !== null) ? { lat, lon } : null;

  const data = await weatherService.getHourlyForecast(location, coords);
  res.json(data);
});

// GET /api/weather/reverse?lat=22.57&lon=88.36
const reverseGeocode = asyncHandler(async (req, res) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : null;
  const lon = req.query.lon ? parseFloat(req.query.lon) : null;
  if (lat === null || lon === null) {
    return res.status(400).json({ message: 'lat and lon are required' });
  }
  const result = await weatherService.reverseGeocodeOSM(lat, lon);
  res.json(result);
});

module.exports = { searchPlaces, reverseGeocode, getCurrent, getForecast };
