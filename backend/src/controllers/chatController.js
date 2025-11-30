/**
 * Chat Controller - Maneja las interacciones con LUCI
 */

const { getAIService } = require('../services/aiService');

class ChatController {
  constructor() {
    this.aiService = getAIService();
  }

  /**
   * Send message to LUCI
   */
  async sendMessage(req, res) {
    try {
      const { message, sessionId } = req.body;
      const user = req.user;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      const result = await this.aiService.chat(
        message,
        user._id.toString(),
        `${user.firstName} ${user.lastName}`,
        user.role,
        sessionId
      );

      if (result.success) {
        // Extraer o generar sessionId
        const responseSessionId = result.data.sessionData?.session_id ||
                                 sessionId ||
                                 `user_${user._id.toString()}_${Date.now()}`;

        res.json({
          success: true,
          data: {
            ...result.data,
            session_id: responseSessionId  // Asegurar que siempre se devuelve
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            response: result.fallbackResponse,
            session_id: sessionId || `user_${user._id.toString()}_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      console.error('Chat controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Error procesando mensaje',
        message: error.message
      });
    }
  }

  /**
   * Get greeting for user login
   */
  async getGreeting(req, res) {
    try {
      const user = req.user;

      const greeting = await this.aiService.getGreeting(
        `${user.firstName} ${user.lastName}`,
        user.role
      );

      res.json({
        success: true,
        data: greeting
      });

    } catch (error) {
      console.error('Greeting error:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo saludo'
      });
    }
  }

  /**
   * Get quote assistance from LUCI
   */
  async getQuoteAssistance(req, res) {
    try {
      const { origin, destination, cargoType, weight } = req.body;
      const { sessionId } = req.query;
      const user = req.user;

      const assistance = await this.aiService.assistQuote(
        {
          origin,
          destination,
          cargoType,
          weight
        },
        `${user.firstName} ${user.lastName}`,
        sessionId
      );

      res.json({
        success: true,
        data: assistance
      });

    } catch (error) {
      console.error('Quote assistance error:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo asistencia'
      });
    }
  }

  /**
   * Validate data using AI
   */
  async validateData(req, res) {
    try {
      const { dataType, value } = req.body;

      const validation = await this.aiService.validateData(dataType, value);

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Error en validación'
      });
    }
  }

  /**
   * Clear chat session
   */
  async clearSession(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await this.aiService.clearSession(sessionId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Clear session error:', error);
      res.status(500).json({
        success: false,
        error: 'Error limpiando sesión'
      });
    }
  }

  /**
   * Get AI service status
   */
  async getStatus(req, res) {
    try {
      const health = await this.aiService.checkHealth();
      const modelStatus = await this.aiService.getModelStatus();

      res.json({
        success: true,
        data: {
          health,
          modelStatus,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estado del servicio'
      });
    }
  }

  /**
   * Process smart form assistance
   */
  async smartFormAssist(req, res) {
    try {
      const { formType, currentData, step } = req.body;
      const user = req.user;

      let assistanceMessage = '';

      switch (formType) {
        case 'quote':
          if (!currentData.origin) {
            assistanceMessage = 'Comencemos con la ciudad de origen. ¿Desde dónde envías la carga?';
          } else if (!currentData.destination) {
            assistanceMessage = `Perfecto, origen: ${currentData.origin}. ¿Cuál es la ciudad de destino?`;
          } else if (!currentData.cargoType) {
            assistanceMessage = `Ruta ${currentData.origin} → ${currentData.destination}. ¿Qué tipo de carga transportas? (general, ADR, refrigerada, etc.)`;
          } else if (!currentData.weight) {
            assistanceMessage = `Tipo de carga: ${currentData.cargoType}. ¿Cuál es el peso total?`;
          } else {
            assistanceMessage = 'Excelente, tienes todos los datos básicos. ¿Quieres generar la cotización o hay requisitos especiales?';
          }
          break;

        default:
          assistanceMessage = '¿En qué puedo ayudarte con este formulario?';
      }

      // Enviar a LUCI para respuesta más inteligente
      const aiResult = await this.aiService.chat(
        `Asiste con formulario ${formType}: ${assistanceMessage}. Datos actuales: ${JSON.stringify(currentData)}`,
        user._id.toString(),
        `${user.firstName} ${user.lastName}`,
        user.role
      );

      res.json({
        success: true,
        data: {
          assistance: aiResult.success ? aiResult.data.response : assistanceMessage,
          nextStep: step,
          complete: formType === 'quote' && currentData.origin && currentData.destination && currentData.cargoType && currentData.weight
        }
      });

    } catch (error) {
      console.error('Smart form assist error:', error);
      res.status(500).json({
        success: false,
        error: 'Error en asistencia de formulario'
      });
    }
  }
}

module.exports = ChatController;