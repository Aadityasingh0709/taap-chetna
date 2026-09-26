// server/models/Municipality.js
const mongoose = require('mongoose');

const municipalitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  state: { type: String },
  // other metadata as needed
}, { timestamps: true });

module.exports = mongoose.model('Municipality', municipalitySchema);
