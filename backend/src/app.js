const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Database connection
const DatabaseService = require('./config/database');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100 // limit each IP to 100 requests per windowMs
});

// Middleware básico
app.use(helmet());
// CORS configuration - supports multiple origins for development and production
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001']
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or matches Render pattern
    if (allowedOrigins.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Stock Logistic POC Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: DatabaseService.getConnectionStatus(),
      connected: DatabaseService.isConnected()
    },
    apis: {
      luc1: process.env.LUC1_ENDPOINT ? 'Configured' : 'Missing',
      openroute: process.env.OPENROUTE_API_KEY ? 'Configured' : 'Missing',
      google: process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Missing',
      tollguru: process.env.TOLLGURU_API_KEY ? 'Configured' : 'Missing'
    },
    freightExchanges: {
      timocom: process.env.TIMOCOM_USER ? 'Configured' : 'Demo Mode',
      wtransnet: process.env.WTRANSNET_USER ? 'Configured' : 'Demo Mode'
    }
  });
});

// Import routes
const quotesRoutes = require('./routes/quotes');
const aiRoutes = require('./routes/ai');
const mapsRoutes = require('./routes/maps');
const pdfRoutes = require('./routes/pdf');
const loadCalculatorRoutes = require('./routes/loadCalculator');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const freightExchangeRoutes = require('./routes/freightExchange');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', mapsRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/load-calculator', loadCalculatorRoutes);
app.use('/api/freight-exchange', freightExchangeRoutes);

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Stock Logistic API',
    status: 'active',
    endpoints: {
      health: '/health',
      status: '/api/status',
      quotes: '/api/quotes',
      ai: '/api/ai'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

const PORT = process.env.PORT || 5000;

// Initialize database connection and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await DatabaseService.connect();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Stock Logistic POC Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Database: Connected to MongoDB`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API status: http://localhost:${PORT}/api/status`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  await DatabaseService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  await DatabaseService.disconnect();
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
