// server/models/Alert.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  ward: { type: String, required: true },
  municipality: { type: String, required: true },
  riskLevel: { type: String, enum: ['LOW','MODERATE','ELEVATED','HIGH','EXTREME'], required: true },
  status: { type: String, enum: ['ACTIVE','ACKNOWLEDGED','ESCALATED','RESOLVED'], default: 'ACTIVE' },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String },
  actions: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
