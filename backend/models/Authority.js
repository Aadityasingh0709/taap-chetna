// server/models/Authority.js
const mongoose = require('mongoose');

const authoritySchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String },
  authorityId: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed password
  municipality: { type: String, required: true },
  ward: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'REVOKED'], default: 'PENDING' },
}, { timestamps: true });

module.exports = mongoose.model('Authority', authoritySchema);
