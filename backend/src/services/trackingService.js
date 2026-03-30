/**
 * Real-Time Shipment Tracking Service
 *
 * Integrates with Project44 and Shippeo for real-time visibility
 * of shipments across European road transport.
 *
 * Required env vars (at least one provider):
 *   PROJECT44_API_KEY - Project44 API key
 *   PROJECT44_BASE_URL - API base URL (default: https://na12.api.project44.com)
 *   SHIPPEO_API_KEY - Shippeo API key
 *   SHIPPEO_BASE_URL - API base URL (default: https://api.shippeo.com)
 */

const axios = require('axios');

class TrackingService {
  constructor() {
    this.providers = {};

    // Project44 setup
    if (process.env.PROJECT44_API_KEY) {
      this.providers.project44 = {
        apiKey: process.env.PROJECT44_API_KEY,
        baseUrl: process.env.PROJECT44_BASE_URL || 'https://na12.api.project44.com',
        name: 'Project44'
      };
      console.log('📍 TrackingService: Project44 configured');
    }

    // Shippeo setup
    if (process.env.SHIPPEO_API_KEY) {
      this.providers.shippeo = {
        apiKey: process.env.SHIPPEO_API_KEY,
        baseUrl: process.env.SHIPPEO_BASE_URL || 'https://api.shippeo.com/api/v3',
        name: 'Shippeo'
      };
      console.log('📍 TrackingService: Shippeo configured');
    }

    const providerCount = Object.keys(this.providers).length;
    if (providerCount === 0) {
      console.log('📍 TrackingService: no providers configured (mock mode)');
    }
  }

  isConfigured() {
    return Object.keys(this.providers).length > 0;
  }

  /**
   * Create a shipment tracking order
   */
  async createTracking(shipmentData) {
    if (this.providers.project44) {
      return this._p44CreateShipment(shipmentData);
    }
    if (this.providers.shippeo) {
      return this._shippeoCreateShipment(shipmentData);
    }
    return this._mockCreateTracking(shipmentData);
  }

  /**
   * Get current position and status of a tracked shipment
   */
  async getTrackingStatus(trackingId) {
    if (this.providers.project44) {
      return this._p44GetStatus(trackingId);
    }
    if (this.providers.shippeo) {
      return this._shippeoGetStatus(trackingId);
    }
    return this._mockGetStatus(trackingId);
  }

  /**
   * Get ETA for a shipment
   */
  async getETA(trackingId) {
    if (this.providers.project44) {
      return this._p44GetETA(trackingId);
    }
    if (this.providers.shippeo) {
      return this._shippeoGetETA(trackingId);
    }
    return this._mockGetETA(trackingId);
  }

  /**
   * Get tracking history (all position updates)
   */
  async getTrackingHistory(trackingId) {
    if (this.providers.project44) {
      return this._p44GetHistory(trackingId);
    }
    if (this.providers.shippeo) {
      return this._shippeoGetHistory(trackingId);
    }
    return this._mockGetHistory(trackingId);
  }

  /**
   * Get provider status info
   */
  getProviderStatus() {
    return {
      configured: this.isConfigured(),
      providers: {
        project44: {
          active: !!this.providers.project44,
          envVars: ['PROJECT44_API_KEY', 'PROJECT44_BASE_URL'],
          docs: 'https://developer.project44.com/'
        },
        shippeo: {
          active: !!this.providers.shippeo,
          envVars: ['SHIPPEO_API_KEY', 'SHIPPEO_BASE_URL'],
          docs: 'https://developer.shippeo.com/'
        }
      }
    };
  }

  // ─── Project44 Implementation ──────────────────────────────────────

