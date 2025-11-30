module.exports = {
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/stock-logistic',
    redis: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  ai: {
    luc1Endpoint: process.env.LUC1_ENDPOINT,
    huggingFaceToken: process.env.HUGGING_FACE_TOKEN
  },
  apis: {
    googleMaps: process.env.GOOGLE_MAPS_API_KEY,
    tollGuru: process.env.TOLLGURU_API_KEY,
    fuelPrices: process.env.GLOBALPETROLPRICES_API_KEY
  },
  security: {
    jwtSecret: process.env.JWT_SECRET,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  }
};
