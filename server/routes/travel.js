// server/routes/travel.js
const express = require('express');
const { checkTravel } = require('../controllers/travelController');

const router = express.Router();

router.post('/check', checkTravel);

module.exports = router;