  async _p44CreateShipment(data) {
    const config = this.providers.project44;
    const response = await axios.post(
      `${config.baseUrl}/api/v4/tl/shipments`,
      {
        identifiers: [{
          type: 'BILL_OF_LADING',
          value: data.referenceId || data.quoteId
        }],
        equipmentIdentifiers: data.trailerId ? [{ type: 'TRAILER_ID', value: data.trailerId }] : [],
        routeInfo: {
          stops: [
            {
              type: 'ORIGIN',
              location: { address: { city: data.originCity, country: data.originCountry } },
              appointmentWindow: {
                startDateTime: data.pickupDate,
                endDateTime: data.pickupDate
              }
            },
            {
              type: 'DESTINATION',
              location: { address: { city: data.destinationCity, country: data.destinationCountry } },
              appointmentWindow: {
                startDateTime: data.deliveryDate,
                endDateTime: data.deliveryDate
              }
            }
          ]
        }
      },
      { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
    );
    return { provider: 'project44', trackingId: response.data.id, data: response.data };
  }

  async _p44GetStatus(trackingId) {
    const config = this.providers.project44;
    const response = await axios.get(
      `${config.baseUrl}/api/v4/tl/shipments/${trackingId}/status`,
      { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
    );
    return { provider: 'project44', ...response.data };
  }

  async _p44GetETA(trackingId) {
    const config = this.providers.project44;
    const response = await axios.get(
      `${config.baseUrl}/api/v4/tl/shipments/${trackingId}/eta`,
      { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
    );
    return { provider: 'project44', ...response.data };
  }

  async _p44GetHistory(trackingId) {
    const config = this.providers.project44;
    const response = await axios.get(
      `${config.baseUrl}/api/v4/tl/shipments/${trackingId}/positions`,
      { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
    );
    return { provider: 'project44', positions: response.data };
  }

  // ─── Shippeo Implementation ────────────────────────────────────────

  async _shippeoCreateShipment(data) {
    const config = this.providers.shippeo;
    const response = await axios.post(
      `${config.baseUrl}/transports`,
      {
        externalId: data.referenceId || data.quoteId,
        transportMode: 'ROAD',
        origin: { city: data.originCity, countryCode: data.originCountry },
        destination: { city: data.destinationCity, countryCode: data.destinationCountry },
        pickupDate: data.pickupDate,
        deliveryDate: data.deliveryDate
      },
      { headers: { 'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' } }
    );
    return { provider: 'shippeo', trackingId: response.data.id, data: response.data };
  }

  async _shippeoGetStatus(trackingId) {
    const config = this.providers.shippeo;
    const response = await axios.get(
      `${config.baseUrl}/transports/${trackingId}`,
      { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
    );
    return { provider: 'shippeo', ...response.data };
  }

  async _shippeoGetETA(trackingId) {
    const config = this.providers.shippeo;
    const response = await axios.get(
      `${config.baseUrl}/transports/${trackingId}/eta`,
      { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
    );
    return { provider: 'shippeo', ...response.data };
  }

  async _shippeoGetHistory(trackingId) {
    const config = this.providers.shippeo;
    const response = await axios.get(
      `${config.baseUrl}/transports/${trackingId}/positions`,
      { headers: { 'Authorization': `Bearer ${config.apiKey}` } }
    );
    return { provider: 'shippeo', positions: response.data };
  }

  // ─── Mock Implementation (for demo/development) ────────────────────

  _mockCreateTracking(data) {
    const trackingId = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    return {
      provider: 'mock',
      trackingId,
      data: {
        referenceId: data.referenceId || data.quoteId,
        origin: `${data.originCity}, ${data.originCountry}`,
        destination: `${data.destinationCity}, ${data.destinationCountry}`,
        status: 'CREATED',
        createdAt: new Date().toISOString()
      }
    };
  }

  _mockGetStatus(trackingId) {
    const statuses = ['IN_TRANSIT', 'AT_PICKUP', 'IN_TRANSIT', 'NEAR_DESTINATION', 'DELIVERED'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      provider: 'mock',
      trackingId,
      status,
      lastUpdate: new Date().toISOString(),
      position: {
        latitude: 40.4168 + (Math.random() - 0.5) * 10,
        longitude: -3.7038 + (Math.random() - 0.5) * 15
      }
    };
  }

  _mockGetETA(trackingId) {
    const hoursRemaining = Math.floor(Math.random() * 48) + 1;
    const eta = new Date();
    eta.setHours(eta.getHours() + hoursRemaining);
    return {
      provider: 'mock',
      trackingId,
      estimatedArrival: eta.toISOString(),
      confidence: Math.floor(Math.random() * 30) + 70,
      hoursRemaining
    };
  }

  _mockGetHistory(trackingId) {
    const positions = [];
    const now = Date.now();
    for (let i = 10; i >= 0; i--) {
      positions.push({
        timestamp: new Date(now - i * 3600000).toISOString(),
        latitude: 40.4168 + (10 - i) * 0.3 + (Math.random() - 0.5) * 0.1,
        longitude: -3.7038 + (10 - i) * 0.5 + (Math.random() - 0.5) * 0.1,
        speed: Math.floor(Math.random() * 40) + 60
      });
    }
    return { provider: 'mock', trackingId, positions };
  }
}

// Singleton
let instance = null;
const getTrackingService = () => {
  if (!instance) instance = new TrackingService();
  return instance;
};

module.exports = { TrackingService, getTrackingService };
