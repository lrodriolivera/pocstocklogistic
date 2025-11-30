const MasterQuoteService = require('../services/masterQuoteService');
const OpenRouteService = require('../services/openRouteService');
const { validationResult } = require('express-validator');

class QuoteController {
  constructor() {
    this.masterQuoteService = new MasterQuoteService();
    this.openRouteService = new OpenRouteService();
  }

  /**
   * 🔗 Generate portal URL for client access
   * Uses FRONTEND_URL env variable in production, falls back to localhost in development
   */
  _getPortalUrl(token) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl}/portal/${token}`;
  }

  async generateQuote(req, res) {
    try {
      const startTime = Date.now();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const quoteRequest = req.body;

      // Transformar datos al formato esperado por masterQuoteService
      const transformedRequest = {
        ...quoteRequest,
        service: {
          pickupDate: quoteRequest.pickup?.date || new Date().toISOString(),
          serviceType: quoteRequest.preferences?.serviceType || 'estandar'
        },
        cargo: {
          ...quoteRequest.cargo,
          isHazardous: quoteRequest.cargo.type === 'adr'
        },
        // Assign commercial agent from authenticated user
        assignedTo: req.user ? req.user._id.toString() : null,
        createdBy: req.user ? req.user._id.toString() : 'system'
      };

      console.log('Quote generation started:', {
        route: `${quoteRequest.route.origin} → ${quoteRequest.route.destination}`,
        cargo: quoteRequest.cargo.type,
        assignedTo: req.user ? req.user.fullName || `${req.user.firstName} ${req.user.lastName}` : 'System',
        timestamp: new Date().toISOString()
      });

      const quote = await this.masterQuoteService.generateIntelligentQuote(transformedRequest);

      console.log('Quote generated:', {
        quoteId: quote.quoteId,
        total: quote.costBreakdown.total,
        confidence: quote.confidence,
        assignedTo: req.user ? req.user.fullName || `${req.user.firstName} ${req.user.lastName}` : 'System',
        processingTime: Date.now() - startTime
      });

      res.json({
        success: true,
        data: quote
      });

    } catch (error) {
      console.error('Quote generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Error generando cotización',
        message: error.message
      });
    }
  }

  async getQuote(req, res) {
    try {
      const { id } = req.params;

      const quote = await this.masterQuoteService.getQuoteById(id);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      res.json({
        success: true,
        data: quote
      });
    } catch (error) {
      console.error('Error obteniendo cotización:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo cotización',
        message: error.message
      });
    }
  }

  async acceptQuote(req, res) {
    try {
      const { id } = req.params;

      const quote = await this.masterQuoteService.getQuoteById(id);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      await quote.markAsAccepted();

      console.log('Quote accepted:', { quoteId: id, timestamp: new Date().toISOString() });

      res.json({
        success: true,
        message: 'Cotización marcada como aceptada',
        data: { quoteId: id, status: 'accepted' }
      });
    } catch (error) {
      console.error('Error aceptando cotización:', error);
      res.status(500).json({
        success: false,
        error: 'Error procesando aceptación',
        message: error.message
      });
    }
  }

  async validateRoute(req, res) {
    try {
      const { origin, destination } = req.query;

      if (!origin || !destination) {
        return res.status(400).json({
          success: false,
          error: 'Origen y destino son requeridos'
        });
      }

      const routeData = await this.openRouteService.calculateRoute(origin, destination);

      res.json({
        success: true,
        data: {
          origin: routeData.origin,
          destination: routeData.destination,
          viable: true,
          distance: routeData.distance,
          estimatedTime: routeData.duration,
          estimatedTransitDays: routeData.estimatedTransitDays,
          countries: routeData.countries,
          confidence: routeData.confidence,
          source: routeData.source,
          warnings: [],
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Error validando ruta con OpenRoute Service',
        message: error.message
      });
    }
  }

  async getStatus(req, res) {
    res.json({
      success: true,
      data: {
        service: 'Quote Controller',
        status: 'operational',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  }

  async getOpenRouteHealth(req, res) {
    try {
      const health = await this.openRouteService.healthCheck();
      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'OpenRoute Service health check failed',
        message: error.message
      });
    }
  }

  /**
   * 📋 Obtener historial de cotizaciones
   */
  async getQuoteHistory(req, res) {
    try {
      const filters = {
        clientEmail: req.query.clientEmail,
        origin: req.query.origin,
        destination: req.query.destination,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo,
        limit: parseInt(req.query.limit) || 50
      };

      // Add role-based filtering
      if (req.user) {
        if (req.user.role === 'agente_comercial') {
          // Agents can only see their own quotes
          filters.assignedTo = req.user._id.toString();
        } else if (req.user.role === 'supervisor') {
          // Supervisors can see quotes from their managed agents and their own
          const User = require('../models/User');
          const supervisor = await User.findById(req.user._id);
          const managedAgentIds = supervisor.managedAgents.map(id => id.toString());
          filters.assignedToList = [...managedAgentIds, req.user._id.toString()];
        }
        // Alta gerencia can see all quotes (no additional filter needed)
      }

      const quotes = await this.masterQuoteService.getQuoteHistory(filters);

      res.json({
        success: true,
        data: {
          quotes,
          count: quotes.length,
          filters: filters,
          userRole: req.user?.role
        }
      });
    } catch (error) {
      console.error('Error obteniendo historial de cotizaciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo historial de cotizaciones',
        message: error.message
      });
    }
  }

  /**
   * 📈 Obtener estadísticas de cotizaciones
   */
  async getQuoteStatistics(req, res) {
    try {
      const statistics = await this.masterQuoteService.getQuoteStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo estadísticas de cotizaciones',
        message: error.message
      });
    }
  }

  /**
   * 📊 Update quote status and timeline
   */
  async updateQuoteStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, description, performedBy } = req.body;

      const quote = await this.masterQuoteService.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      await quote.addTimelineEvent(status, description, performedBy || 'system');

      res.json({
        success: true,
        message: 'Estado de cotización actualizado',
        data: { quoteId: id, status, timestamp: new Date() }
      });
    } catch (error) {
      console.error('Error actualizando estado:', error);
      res.status(500).json({
        success: false,
        error: 'Error actualizando estado de cotización',
        message: error.message
      });
    }
  }

  /**
   * 📈 Get quote timeline
   */
  async getQuoteTimeline(req, res) {
    try {
      const { id } = req.params;

      const quote = await this.masterQuoteService.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      res.json({
        success: true,
        data: {
          quoteId: id,
          timeline: quote.tracking?.timeline || [],
          currentStatus: quote.status,
          lastUpdate: quote.updatedAt
        }
      });
    } catch (error) {
      console.error('Error obteniendo timeline:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo timeline de cotización',
        message: error.message
      });
    }
  }

  /**
   * 🔗 Generate portal access for client
   */
  async generatePortalAccess(req, res) {
    try {
      const { id } = req.params;

      const quote = await this.masterQuoteService.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      await quote.generateClientAccessToken();

      // Add timeline event
      await quote.addTimelineEvent('sent', 'Acceso al portal del cliente generado', 'commercial');

      // Generate frontend portal URL using FRONTEND_URL env variable
      const portalUrl = this._getPortalUrl(quote.tracking.clientAccess.token);

      res.json({
        success: true,
        message: 'Portal de acceso generado',
        data: {
          quoteId: id,
          portalUrl: portalUrl,
          token: quote.tracking.clientAccess.token
        }
      });
    } catch (error) {
      console.error('Error generando acceso al portal:', error);
      res.status(500).json({
        success: false,
        error: 'Error generando acceso al portal',
        message: error.message
      });
    }
  }

  /**
   * 📧 Generate email template
   */
  async generateEmailTemplate(req, res) {
    try {
      const { id } = req.params;
      const { commercialName, customMessage } = req.body;

      const quote = await this.masterQuoteService.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      // Generate portal access if not exists
      if (!quote.tracking?.clientAccess?.token) {
        await quote.generateClientAccessToken();
      }

      // Generate frontend portal URL using FRONTEND_URL env variable
      const portalUrl = this._getPortalUrl(quote.tracking.clientAccess.token);

      const emailTemplate = `
