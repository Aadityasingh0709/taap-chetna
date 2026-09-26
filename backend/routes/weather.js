// server/routes/weather.js
const express = require('express');
const { searchPlaces, reverseGeocode, getCurrent, getForecast } = require('../controllers/weatherController');

const router = express.Router();

router.get('/search', searchPlaces);
router.get('/reverse', reverseGeocode);
router.get('/current', getCurrent);
router.get('/forecast', getForecast);

module.exports = router;
