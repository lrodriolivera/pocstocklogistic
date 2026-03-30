const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin) ||
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

// Multi-tenant middleware - injects tenantId from authenticated user
const { injectTenantId } = require('./middleware/tenant');
app.use(injectTenantId);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AXEL Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: DatabaseService.getConnectionStatus(),
      connected: DatabaseService.isConnected()
    },
    apis: 'operational'
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
const clientsRoutes = require('./routes/clients');
const emailRoutes = require('./routes/email');
const tenantsRoutes = require('./routes/tenants');

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
app.use('/api/clients', clientsRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/tenants', tenantsRoutes);

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'AXEL API',
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

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) ||
          origin.includes('localhost') ||
          origin === 'https://axel.strixai.es') {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// JWT authentication middleware for socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  console.log(`Socket connected: ${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.userId}`);
  });
});

// Make io available to routes/services
app.set('io', io);

// Initialize database connection and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await DatabaseService.connect();

    // Start HTTP server (with Socket.IO)
    server.listen(PORT, () => {
      console.log(`🚀 AXEL Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Database: Connected to MongoDB`);
      console.log(`🔌 WebSocket: Socket.IO ready`);
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
