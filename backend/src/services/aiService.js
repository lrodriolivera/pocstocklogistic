/**
 * AI Service - Comunicación con LUCI (LUC1)
 * Maneja la comunicación con el servicio de IA Python
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8002';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 180000, // 3 minutos - Claude Sonnet 4 puede tardar en análisis complejos
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if AI service is healthy
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('AI Service health check failed:', error.message);
      return {
        status: 'unhealthy',
        model_loaded: false,
        error: error.message
      };
    }
  }

  /**
   * Send chat message to LUCI
   */
  async chat(message, userId, userName, userRole, sessionId = null) {
    try {
      const response = await this.client.post('/chat/message', {
        message,
        sessionId: sessionId || `user_${userId}_${Date.now()}`
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Chat error:', error.message);
      return {
        success: false,
        error: error.message,
        fallbackResponse: 'Lo siento, estoy teniendo problemas técnicos. Por favor, intenta de nuevo.'
      };
    }
  }

  /**
   * Get personalized greeting
   */
  async getGreeting(userName, userRole) {
    try {
      const response = await this.client.post('/greeting', null, {
        params: { user_name: userName, user_role: userRole }
      });
      return response.data;
    } catch (error) {
      // Fallback greeting if service is down
      const hour = new Date().getHours();
      const timeGreeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

      return {
        greeting: `${timeGreeting} ${userName}! Soy LUC1, tu asistente de logística. ¿En qué puedo ayudarte?`,
        ai_greeting: null,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get assistance for quote generation
   */
  async assistQuote(quoteData, userName, sessionId = null) {
    try {
      const response = await this.client.post('/assist/quote', {
        origin: quoteData.origin,
        destination: quoteData.destination,
        cargo_type: quoteData.cargoType,
        weight: quoteData.weight,
        user_name: userName,
        session_id: sessionId
      });

      return response.data;
    } catch (error) {
      console.error('Quote assist error:', error.message);
      return {
        assistance: 'Puedo ayudarte a generar tu cotización. Por favor, proporciona origen, destino, tipo de carga y peso.',
        complete: false,
        error: error.message
      };
    }
  }

  /**
   * Validate data using AI
   */
  async validateData(dataType, value) {
    try {
      const response = await this.client.post('/validate', null, {
        params: { data_type: dataType, value: value }
      });
      return response.data;
    } catch (error) {
      // Basic fallback validation
      const validations = {
        email: value.includes('@'),
        phone: value.length >= 9,
        weight: !isNaN(parseFloat(value)) && parseFloat(value) > 0,
        date: !isNaN(Date.parse(value))
      };

      return {
        valid: validations[dataType] || false,
        message: 'Validación básica',
        value: value,
        type: dataType
      };
    }
  }

  /**
   * Clear chat session
   */
  async clearSession(sessionId) {
    try {
      await this.client.delete(`/sessions/${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error('Clear session error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get model status
   */
  async getModelStatus() {
    try {
      const response = await this.client.get('/model/status');
      return response.data;
    } catch (error) {
      return {
        model_loaded: false,
        error: 'Service unavailable'
      };
    }
  }
}

// Singleton instance
let aiServiceInstance = null;

const getAIService = () => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
};

module.exports = {
  AIService,
  getAIService
};