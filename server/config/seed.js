// server/config/seed.js
// Database seeding — run explicitly via `npm run seed` OR automatically in dev mode only.
// NEVER logs credentials to console.

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuthorityRequest = require('../models/AuthorityRequest');
const Alert = require('../models/Alert');
const Ward = require('../models/Ward');

const SEED_ACCOUNTS = [
  {
    name: 'System Admin',
    email: 'admin@tapchetna.gov.in',
    password: 'Admin123!',
    role: 'SYSTEM_ADMIN',
  },
  {
    name: 'Dr. Anita Banerjee (Zonal Health Officer)',
    email: 'officer@tapchetna.gov.in',
    password: 'Pass123!',
    role: 'MUNICIPAL_OFFICER',
    municipality: 'Kolkata Municipal Corporation',
    ward: 'Ward 17',
  },
];

const SEED_WARDS = [
  { wardNumber: 'Ward 17', municipality: 'Kolkata Municipal Corporation', riskLevel: 'HIGH', populationExposure: 'HIGH' },
  { wardNumber: 'Ward 18', municipality: 'Kolkata Municipal Corporation', riskLevel: 'MODERATE', populationExposure: 'MODERATE' },
  { wardNumber: 'Ward 19', municipality: 'Kolkata Municipal Corporation', riskLevel: 'LOW', populationExposure: 'LOW' },
  { wardNumber: 'Ward 20', municipality: 'Kolkata Municipal Corporation', riskLevel: 'LOW', populationExposure: 'LOW' },
  { wardNumber: 'Ward 21', municipality: 'Kolkata Municipal Corporation', riskLevel: 'HIGH', populationExposure: 'HIGH' },
  { wardNumber: 'Ward 22', municipality: 'Kolkata Municipal Corporation', riskLevel: 'MODERATE', populationExposure: 'MODERATE' },
  { wardNumber: 'Ward 23', municipality: 'Kolkata Municipal Corporation', riskLevel: 'MODERATE', populationExposure: 'MODERATE' },
  { wardNumber: 'Ward 24', municipality: 'Kolkata Municipal Corporation', riskLevel: 'HIGH', populationExposure: 'HIGH' },
];

const SEED_AUTHORITY_REQUESTS = [
  {
    name: 'Sunil Verma',
    designation: 'Disaster Management Specialist',
    officialId: 'DM-KMC-9812',
    municipality: 'Kolkata Municipal Corporation',
    ward: 'Ward 24',
    status: 'PENDING',
  },
  {
    name: 'Pooja Iyer',
    designation: 'Public Health Executive',
    officialId: 'PH-KMC-4411',
    municipality: 'Kolkata Municipal Corporation',
    ward: 'Ward 18',
    status: 'PENDING',
  },
];

const SEED_ALERTS = [
  {
    ward: 'Ward 17',
    municipality: 'Kolkata Municipal Corporation',
    riskLevel: 'EXTREME',
    status: 'ACTIVE',
    message: 'Heatwave Red Alert: Wet-bulb temp above 31°C. Mandatory shade rest cycles for outdoor workers.',
    actions: ['Deploy Water Tankers', 'Activate Cooling Centers', 'Halt Direct Sun Construction 12-3 PM'],
  },
  {
    ward: 'Ward 18',
    municipality: 'Kolkata Municipal Corporation',
    riskLevel: 'HIGH',
    status: 'ACTIVE',
    message: 'Orange Alert: Elevated surface heat index in congested street markets.',
    actions: ['ORS distribution at metro stations', 'Misting fans in primary bus stands'],
  },
];

/**
 * Seeds the database with initial data. Only creates records if they don't already exist.
 * @param {Object} options
 * @param {boolean} options.verbose - Log progress (defaults to NODE_ENV !== 'production')
 */
const seedData = async (options = {}) => {
  const verbose = options.verbose ?? (process.env.NODE_ENV !== 'production');

  try {
    // 1. Seed user accounts (idempotent — skip if already exists)
    for (const account of SEED_ACCOUNTS) {
      const exists = await User.findOne({ email: account.email });
      if (!exists) {
        await User.create(account);
        if (verbose) console.log(`  ✅ Seeded ${account.role}: ${account.email}`);
      }
    }

    // 2. Seed wards (idempotent — skip existing)
    for (const ward of SEED_WARDS) {
      const exists = await Ward.findOne({
        wardNumber: ward.wardNumber,
        municipality: ward.municipality,
      });
      if (!exists) {
        await Ward.create(ward);
      }
    }
    if (verbose) console.log(`  ✅ Seeded ${SEED_WARDS.length} ward records`);

    // 3. Seed authority requests if table is empty
    const reqCount = await AuthorityRequest.countDocuments();
    if (reqCount === 0) {
      await AuthorityRequest.create(SEED_AUTHORITY_REQUESTS);
      if (verbose) console.log(`  ✅ Seeded ${SEED_AUTHORITY_REQUESTS.length} authority requests`);
    }

    // 4. Seed alerts if table is empty
    const alertCount = await Alert.countDocuments();
    if (alertCount === 0) {
      await Alert.create(SEED_ALERTS);
      if (verbose) console.log(`  ✅ Seeded ${SEED_ALERTS.length} alerts`);
    }

    if (verbose) console.log('  ✅ Database seeding complete\n');
  } catch (err) {
    console.error('Seeding error (non-fatal):', err.message);
  }
};

// Allow running standalone: `node config/seed.js`
if (require.main === module) {
  const dotenv = require('dotenv');
  const connectDB = require('./db');
  dotenv.config();

  connectDB().then(async (connected) => {
    if (connected) {
      await seedData({ verbose: true });
      process.exit(0);
    } else {
      console.error('Could not connect to MongoDB');
      process.exit(1);
    }
  });
}

module.exports = seedData;
