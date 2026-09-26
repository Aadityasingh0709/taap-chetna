// server/routes/whatif.js
const express = require('express');
const { compareSlots } = require('../controllers/whatIfController');

const router = express.Router();

router.post('/compare', compareSlots);

module.exports = router;
