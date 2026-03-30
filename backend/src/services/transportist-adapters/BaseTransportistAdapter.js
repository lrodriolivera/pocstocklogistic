/**
 * 🔌 BaseTransportistAdapter - Clase base para adaptadores de APIs
 *
 * Define la interfaz común para todos los adaptadores de transportistas
 *
 * @author AXEL Team
 * @version 1.0.0
 */

const axios = require('axios');

class BaseTransportistAdapter {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.client = null;
    this.isConnected = false;

    // Métricas
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
  }

  /**
   * 🔌 Inicializar conexión con la API
   */
  async initialize() {
    try {
      this.client = axios.create({
        baseURL: this.config.baseURL,
        timeout: this.config.timeout || 30000,
        headers: this.getDefaultHeaders()
      });

      // Interceptor para métricas
      this.client.interceptors.response.use(
        response => {
          this.updateMetrics(true, response.config.metadata?.startTime);
          return response;
        },
        error => {
          this.updateMetrics(false, error.config.metadata?.startTime);
          throw error;
        }
      );

      // Verificar conectividad
      await this.healthCheck();
      this.isConnected = true;

      console.log(`✅ ${this.name} adapter initialized`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.name} initialization failed:`, error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 🏥 Health check (debe ser implementado por cada adapter)
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * 💰 Obtener cotización (debe ser implementado por cada adapter)
   * @param {Object} quoteRequest - Solicitud de cotización
   * @returns {Promise<Object>} Cotización en formato estándar
   */
  async getQuote(quoteRequest) {
    throw new Error('getQuote() must be implemented by subclass');
  }

  /**
   * 📝 Transformar request al formato de la API específica
   */
  transformRequest(quoteRequest) {
    throw new Error('transformRequest() must be implemented by subclass');
  }

  /**
   * 📊 Transformar response al formato estándar
   */
  transformResponse(apiResponse) {
    throw new Error('transformResponse() must be implemented by subclass');
  }

  /**
   * 🔑 Obtener headers por defecto
   */
  getDefaultHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Axel/1.0'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * 🔄 Retry logic para llamadas fallidas
   */
  async withRetry(fn, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
          console.log(`⚠️ ${this.name} retry ${attempt}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 📈 Actualizar métricas
   */
  updateMetrics(success, startTime) {
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = new Date();

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (startTime) {
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime = Math.round(
        (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
        this.metrics.totalRequests
      );
    }
  }

  /**
   * 📊 Obtener métricas
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 ?
        Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100) : 0,
      isConnected: this.isConnected,
      adapter: this.name
    };
  }

  /**
   * 🧹 Limpiar recursos
   */
  disconnect() {
    this.client = null;
    this.isConnected = false;
    console.log(`🔌 ${this.name} adapter disconnected`);
  }

  /**
   * ✅ Validar configuración
   */
  validateConfig() {
    if (!this.config.baseURL) {
      throw new Error(`${this.name}: baseURL is required in config`);
    }

    if (!this.config.apiKey && this.requiresAuth()) {
      throw new Error(`${this.name}: apiKey is required in config`);
    }
  }

  /**
   * 🔐 Verificar si requiere autenticación
   */
  requiresAuth() {
    return true; // Por defecto, todas las APIs requieren auth
  }
}

module.exports = BaseTransportistAdapter;