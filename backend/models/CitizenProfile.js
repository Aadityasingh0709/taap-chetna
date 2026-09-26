// server/models/CitizenProfile.js
const mongoose = require('mongoose');

const citizenProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ageBand: { type: String, default: '26-40' },
  homeLocation: { type: String, default: 'Kolkata' },
  typicalOutdoorExposure: { type: String, default: 'moderate' },
  occupation: { type: String, default: 'Citizen' },
  recentExposure: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('CitizenProfile', citizenProfileSchema);
