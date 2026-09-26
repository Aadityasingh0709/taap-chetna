// server/models/AuthorityRequest.js
const mongoose = require('mongoose');

const authorityRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designation: { type: String },
  officialId: { type: String, required: true },
  municipality: { type: String, required: true },
  ward: { type: String, required: true },
  status: { type: String, enum: ['PENDING','APPROVED','REJECTED'], default: 'PENDING' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AuthorityRequest', authorityRequestSchema);
