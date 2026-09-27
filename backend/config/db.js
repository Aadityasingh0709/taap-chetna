// backend/config/db.js
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Robustly load backend/.env whether launched from root or backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to current working directory if different

const dns = require('dns');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tapchetna';

const connectDB = async () => {
  try {
    const isAtlas = MONGO_URI.includes('mongodb+srv') || MONGO_URI.includes('mongodb.net');
    if (isAtlas) {
      // Fix Windows DNS SRV lookup failure (querySrv ECONNREFUSED) by using standard DNS servers
      try {
        dns.setServers(['8.8.8.8', '1.1.1.1']);
      } catch (dnsErr) {
        // Fallback silently if custom DNS cannot be configured
      }
    }

    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Connected (${isAtlas ? 'Cloud Atlas' : 'Local'}): ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.error('⚠️ MongoDB connection warning:', err.message);
    console.log('App will continue running in fallback mode.');
    return false;
  }
};

module.exports = connectDB;

