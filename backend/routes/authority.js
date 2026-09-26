// server/routes/authority.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getDashboard, getWards, getAlerts, createAlert, updateAlert, getRecommendations, getHeatHealthBurden } = require('../controllers/authorityController');

const router = express.Router();

router.get('/dashboard', protect, authorize(['MUNICIPAL_OFFICER']), getDashboard);
router.get('/wards', protect, authorize(['MUNICIPAL_OFFICER']), getWards);
router.get('/alerts', protect, authorize(['MUNICIPAL_OFFICER']), getAlerts);
router.post('/alerts', protect, authorize(['MUNICIPAL_OFFICER']), createAlert);
router.patch('/alerts/:id', protect, authorize(['MUNICIPAL_OFFICER']), updateAlert);
router.get('/recommendations', protect, authorize(['MUNICIPAL_OFFICER']), getRecommendations);
router.get('/heat-health-burden', protect, authorize(['MUNICIPAL_OFFICER']), getHeatHealthBurden);

module.exports = router;
