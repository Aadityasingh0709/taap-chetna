// server/models/WeatherSnapshot.js
const mongoose = require('mongoose');

const weatherSnapshotSchema = new mongoose.Schema({
  location: { type: String, required: true }, // e.g., city name or lat,lng
  timestamp: { type: Date, default: Date.now },
  temperature: Number,
  humidity: Number,
  windSpeed: Number,
  heatIndex: Number,
  riskLevel: { type: String, enum: ['LOW','MODERATE','ELEVATED','HIGH','EXTREME'] },
  rawData: { type: mongoose.Schema.Types.Mixed }, // raw API response for reference
}, { timestamps: true });

module.exports = mongoose.model('WeatherSnapshot', weatherSnapshotSchema);