Estimados ${quote.client.company || 'cliente'},

${commercialName || 'Nuestro equipo comercial'} ha preparado una cotización personalizada para su solicitud de transporte desde ${quote.route.origin} hasta ${quote.route.destination}.

📋 DETALLES DE LA COTIZACIÓN:
• ID: ${quote.quoteId}
• Tipo de carga: ${quote.cargo.type}
• Peso: ${quote.cargo.weight} toneladas
• Precio: €${quote.costBreakdown.total}
• Fecha de carga: ${new Date(quote.pickup?.date || quote.schedule?.pickup?.date).toLocaleDateString('es-ES')}
• Tiempo estimado: ${quote.schedule?.transitDays || 'Por determinar'} días

${customMessage || ''}

🔗 ACCEDER A SU COTIZACIÓN:
Puede revisar todos los detalles, alternativas de servicio y cronograma en nuestro portal exclusivo:

${portalUrl}

Esta cotización es válida hasta: ${new Date(quote.validUntil).toLocaleDateString('es-ES')}

Para cualquier consulta o modificación, no dude en contactarnos.

Saludos cordiales,
${commercialName || 'Equipo Comercial'}
Stock Logistic Solutions
`;

      // Record communication
      await quote.addCommunication(
        'email_template_generated',
        emailTemplate,
        quote.client.email,
        'commercial'
      );

      res.json({
        success: true,
        message: 'Plantilla de email generada',
        data: {
          quoteId: id,
          emailTemplate,
          portalUrl,
          recipientEmail: quote.client.email
        }
      });
    } catch (error) {
      console.error('Error generando plantilla de email:', error);
      res.status(500).json({
        success: false,
        error: 'Error generando plantilla de email',
        message: error.message
      });
    }
  }

  /**
   * 💼 Add negotiation to quote
   */
  async addNegotiation(req, res) {
    try {
      const { id } = req.params;
      const { proposedPrice, proposedChanges, proposedBy, notes } = req.body;

      const quote = await this.masterQuoteService.getQuoteById(id);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      await quote.addNegotiation(proposedPrice, proposedChanges, proposedBy, notes);

      res.json({
        success: true,
        message: 'Negociación añadida a la cotización',
        data: {
          quoteId: id,
          status: 'negotiating',
          proposedPrice,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error añadiendo negociación:', error);
      res.status(500).json({
        success: false,
        error: 'Error añadiendo negociación',
        message: error.message
      });
    }
  }

  /**
   * 🌐 Get quote by client token (Portal access)
   */
  async getQuoteByToken(req, res) {
    try {
      const { token } = req.params;

      const Quote = require('../models/Quote');
      const quote = await Quote.findByClientToken(token);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada o enlace inválido'
        });
      }

      if (!quote.tracking?.clientAccess?.isActive) {
        return res.status(403).json({
          success: false,
          error: 'El acceso a esta cotización ha sido desactivado'
        });
      }

      res.json({
        success: true,
        data: {
          quote: {
            quoteId: quote.quoteId,
            route: quote.route,
            cargo: quote.cargo,
            costBreakdown: quote.costBreakdown,
            alternatives: quote.alternatives,
            schedule: quote.schedule,
            validUntil: quote.validUntil,
            status: quote.status,
            client: quote.client,
            preferences: quote.preferences,
            requirements: quote.requirements
          },
          viewCount: quote.tracking.clientAccess.viewCount,
          lastViewed: quote.tracking.clientAccess.lastViewed
        }
      });
    } catch (error) {
      console.error('Error obteniendo cotización por token:', error);
      res.status(500).json({
        success: false,
        error: 'Error obteniendo cotización',
        message: error.message
      });
    }
  }

  /**
   * 👁️ Record client view
   */
  async recordClientView(req, res) {
    try {
      const { token } = req.params;

      const Quote = require('../models/Quote');
      const quote = await Quote.findByClientToken(token);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      await quote.recordClientView();

      res.json({
        success: true,
        message: 'Visualización registrada',
        data: {
          quoteId: quote.quoteId,
          viewCount: quote.tracking.clientAccess.viewCount,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error registrando visualización:', error);
      res.status(500).json({
        success: false,
        error: 'Error registrando visualización',
        message: error.message
      });
    }
  }

  /**
   * ✅ Client accept quote via portal
   */
  async acceptQuoteByToken(req, res) {
    try {
      const { token } = req.params;

      const Quote = require('../models/Quote');
      const quote = await Quote.findByClientToken(token);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      if (!quote.tracking?.clientAccess?.isActive) {
        return res.status(403).json({
          success: false,
          error: 'El acceso a esta cotización ha sido desactivado'
        });
      }

      if (quote.status === 'accepted') {
        return res.status(400).json({
          success: false,
          error: 'Esta cotización ya ha sido aceptada'
        });
      }

      if (quote.status === 'rejected') {
        return res.status(400).json({
          success: false,
          error: 'Esta cotización ya ha sido rechazada'
        });
      }

      // Update quote status
      quote.status = 'accepted';
      await quote.addTimelineEvent('accepted', 'Cotización aceptada por el cliente', 'client');
      await quote.addCommunication(
        'client_accepted',
        'El cliente ha aceptado la cotización desde el portal',
        quote.client.email,
        'client'
      );

      console.log('Quote accepted via portal:', { quoteId: quote.quoteId, token: token });

      res.json({
        success: true,
        message: 'Cotización aceptada exitosamente',
        data: {
          quoteId: quote.quoteId,
          status: 'accepted',
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error aceptando cotización por token:', error);
      res.status(500).json({
        success: false,
        error: 'Error procesando aceptación',
        message: error.message
      });
    }
  }

  /**
   * ❌ Client reject quote via portal
   */
  async rejectQuoteByToken(req, res) {
    try {
      const { token } = req.params;

      const Quote = require('../models/Quote');
      const quote = await Quote.findByClientToken(token);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      if (!quote.tracking?.clientAccess?.isActive) {
        return res.status(403).json({
          success: false,
          error: 'El acceso a esta cotización ha sido desactivado'
        });
      }

      if (quote.status === 'accepted') {
        return res.status(400).json({
          success: false,
          error: 'Esta cotización ya ha sido aceptada'
        });
      }

      if (quote.status === 'rejected') {
        return res.status(400).json({
          success: false,
          error: 'Esta cotización ya ha sido rechazada'
        });
      }

      // Update quote status
      quote.status = 'rejected';
      await quote.addTimelineEvent('rejected', 'Cotización rechazada por el cliente', 'client');
      await quote.addCommunication(
        'client_rejected',
        'El cliente ha rechazado la cotización desde el portal',
        quote.client.email,
        'client'
      );

      console.log('Quote rejected via portal:', { quoteId: quote.quoteId, token: token });

      res.json({
        success: true,
        message: 'Cotización rechazada',
        data: {
          quoteId: quote.quoteId,
          status: 'rejected',
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error rechazando cotización por token:', error);
      res.status(500).json({
        success: false,
        error: 'Error procesando rechazo',
        message: error.message
      });
    }
  }

  /**
   * 💼 Client negotiate quote via portal
   */
  async negotiateQuoteByToken(req, res) {
    try {
      const { token } = req.params;
      const { proposedPrice, notes } = req.body;

      const Quote = require('../models/Quote');
      const quote = await Quote.findByClientToken(token);

      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Cotización no encontrada'
        });
      }

      if (!quote.tracking?.clientAccess?.isActive) {
        return res.status(403).json({
          success: false,
          error: 'El acceso a esta cotización ha sido desactivado'
        });
      }

      if (quote.status === 'accepted' || quote.status === 'rejected') {
        return res.status(400).json({
          success: false,
          error: 'No se puede negociar una cotización ya finalizada'
        });
      }

      if (!notes || !notes.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar una descripción de las modificaciones requeridas'
        });
      }

      // Add negotiation
      const proposedChanges = {
        price: proposedPrice || null,
        description: notes.trim()
      };

      await quote.addNegotiation(proposedPrice, proposedChanges, 'client', notes);
      await quote.addCommunication(
        'client_negotiation',
        `Cliente solicita modificaciones: ${notes}${proposedPrice ? ` - Precio propuesto: €${proposedPrice}` : ''}`,
        quote.client.email,
        'client'
      );

      console.log('Quote negotiation requested via portal:', {
        quoteId: quote.quoteId,
        token: token,
        proposedPrice,
        notes: notes.substring(0, 100) + (notes.length > 100 ? '...' : '')
      });

      res.json({
        success: true,
        message: 'Solicitud de modificación enviada exitosamente',
        data: {
          quoteId: quote.quoteId,
          status: 'negotiating',
          proposedPrice: proposedPrice || null,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error procesando negociación por token:', error);
      res.status(500).json({
        success: false,
        error: 'Error procesando solicitud de modificación',
        message: error.message
      });
    }
  }
  /**
   * 🤖 Generate quote from AI Agent (Claude)
   * This endpoint is specifically for the AI conversational agent
   * It generates the quote, saves to MongoDB, creates portal access, and returns email template
   */
  async generateQuoteFromAI(req, res) {
    try {
      const startTime = Date.now();

      console.log('🤖 AI Agent Quote Generation Started');
      console.log('📦 Payload:', JSON.stringify(req.body, null, 2));

      const quoteRequest = req.body;

      // Transform data for masterQuoteService
      const transformedRequest = {
        route: quoteRequest.route,
        cargo: {
          ...quoteRequest.cargo,
          isHazardous: quoteRequest.cargo.type === 'adr'
        },
        service: quoteRequest.service,
        client: quoteRequest.client,
        preferences: quoteRequest.preferences || {
          serviceType: 'estandar',
          profitMargin: 15
        },
        requirements: quoteRequest.requirements || {
          insurance: true,
          tracking: true,
          signature: false
        },
        // Mark as AI-generated
        assignedTo: quoteRequest.metadata?.assignedTo || 'ai-agent',
        createdBy: 'claude-ai-agent'
      };

      // Generate quote using the master service
      console.log('🚀 Calling MasterQuoteService...');
      const quote = await this.masterQuoteService.generateIntelligentQuote(transformedRequest);

      console.log(`✅ Quote generated: ${quote.quoteId}`);

      // Generate client portal access automatically
      console.log('🔗 Generating portal access...');
      await quote.generateClientAccessToken();
      await quote.addTimelineEvent('generated', 'Cotización generada por agente AI', 'claude-ai-agent');

      // Build portal URL using FRONTEND_URL env variable
      const portalUrl = this._getPortalUrl(quote.tracking.clientAccess.token);

      // Generate email template
      console.log('📧 Generating email template...');
      const emailTemplate = this._generateAIEmailTemplate(quote, portalUrl);

      // Add communication record
      await quote.addCommunication(
        'email_template_generated',
        emailTemplate.content,
        quote.client.email,
        'claude-ai-agent'
      );

      console.log(`✅ Quote ${quote.quoteId} fully processed in ${Date.now() - startTime}ms`);

      // Return complete response for AI agent
      res.status(201).json({
        success: true,
        quoteId: quote.quoteId,
        quote: {
          _id: quote._id,
          quoteId: quote.quoteId,
          route: quote.route,
          cargo: quote.cargo,
          costBreakdown: quote.costBreakdown,
          schedule: quote.schedule,
          confidence: quote.confidence,
          status: quote.status
        },
        portalAccess: {
          token: quote.tracking.clientAccess.token,
          accessUrl: portalUrl,
          isActive: true
        },
        emailTemplate: emailTemplate,
        metadata: {
          processingTime: Date.now() - startTime,
          source: 'claude-ai-agent',
          savedToMongoDB: true
        }
      });

    } catch (error) {
      console.error('❌ AI Quote generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Error generando cotización desde AI',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Generate email template for AI-generated quotes
   */
  _generateAIEmailTemplate(quote, portalUrl) {
    const transitDays = quote.schedule?.transitDays || Math.ceil(quote.route.distance / 600);

    const subject = `Cotización ${quote.quoteId} - ${quote.route.origin} → ${quote.route.destination}`;

    const content = `
