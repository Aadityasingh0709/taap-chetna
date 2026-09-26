// server/controllers/authController.js
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CitizenProfile = require('../models/CitizenProfile');

// Generate JWT — requires JWT_SECRET in .env (no hardcoded fallback)
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables.');
  }
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register new citizen
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { 
    name, 
    email, 
    password, 
    ageBand, 
    homeLocation, 
    typicalOutdoorExposure, 
    occupation 
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide full name, email, and password.' });
  }

  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    return res.status(400).json({ message: 'An account with this email address already exists.' });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'CITIZEN',
    ageBand: ageBand || '26-40',
    homeLocation: homeLocation || 'Kolkata',
  });

  // Create associated profile record
  await CitizenProfile.create({
    user: user._id,
    ageBand: ageBand || '26-40',
    homeLocation: homeLocation || 'Kolkata',
    typicalOutdoorExposure: typicalOutdoorExposure || 'moderate',
    occupation: occupation || 'General Citizen',
  });

  const token = generateToken(user._id, user.role);

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      homeLocation: user.homeLocation,
      ageBand: user.ageBand,
      occupation: occupation || 'General Citizen',
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password.' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id, user.role);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        municipality: user.municipality,
        ward: user.ward,
        homeLocation: user.homeLocation,
        ageBand: user.ageBand,
      },
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password.' });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = req.user;
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    municipality: user.municipality,
    ward: user.ward,
    homeLocation: user.homeLocation,
    ageBand: user.ageBand,
  });
});

module.exports = { registerUser, loginUser, getMe };
