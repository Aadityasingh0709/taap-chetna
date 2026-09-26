// server/routes/admin.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { getRequests, approveRequest, rejectRequest, getAuthorities, updateAuthority, createAuthority } = require('../controllers/adminController');

const router = express.Router();

router.get('/requests', protect, authorize(['SYSTEM_ADMIN']), getRequests);
router.post('/requests/:id/approve', protect, authorize(['SYSTEM_ADMIN']), approveRequest);
router.post('/requests/:id/reject', protect, authorize(['SYSTEM_ADMIN']), rejectRequest);
router.get('/authorities', protect, authorize(['SYSTEM_ADMIN']), getAuthorities);
router.patch('/authorities/:id', protect, authorize(['SYSTEM_ADMIN']), updateAuthority);
router.post('/authorities', protect, authorize(['SYSTEM_ADMIN']), createAuthority);

module.exports = router;
