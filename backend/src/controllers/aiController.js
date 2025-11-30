const LUC1Service = require('../services/luc1Service');

class AIController {
  constructor() {
    this.luc1Service = new LUC1Service();
  }

  async getQuickAdvice(req, res) {
    try {
      const { question } = req.body;

      if (!question || question.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Pregunta muy corta o vacía (mínimo 10 caracteres)'
        });
      }

      const advice = await this.luc1Service.getQuickAdvice(question);

      res.json({
        success: true,
        data: {
          question,
          advice,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('AI advice error:', error);
      res.status(500).json({
        success: false,
        error: 'Error consultando IA',
        fallback: 'Consulte con el equipo comercial para análisis detallado'
      });
    }
  }

  async analyzeRestrictions(req, res) {
    try {
      const { route, pickupDate, cargoType } = req.body;

      if (!route || !route.origin || !route.destination) {
        return res.status(400).json({
          success: false,
          error: 'Ruta completa es requerida (origin y destination)'
        });
      }

      const analysis = await this.luc1Service.analyzeRestrictions({
        route,
        pickupDate: pickupDate || new Date().toISOString(),
        cargoType: cargoType || 'general'
      });

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('AI restrictions analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Error analizando restricciones'
      });
    }
  }

  async checkHealth(req, res) {
    try {
      const health = await this.luc1Service.validateConnection();

      res.json({
        success: true,
        data: {
          luc1Status: health.connected ? 'connected' : 'disconnected',
          lastCheck: health.timestamp,
          responseTime: health.responseTime
        }
      });
    } catch (error) {
      console.error('AI health check error:', error);
      res.status(503).json({
        success: false,
        error: 'AI service unavailable'
      });
    }
  }

  async getCapabilities(req, res) {
    res.json({
      success: true,
      data: {
        service: 'LUC1-COMEX AI',
        capabilities: [
          'quick-advice',
          'analyze-restrictions',
          'quote-optimization',
          'route-validation'
        ],
        model: 'Lrodriolivera/luc1-comex-inference',
        specialization: 'Comercio exterior y transporte terrestre europeo',
        timestamp: new Date().toISOString()
      }
    });
  }
}

module.exports = AIController;