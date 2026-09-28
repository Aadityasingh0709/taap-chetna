// server/models/CitizenProfile.js
const mongoose = require('mongoose');

const citizenProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  ageBand: { type: String, default: '26-40' },
  homeLocation: { type: String, default: 'Kolkata' },
  selectedCoords: {
    lat: { type: Number },
    lon: { type: Number },
  },
  typicalOutdoorExposure: { type: String, default: 'moderate' },
  occupation: { type: String, default: 'General Citizen' },
  exposureHours: { type: Number, default: 4 },
  healthCondition: { type: String, default: 'none' },
  livingCondition: { type: String, default: 'middle_fan' },
  hydrationLiters: { type: Number, default: 2.8 },
  vulnerabilityScore: { type: Number, default: 25 },
  recentExposure: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('CitizenProfile', citizenProfileSchema);
