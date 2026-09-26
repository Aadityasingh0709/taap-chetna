// server/models/Ward.js
const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema({
  wardNumber: { type: String, required: true },
  municipality: { type: String, required: true },
  riskLevel: { type: String, enum: ['LOW','MODERATE','ELEVATED','HIGH','EXTREME'], default: 'LOW' },
  populationExposure: { type: String },
  // geometry placeholder for GIS (GeoJSON)
  geometry: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Ward', wardSchema);