Estimado/a ${quote.client.contactName || 'cliente'},

Le adjunto la cotización solicitada para el transporte de mercancía:

📋 DETALLES DE LA COTIZACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 Cotización: ${quote.quoteId}
📅 Fecha de emisión: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}

🚛 RUTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Origen: ${quote.route.origin}
📍 Destino: ${quote.route.destination}
📏 Distancia: ${quote.route.distance.toFixed(0)} km
⏱️ Tiempo estimado: ${transitDays} día${transitDays > 1 ? 's' : ''} hábil${transitDays > 1 ? 'es' : ''}

📦 CARGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ Tipo: ${quote.cargo.type === 'forestales' ? 'Productos forestales' : quote.cargo.type.charAt(0).toUpperCase() + quote.cargo.type.slice(1)}
⚖️ Peso: ${(quote.cargo.weight * 1000).toFixed(0)} kg
📊 Volumen: ${quote.cargo.volume.toFixed(2)} m³

💰 PRECIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subtotal: ${quote.costBreakdown.subtotal.toFixed(2)} EUR
IVA (21%): ${quote.costBreakdown.vat.toFixed(2)} EUR
──────────────────────────────────
TOTAL: ${quote.costBreakdown.total.toFixed(2)} EUR

✅ INCLUYE:
• Seguro de mercancía
• Seguimiento en tiempo real
• Gestión de peajes y viñetas
• Conductor profesional

🔗 VER COTIZACIÓN COMPLETA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Acceda al portal del cliente para ver todos los detalles:
${portalUrl}

Desde el portal podrá:
✓ Ver el desglose completo de costos
✓ Consultar la ruta en el mapa
✓ Aceptar la cotización
✓ Proponer modificaciones

📌 VALIDEZ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Esta cotización es válida hasta: ${new Date(quote.validUntil).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}

Para cualquier consulta, no dude en contactarnos.

Saludos cordiales,
Equipo de Logística

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Cotización generada automáticamente por nuestro asistente inteligente LUC1
`;

    return {
      subject,
      content: content.trim(),
      recipient: quote.client.email,
      portalUrl
    };
  }
}

module.exports = QuoteController;