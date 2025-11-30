/**
 * Database Configuration for MongoDB
 */

const mongoose = require('mongoose');

class DatabaseService {
  constructor() {
    this.connection = null;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-logistic';
  }

  async connect() {
    try {
      if (this.connection) {
        console.log('📦 Database already connected');
        return this.connection;
      }

      console.log('📦 Connecting to MongoDB...');

      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(this.connectionString, options);

      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
        this.connection = null;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('📦 Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }
}

module.exports = new DatabaseService();