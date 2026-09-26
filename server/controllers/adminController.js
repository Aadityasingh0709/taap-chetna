// server/controllers/adminController.js
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const AuthorityRequest = require('../models/AuthorityRequest');

const getRequests = asyncHandler(async (req, res) => {
  const requests = await AuthorityRequest.find().sort('-createdAt');
  res.json(requests);
});

const approveRequest = asyncHandler(async (req, res) => {
  const request = await AuthorityRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });

  // Generate secure temporary password
  const tempPassword = `Officer#${crypto.randomBytes(3).toString('hex')}!`;

  // Note: User.pre('save') hook handles hashing, pass plain text password here
  const user = await User.create({
    name: request.name,
    email: `${request.officialId.toLowerCase().replace(/[^a-z0-9]/g, '')}@authority.tapchetna.gov.in`,
    password: tempPassword,
    role: 'MUNICIPAL_OFFICER',
    municipality: request.municipality,
    ward: request.ward,
  });

  request.status = 'APPROVED';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();

  res.json({
    message: 'Authority approved successfully',
    authorityId: request.officialId,
    email: user.email,
    temporaryPassword: tempPassword,
    userId: user._id,
  });
});

const rejectRequest = asyncHandler(async (req, res) => {
  const request = await AuthorityRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  request.status = 'REJECTED';
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();
  await request.save();
  res.json({ message: 'Authority request rejected' });
});

const getAuthorities = asyncHandler(async (req, res) => {
  const authorities = await User.find({ role: 'MUNICIPAL_OFFICER' }).select('-password');
  res.json(authorities);
});

const updateAuthority = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body; // e.g. { ward, municipality, role }
  const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'Authority not found' });
  res.json(user);
});

const createAuthority = asyncHandler(async (req, res) => {
  const { name, designation, officialId, municipality, ward } = req.body;
  if (!name || !officialId || !municipality || !ward) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  // Generate secure temporary password
  const tempPassword = `Officer#${crypto.randomBytes(3).toString('hex')}!`;
  const email = `${officialId.toLowerCase().replace(/[^a-z0-9]/g, '')}@authority.tapchetna.gov.in`;

  // Note: User.pre('save') hook handles hashing, pass plain text password here
  const user = await User.create({
    name,
    email,
    password: tempPassword,
    role: 'MUNICIPAL_OFFICER',
    municipality,
    ward,
  });

  // Create request record
  await AuthorityRequest.create({
    name,
    designation,
    officialId,
    municipality,
    ward,
    status: 'APPROVED',
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  });

  res.status(201).json({
    message: 'Authority officer created successfully',
    authorityId: officialId,
    email: user.email,
    temporaryPassword: tempPassword,
  });
});

module.exports = { getRequests, approveRequest, rejectRequest, getAuthorities, updateAuthority, createAuthority };
