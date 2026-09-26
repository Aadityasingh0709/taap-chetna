// server/routes/citizen.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getProfile, updateProfile, calculateRisk } = require('../controllers/citizenController');

const router = express.Router();

router.get('/profile', protect, authorize(['CITIZEN']), getProfile);
router.put('/profile', protect, authorize(['CITIZEN']), updateProfile);
router.post('/calculate-risk', calculateRisk);

module.exports = router;
