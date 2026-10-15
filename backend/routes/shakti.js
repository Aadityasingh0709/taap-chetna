// server/routes/shakti.js
const express = require('express');
const { chat, getStatus } = require('../controllers/shaktiController');

const router = express.Router();

router.get('/status', getStatus);
router.post('/chat', chat);

module.exports = router;
