// server/models/TravelPlan.js
const mongoose = require('mongoose');

const travelPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromLocation: { type: String, required: true },
  toLocation: { type: String, required: true },
  travelDate: { type: Date, required: true },
  activity: { type: String },
  durationHours: { type: Number },
  riskLevel: { type: String, enum: ['LOW','MODERATE','ELEVATED','HIGH','EXTREME'] },
}, { timestamps: true });

module.exports = mongoose.model('TravelPlan', travelPlanSchema);
