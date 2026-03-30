/**
 * 🤖 LUC1Service - Servicio de Integración con LUC1-COMEX
 *
 * ENFOQUE CORREGIDO: LUC1 como analizador inteligente de ofertas reales
 * - Recibe precios finales de múltiples transportistas
 * - Analiza y selecciona la mejor opción
 * - Aplica expertise en productos forestales
 * - Detecta restricciones y factores de riesgo
 *
 * @author AXEL Team
 * @version 2.0.0 - Integrado con Claude Sonnet 4 via HTTP
 */

const axios = require('axios');
const winston = require('winston');
const crypto = require('crypto');

class LUC1Service {
  constructor() {
    this.baseURL = process.env.AI_SERVICE_URL || 'http://localhost:8002';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 150000, // 150 segundos (2.5 min) para análisis complejos con Claude
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.connected = false;
    this.responseCache = new Map();
    
    // Configurar logger específico para LUC1
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/luc1.log',
          maxsize: 5000000, // 5MB
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    // Métricas de rendimiento
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0
    };
  }

  /**
   * 🔌 Conectar con Claude AI Service
   * @returns {Promise<boolean>} Estado de conexión
   */
  async connect() {
    try {
      console.log('🔄 Conectando con Claude AI Service (LUC1)...');
      this.logger.info('Attempting to connect to Claude AI Service', {
        baseURL: this.baseURL
      });

      // Verificar health del servicio
      const response = await this.client.get('/health');

      if (response.data && response.data.status === 'healthy') {
        this.connected = true;
        console.log('✅ Claude AI Service (LUC1) conectado exitosamente');
        console.log(`   Modelo: ${response.data.model || 'Claude Sonnet 4'}`);
        this.logger.info('Claude AI Service connected successfully', {
          model: response.data.model,
          backend_url: response.data.backend_url
        });
        return true;
      } else {
        throw new Error('AI Service unhealthy');
      }
    } catch (error) {
      console.error('❌ Error conectando Claude AI Service:', error.message);
      console.warn('🤖 LUC1 funcionará en modo fallback con lógica de respaldo');
      this.logger.error('Failed to connect to Claude AI Service', {
        error: error.message,
        stack: error.stack
      });
      this.connected = false;
      return false;
    }
  }

  /**
   * 🏥 Validar conexión con el modelo
   * @returns {Promise<Object>} Estado de salud de la conexión
   */
  async validateConnection() {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const startTime = Date.now();
      const response = await this.client.get('/health');
      const responseTime = Date.now() - startTime;

      this.logger.info('Health check successful', { responseTime });

      return {
        connected: true,
        responseTime,
        timestamp: new Date().toISOString(),
        baseURL: this.baseURL,
        model: response.data.model || 'Claude Sonnet 4',
        status: response.data.status
      };
    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🧠 ANÁLISIS PRINCIPAL: Comparar precios de transportistas (MEJORADO con Restricciones)
   *
   * @param {Object} allData - Datos completos para análisis
   * @param {Array} allData.transportistPrices - Precios de transportistas
   * @param {Object} allData.routeData - Información de ruta
   * @param {Array} allData.restrictions - Restricciones detectadas
   * @param {Object} allData.restrictionsData - Datos completos EuropeanRestrictionsService
   * @param {Array} allData.holidays - Festivos en el periodo
   * @param {Object} allData.quoteRequest - Solicitud original
   * @returns {Promise<Object>} Análisis y recomendación LUC1
   */
  async analyzeTransportistPrices(allData) {
    const { transportistPrices, routeData, restrictions, restrictionsData, holidays, quoteRequest } = allData;
    
    // Verificar cache primero
    const cacheKey = this.generateCacheKey(allData);
    const cachedResult = this.getCachedResponse(cacheKey);
    if (cachedResult) {
      this.metrics.cacheHits++;
      this.logger.info('Cache hit for transportist analysis', { cacheKey });
      return cachedResult;
    }

    const prompt = this.buildTransportistAnalysisPrompt(allData);
    const startTime = Date.now();
    
    try {
      console.log('🧠 LUC1 analizando precios de transportistas con Claude...');
      this.logger.info('Starting transportist price analysis', {
        sourcesCount: transportistPrices.length,
        route: `${quoteRequest.route.origin} → ${quoteRequest.route.destination}`,
        cargo: quoteRequest.cargo.type
      });

      if (!this.connected) {
        await this.connect();
      }

      // Crear una sesión única para este análisis
      const analysisSessionId = `luc1_analysis_${Date.now()}`;

      // Llamar a Claude AI Service con el prompt de análisis
      const response = await this.client.post('/analyze/transportist-prices', {
        prompt: prompt,
        sessionId: analysisSessionId,
        context: {
          transportistPrices,
          routeData,
          restrictions,
          quoteRequest
        }
      });

      const responseTime = Date.now() - startTime;
      const claudeResponse = response.data.analysis || response.data.message || response.data.response;

      const analysis = this.parseTransportistAnalysis(claudeResponse, transportistPrices);

      // Añadir métricas al análisis
      analysis.processingTime = responseTime;
      analysis.timestamp = new Date().toISOString();

      // Actualizar métricas
      this.updateMetrics(true, responseTime);

      // Guardar en cache
      this.setCachedResponse(cacheKey, analysis);

      this.logger.info('LUC1 analysis completed successfully', {
        quoteId: quoteRequest.quoteId || 'unknown',
        sourcesAnalyzed: transportistPrices.length,
        recommendedTransportist: analysis.recommendedTransportist,
        basePrice: analysis.basePrice,
        confidence: analysis.confidence,
        processingTime: responseTime
      });

      return analysis;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime);
      
      console.error('❌ LUC1 analysis failed:', error.message);
      this.logger.error('LUC1 analysis failed, using fallback', { 
        error: error.message,
        processingTime: responseTime
      });
      
      return this.fallbackTransportistAnalysis(transportistPrices);
    }
  }

  /**
   * 📝 Construir prompt estructurado para análisis de transportistas (CON RESTRICCIONES EUROPEAS)
   */
  buildTransportistAnalysisPrompt(allData) {
    const { transportistPrices, routeData, restrictions, restrictionsData, holidays, quoteRequest, tollData } = allData;
    const { route, cargo, service } = quoteRequest;

    return `
Como experto en logística terrestre europea especializado en análisis de mercado de transporte, evalúa estas ofertas de transportistas para AXEL.

SOLICITUD DE TRANSPORTE:
- Ruta: ${route.origin} → ${route.destination} (${routeData.distance || 'N/A'}km)
- Carga: ${cargo.weight || 'N/A'}kg ${cargo.type || 'general'}
- Volumen: ${cargo.volume || 'N/A'}m³
- Fecha entrega: ${service.deliveryDate || service.pickupDate || 'N/A'}
- Servicios: ${service.additionalServices?.join(', ') || 'Estándar'}

OFERTAS DE TRANSPORTISTAS RECIBIDAS:
${transportistPrices.map(offer => `
📋 TRANSPORTISTA: ${offer.source?.toUpperCase() || 'UNKNOWN'}
- Precio ofertado: €${offer.price} (TODO INCLUIDO)
- Confianza fuente: ${offer.confidence || 85}%
- Tiempo respuesta: ${offer.responseTime || 'N/A'}ms
- Disponibilidad: ${offer.metadata?.availableCarriers || 'N/A'} transportistas
- Nivel servicio: ${offer.metadata?.serviceLevel || 'Estándar'}
- Observaciones: ${JSON.stringify(offer.metadata || {})}
`).join('\n')}

INFORMACIÓN DE VALIDACIÓN:
🗺️ RUTA VERIFICADA:
- Distancia: ${routeData.distance || 'N/A'}km
- Tiempo estimado: ${routeData.duration || 'N/A'} horas
- Países tránsito: ${routeData.countries?.join(' → ') || 'N/A'}
- Rutas principales: ${routeData.mainHighways?.join(', ') || 'N/A'}

💰 ANÁLISIS DE PEAJES (TollGuru):
${tollData ? `
- Costo total peajes: €${tollData.tolls.totalCost}
- Países con peajes: ${tollData.tolls.breakdown?.map(b => `${b.country}: €${b.cost}`).join(', ') || 'N/A'}
- Viñetas requeridas: ${tollData.tolls.vignettes?.length ? tollData.tolls.vignettes.map(v => `${v.country} (€${v.cost})`).join(', ') : 'Ninguna'}
- Peajes especiales: ${tollData.tolls.specialTolls?.length ? tollData.tolls.specialTolls.map(t => `${t.name}: €${t.cost}`).join(', ') : 'Ninguno'}
- Confianza datos: ${tollData.confidence}%
` : '- Datos de peajes no disponibles'}

🚫 ANÁLISIS COMPLETO DE RESTRICCIONES EUROPEAS:
${restrictionsData ? `
📊 RESUMEN RESTRICCIONES:
- Total alertas detectadas: ${restrictionsData.totalAlerts || 0}
- Críticas: ${restrictionsData.summary?.critical || 0}
- Advertencias: ${restrictionsData.summary?.warnings || 0}
- Información: ${restrictionsData.summary?.info || 0}
- Países afectados: ${restrictionsData.affectedCountries?.join(', ') || 'Ninguno'}

📋 ALERTAS ESPECÍFICAS POR PAÍS:
${restrictionsData.alerts?.length > 0 ? restrictionsData.alerts.map(alert => `
🏳️ ${alert.country}: ${alert.message}
   - Tipo: ${alert.type} | Severidad: ${alert.severity}
   - Impacto: ${alert.impact || 'No especificado'}
   ${alert.recommendation ? `- Recomendación: ${alert.recommendation}` : ''}
`).join('') : '- Sin restricciones específicas detectadas'}

📅 FESTIVOS DETECTADOS EN RUTA:
${restrictionsData.holidays?.length > 0 ? restrictionsData.holidays.map(h => `- ${h.date}: ${h.name} (${h.countryCode})`).join('\n') : '- Sin festivos críticos en periodo'}
` : `
🚫 RESTRICCIONES DETECTADAS (Sistema Básico):
${restrictions?.length > 0 ? restrictions.map(r => `- ${r.message} (${r.severity || 'medium'})`).join('\n') : '- Sin restricciones críticas detectadas'}

📅 FESTIVOS PERIODO:
${holidays?.length > 0 ? holidays.map(h => `- ${h.date}: ${h.name} (${h.country})`).join('\n') : '- Sin festivos en periodo de transporte'}
`}

ANÁLISIS REQUERIDO POR LUC1:

1. **EVALUACIÓN DE OFERTAS:**
   - ¿Cuál es el rango de precios razonable para esta ruta/carga?
   - ¿Hay ofertas sospechosamente bajas que pueden indicar mala calidad?
   - ¿Ofertas altas justificadas por servicios premium o restricciones complejas?
   - ¿Qué fuente es más confiable para este corredor específico?
   - ¿Los precios incluyen costos de restricciones (viñetas, peajes especiales, desvíos)?

2. **FACTORES DE RIESGO EUROPEOS:**
   - ¿Restricciones detectadas afectan significativamente tiempo/costo?
   - ¿Festivos nacionales pueden causar retrasos críticos?
   - ¿Hay prohibiciones de circulación que requieren planificación especial?
   - ¿Restricciones de peso/dimensiones afectan vehículo requerido?
   - ¿Mercancía requiere documentación ADR o permisos especiales?
   - ¿Algún transportista puede tener problemas específicos con restricciones de esta ruta?

3. **OPTIMIZACIÓN COMERCIAL CON RESTRICCIONES:**
   - ¿Cuál es el precio recomendado incluyendo costos de restricciones?
   - ¿Margen óptimo considerando complejidad y riesgos adicionales?
   - ¿Nivel de servicio más adecuado para esta combinación ruta/restricciones?
   - ¿Alternativas temporales si hay restricciones críticas?
   - ¿Precio debe incluir prima por gestión de restricciones complejas?

4. **ALERTAS CRÍTICAS EUROPEAS:**
   - ¿Documentación especial ADR/CMR requerida urgentemente?
   - ¿Permisos nacionales adicionales necesarios antes del envío?
   - ¿Restricciones temporales (obras, eventos) pueden impactar la operación?
   - ¿Recomendaciones específicas sobre fechas alternativas?
   - ¿Alertas sobre transportistas que pueden no cumplir restricciones?
   - ¿Costos ocultos por restricciones que cliente debe conocer?

CONTEXTO AXEL:
- Intermediario logístico con 29 años experiencia
- Especializado en productos forestales
- Parte del Grupo Alonso (infraestructura robusta)
- Necesita margen 15-25% sobre costo transportista
- Prioriza calidad y confiabilidad sobre precio mínimo

FORMATO RESPUESTA ESTRUCTURADA:
Analiza paso a paso considerando TODOS los factores (precios, restricciones, peajes, festivos) y termina con:

TRANSPORTISTA_RECOMENDADO: [nombre_fuente]
PRECIO_BASE_OPTIMO: €[cantidad]
MARGEN_SUGERIDO: [porcentaje]%
PRECIO_FINAL_CLIENTE: €[cantidad]
CONFIANZA_DECISION: [porcentaje]%
NIVEL_SERVICIO: [Económico/Estándar/Express]
RESTRICCIONES_IMPACTO: [Alto/Medio/Bajo]
ALERTAS_CRITICAS: [lista de alertas importantes incluyendo restricciones]
RECOMENDACIONES_ESPECIALES: [acciones específicas por restricciones detectadas]
JUSTIFICACION: [explicación completa incluyendo análisis de restricciones]
    `;
  }

  /**
   * 🔍 Parsear respuesta de análisis de transportistas (CON RESTRICCIONES)
   */
  parseTransportistAnalysis(rawResponse, transportistPrices) {
    const analysis = rawResponse;

    // Extraer información estructurada usando regex
    const transportistMatch = analysis.match(/TRANSPORTISTA_RECOMENDADO:\s*([a-zA-Z_]+)/i);
    const priceMatch = analysis.match(/PRECIO_BASE_OPTIMO:\s*€([0-9,]+)/i);
    const marginMatch = analysis.match(/MARGEN_SUGERIDO:\s*([0-9]+)%/i);
    const finalPriceMatch = analysis.match(/PRECIO_FINAL_CLIENTE:\s*€([0-9,]+)/i);
    const confidenceMatch = analysis.match(/CONFIANZA_DECISION:\s*([0-9]+)%/i);
    const serviceLevelMatch = analysis.match(/NIVEL_SERVICIO:\s*([A-Za-z]+)/i);
    const restrictionsImpactMatch = analysis.match(/RESTRICCIONES_IMPACTO:\s*([A-Za-z]+)/i);
    const alertsMatch = analysis.match(/ALERTAS_CRITICAS:\s*(.+?)(?=RECOMENDACIONES_ESPECIALES|JUSTIFICACION|$)/s);
    const recommendationsMatch = analysis.match(/RECOMENDACIONES_ESPECIALES:\s*(.+?)(?=JUSTIFICACION|$)/s);
    const justificationMatch = analysis.match(/JUSTIFICACION:\s*(.+)$/s);
    
    const recommendedTransportist = transportistMatch ? 
      transportistMatch[1].toLowerCase() : 
      this.selectFallbackTransportist(transportistPrices);
      
    const basePrice = priceMatch ? 
      parseInt(priceMatch[1].replace(',', '')) : 
      this.calculateFallbackPrice(transportistPrices);
      
    const margin = marginMatch ? parseInt(marginMatch[1]) : 20;
    const finalPrice = finalPriceMatch ? 
      parseInt(finalPriceMatch[1].replace(',', '')) : 
      Math.round(basePrice * (1 + margin/100));
    
    return {
      recommendedTransportist,
      basePrice,
      suggestedMargin: margin,
      finalPrice,
      confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 80,
      serviceLevel: serviceLevelMatch ? serviceLevelMatch[1] : 'Estándar',
      restrictionsImpact: restrictionsImpactMatch ? restrictionsImpactMatch[1] : 'Medio',
      alerts: this.parseAlerts(alertsMatch ? alertsMatch[1] : ''),
      restrictionsRecommendations: this.parseRecommendations(recommendationsMatch ? recommendationsMatch[1] : ''),
      reasoning: analysis,
      sourcesAnalyzed: transportistPrices.length,
      priceRange: {
        min: Math.min(...transportistPrices.map(p => p.price)),
        max: Math.max(...transportistPrices.map(p => p.price)),
        average: Math.round(transportistPrices.reduce((sum, p) => sum + p.price, 0) / transportistPrices.length)
      },
      outliers: this.detectPriceOutliers(transportistPrices),
      usedAI: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🚫 Análisis de restricciones de ruta
   */
  async analyzeRouteRestrictions(routeData, pickupDate, cargoSpecs) {
    const prompt = `
Analiza restricciones de transporte terrestre para esta ruta específica:

RUTA: ${routeData.origin} → ${routeData.destination}
DISTANCIA: ${routeData.distance || 'N/A'}km
PAÍSES TRÁNSITO: ${routeData.countries?.join(' → ') || 'N/A'}
FECHA SALIDA: ${pickupDate}
CARGA: ${cargoSpecs.weight || 'N/A'}kg, ${cargoSpecs.type || 'general'}
MERCANCÍA PELIGROSA: ${cargoSpecs.isHazardous ? 'SÍ (ADR)' : 'NO'}

VERIFICAR ESPECÍFICAMENTE:
1. Prohibiciones circulación domingos/festivos en países tránsito
2. Restricciones peso/dimensiones en autopistas principales
3. Documentación requerida (CMR, ADR, permisos especiales)
4. Peajes especiales o viñetas necesarias
5. Restricciones estacionales o temporales

Responde SOLO alertas CRÍTICAS que puedan impactar la operación.
FORMATO: Lista de alertas con nivel de criticidad.
    `;

    try {
      if (!this.connected) await this.connect();

      const response = await this.client.post('/chat/message', {
        message: prompt,
        sessionId: `restrictions_${Date.now()}`
      });

      const claudeResponse = response.data.message || response.data.response;
      return this.parseRestrictionsResponse(claudeResponse);
    } catch (error) {
      console.error('❌ Error analyzing restrictions:', error.message);
      this.logger.error('Restrictions analysis failed', { error: error.message });
      return { hasRestrictions: false, alerts: [] };
    }
  }

  /**
   * ⚡ Consejo rápido
   */
  async getQuickAdvice(question) {
    try {
      if (!this.connected) await this.connect();

      const enhancedQuestion = `
Como experto en logística terrestre europea para AXEL:
PREGUNTA: ${question}

Responde de forma concisa y práctica, considerando que AXEL es intermediario logístico especializado en productos forestales con 29 años de experiencia.
      `;

      const response = await this.client.post('/chat/message', {
        message: enhancedQuestion,
        sessionId: `quick_advice_${Date.now()}`
      });

      this.logger.info('Quick advice provided', { question: question.slice(0, 100) });
      return response.data.message || response.data.response || 'Consulte con el equipo comercial.';
    } catch (error) {
      console.error('❌ Quick advice failed:', error.message);
      this.logger.error('Quick advice failed', { error: error.message });
      return 'Consulte con el equipo comercial para análisis detallado.';
    }
  }

  // ===== FUNCIONES AUXILIARES =====

  /**
   * 🎯 Detectar outliers en precios
   */
  detectPriceOutliers(prices) {
    if (prices.length < 3) return [];
    
    const sortedPrices = prices.map(p => p.price).sort((a, b) => a - b);
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const outliers = [];
    
    prices.forEach(price => {
      const deviation = Math.abs(price.price - median) / median;
      if (deviation > 0.25) { // Más de 25% desviación
        outliers.push({
          source: price.source,
          price: price.price,
          deviation: Math.round(deviation * 100),
          type: price.price > median ? 'high' : 'low',
          risk: deviation > 0.5 ? 'high' : 'medium'
        });
      }
    });
    
    return outliers;
  }

  /**
   * 🔄 Fallback cuando LUC1 no disponible
   */
  selectFallbackTransportist(transportistPrices) {
    if (!transportistPrices.length) return 'unknown';
    
    // Seleccionar el de mayor confianza
    return transportistPrices.reduce((best, current) => 
      (current.confidence || 0) > (best.confidence || 0) ? current : best
    ).source;
  }

  calculateFallbackPrice(transportistPrices) {
    if (!transportistPrices.length) return 3000; // Precio base fallback
    
    // Promedio ponderado por confianza
    const totalWeight = transportistPrices.reduce((sum, p) => sum + (p.confidence || 85), 0);
    const weightedSum = transportistPrices.reduce((sum, p) => sum + (p.price * (p.confidence || 85)), 0);
    return Math.round(weightedSum / totalWeight);
  }

  fallbackTransportistAnalysis(transportistPrices) {
    const basePrice = this.calculateFallbackPrice(transportistPrices);
    
    return {
      recommendedTransportist: this.selectFallbackTransportist(transportistPrices),
      basePrice,
      suggestedMargin: 20,
      finalPrice: Math.round(basePrice * 1.2),
      confidence: 75,
      serviceLevel: 'Estándar',
      alerts: [{
        type: 'info',
        severity: 'low',
        message: 'Análisis IA no disponible - usando lógica de respaldo'
      }],
      reasoning: 'Análisis automático por fallo de sistema IA. Precio calculado como promedio ponderado de ofertas disponibles.',
      usedFallback: true,
      usedAI: false,
      timestamp: new Date().toISOString(),
      sourcesAnalyzed: transportistPrices.length,
      priceRange: transportistPrices.length > 0 ? {
        min: Math.min(...transportistPrices.map(p => p.price)),
        max: Math.max(...transportistPrices.map(p => p.price)),
        average: basePrice
      } : null
    };
  }

  parseRestrictionsResponse(response) {
    const alerts = [];
    const text = response.toLowerCase();
    
    // Detectar patrones comunes de restricciones
    if (text.includes('domingo') || text.includes('festivo')) {
      alerts.push({
        type: 'warning',
        severity: 'high',
        message: 'Restricciones circulación fines de semana detectadas',
        action: 'Verificar fechas alternativas'
      });
    }
    
    if (text.includes('adr') || text.includes('peligros')) {
      alerts.push({
        type: 'critical',
        severity: 'critical',
        message: 'Documentación ADR requerida para mercancía peligrosa',
        action: 'Verificar certificaciones transportista'
      });
    }
    
    if (text.includes('peso') || text.includes('dimension')) {
      alerts.push({
        type: 'warning',
        severity: 'medium',
        message: 'Posibles restricciones peso/dimensiones en ruta',
        action: 'Validar especificaciones vehículo'
      });
    }
    
    if (text.includes('viñeta') || text.includes('peaje')) {
      alerts.push({
        type: 'info',
        severity: 'low',
        message: 'Viñetas o peajes especiales requeridos',
        action: 'Incluir en cotización'
      });
    }
    
    return {
      hasRestrictions: alerts.length > 0,
      alerts,
      fullAnalysis: response
    };
  }

  parseAlerts(alertsText) {
    if (!alertsText || !alertsText.trim()) return [];

    return alertsText.split('\n')
      .filter(line => line.trim())
      .map(alert => {
        const cleanAlert = alert.replace(/^[-•\s]*/, '').trim();
        return {
          type: cleanAlert.toLowerCase().includes('crítico') ? 'critical' : 'warning',
          severity: cleanAlert.toLowerCase().includes('urgente') ? 'high' : 'medium',
          message: cleanAlert,
          source: 'LUC1 Analysis'
        };
      })
      .filter(alert => alert.message.length > 5); // Filtrar alertas muy cortas
  }

  parseRecommendations(recommendationsText) {
    if (!recommendationsText || !recommendationsText.trim()) return [];

    return recommendationsText.split('\n')
      .filter(line => line.trim())
      .map(rec => {
        const cleanRec = rec.replace(/^[-•\s]*/, '').trim();
        // Retornar solo el texto de la recomendación como string (compatible con modelo Quote)
        return cleanRec;
      })
      .filter(rec => rec.length > 5);
  }

  // ===== CACHE MANAGEMENT =====

  generateCacheKey(data) {
    const keyData = {
      route: data.quoteRequest?.route,
      cargo: data.quoteRequest?.cargo,
      prices: data.transportistPrices?.map(p => ({ source: p.source, price: p.price }))
    };
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex').slice(0, 16);
  }

  getCachedResponse(key) {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hora TTL
      return cached.data;
    }
    return null;
  }

  setCachedResponse(key, data) {
    // Limpiar cache si está muy grande
    if (this.responseCache.size > 1000) {
      const oldestKey = this.responseCache.keys().next().value;
      this.responseCache.delete(oldestKey);
    }
    
    this.responseCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // ===== MÉTRICAS Y MONITOREO =====

  updateMetrics(success, responseTime) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Calcular promedio móvil del tiempo de respuesta
    this.metrics.averageResponseTime = Math.round(
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / this.metrics.totalRequests
    );
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 ? 
        Math.round((this.metrics.successfulRequests / this.metrics.totalRequests) * 100) : 0,
      cacheHitRate: this.metrics.totalRequests > 0 ? 
        Math.round((this.metrics.cacheHits / this.metrics.totalRequests) * 100) : 0,
      connected: this.connected,
      cacheSize: this.responseCache.size
    };
  }

  // ===== LIMPIEZA Y MANTENIMIENTO =====

  clearCache() {
    this.responseCache.clear();
    this.logger.info('Cache cleared manually');
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0
    };
    this.logger.info('Metrics reset');
  }

  async disconnect() {
    this.connected = false;
    this.logger.info('Disconnected from Claude AI Service (LUC1)');
  }
}

module.exports = LUC1Service;