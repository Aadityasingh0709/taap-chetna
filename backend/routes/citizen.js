// server/routes/citizen.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getProfile, updateProfile, calculateRisk } = require('../controllers/citizenController');

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/calculate-risk', calculateRisk);

module.exports = router;
