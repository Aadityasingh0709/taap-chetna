// server/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const seedData = require('./config/seed');

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'], credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB — seed only in dev mode or when explicitly requested
connectDB().then((connected) => {
  if (connected) {
    const isDev = process.env.NODE_ENV !== 'production';
    const seedRequested = process.env.SEED_ON_START === 'true';
    if (isDev || seedRequested) {
      seedData();
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    app: 'Taap Chetna API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/citizen', require('./routes/citizen'));
app.use('/api/authority', require('./routes/authority'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/travel', require('./routes/travel'));
app.use('/api/whatif', require('./routes/whatif'));
app.use('/api/shakti', require('./routes/shakti'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: statusCode === 500
      ? 'Something went wrong. Please try again.'
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`\n  🔥 Taap Chetna Backend running on http://localhost:${PORT}\n`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [PORT CONFLICT] Port ${PORT} is already in use by an existing process.`);
    console.error(`   To free port ${PORT} on Windows PowerShell, run:`);
    console.error(`   Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', err);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});
