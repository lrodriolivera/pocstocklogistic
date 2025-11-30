const puppeteer = require('puppeteer');
const path = require('path');

class PDFService {
  static async generateQuotePDF(quoteData, selectedOption) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Set page format
      await page.setViewport({ width: 1280, height: 800 });

      // Generate HTML content for PDF
      const htmlContent = PDFService.generateQuoteHTML(quoteData, selectedOption);

      // Set HTML content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });

      await browser.close();

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  static generateQuoteHTML(quoteData, selectedOption) {
    const option = selectedOption || quoteData.alternatives[0];
    const route = quoteData.route;
    const costBreakdown = quoteData.costBreakdown;

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotización - Stock Logistic</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #fff;
            }

            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }

            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3B82F6;
                padding-bottom: 20px;
            }

            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #3B82F6;
                margin-bottom: 10px;
            }

            .subtitle {
                color: #666;
                font-size: 14px;
            }

            .quote-info {
                background-color: #F8FAFC;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            }

            .quote-info h2 {
                color: #1F2937;
                margin-bottom: 15px;
                font-size: 20px;
            }

            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }

            .info-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #E5E7EB;
            }

            .info-label {
                font-weight: 600;
                color: #374151;
            }

            .info-value {
                color: #111827;
            }

            .route-section {
                margin-bottom: 30px;
            }

            .route-header {
                background-color: #3B82F6;
                color: white;
                padding: 15px;
                border-radius: 8px 8px 0 0;
                font-size: 18px;
                font-weight: 600;
            }

            .route-details {
                background-color: #EFF6FF;
                padding: 20px;
                border-radius: 0 0 8px 8px;
            }

            .route-path {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 15px;
            }

            .route-point {
                text-align: center;
                flex: 1;
            }

            .route-point strong {
                display: block;
                color: #1F2937;
                margin-bottom: 5px;
            }

            .route-arrow {
                color: #3B82F6;
                font-size: 24px;
                margin: 0 20px;
            }

            .service-section {
                margin-bottom: 30px;
            }

            .service-header {
                background-color: #10B981;
                color: white;
                padding: 15px;
                border-radius: 8px 8px 0 0;
                font-size: 18px;
                font-weight: 600;
            }

            .service-details {
                background-color: #F0FDF4;
                padding: 20px;
                border-radius: 0 0 8px 8px;
            }

            .service-type {
                background-color: #10B981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                display: inline-block;
                margin-bottom: 15px;
                font-weight: 600;
            }

            .price-highlight {
                font-size: 32px;
                font-weight: bold;
                color: #10B981;
                text-align: center;
                margin: 20px 0;
            }

            .cost-breakdown {
                margin-bottom: 30px;
            }

            .cost-header {
                background-color: #8B5CF6;
                color: white;
                padding: 15px;
                border-radius: 8px 8px 0 0;
                font-size: 18px;
                font-weight: 600;
            }

            .cost-details {
                background-color: #FAF5FF;
                padding: 20px;
                border-radius: 0 0 8px 8px;
            }

            .cost-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #E5E7EB;
            }

            .cost-item:last-child {
                border-bottom: none;
                font-weight: 600;
                color: #8B5CF6;
                padding-top: 15px;
                border-top: 2px solid #8B5CF6;
            }

            .toll-breakdown {
                margin-left: 20px;
                font-size: 14px;
                color: #666;
            }

            .features {
                margin-bottom: 30px;
            }

            .features-header {
                background-color: #F59E0B;
                color: white;
                padding: 15px;
                border-radius: 8px 8px 0 0;
                font-size: 18px;
                font-weight: 600;
            }

            .features-list {
                background-color: #FFFBEB;
                padding: 20px;
                border-radius: 0 0 8px 8px;
            }

            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }

            .feature-check {
                color: #10B981;
                margin-right: 10px;
                font-weight: bold;
            }

            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #E5E7EB;
                color: #666;
                font-size: 12px;
            }

            .footer strong {
                color: #3B82F6;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="logo">🚛 STOCK LOGISTIC</div>
                <div class="subtitle">Sistema de Cotizaciones Inteligente</div>
            </div>

            <!-- Quote Information -->
            <div class="quote-info">
                <h2>Información de la Cotización</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">ID de Cotización:</span>
                        <span class="info-value">${quoteData.quoteId || 'SL-' + Date.now()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fecha:</span>
                        <span class="info-value">${formatDate(new Date())}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Peso de Carga:</span>
                        <span class="info-value">${quoteData.weight || 'No especificado'} kg</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Validez:</span>
                        <span class="info-value">7 días</span>
                    </div>
                </div>
            </div>

            <!-- Route Section -->
            <div class="route-section">
                <div class="route-header">📍 Detalles de la Ruta</div>
                <div class="route-details">
                    <div class="route-path">
                        <div class="route-point">
                            <strong>Origen</strong>
                            <div>${route.origin}</div>
                        </div>
                        <div class="route-arrow">→</div>
                        <div class="route-point">
                            <strong>Destino</strong>
                            <div>${route.destination}</div>
                        </div>
                    </div>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Distancia:</span>
                            <span class="info-value">${route.distance} km</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Tiempo Estimado:</span>
                            <span class="info-value">${option.transitTime || route.duration || 'N/A'} días</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Service Section -->
            <div class="service-section">
                <div class="service-header">🚀 Servicio Seleccionado</div>
                <div class="service-details">
                    <div class="service-type">${option.type?.toUpperCase() || 'ESTÁNDAR'}</div>
                    <div class="price-highlight">${formatCurrency(option.price)}</div>
                    <div style="text-align: center; color: #666; margin-bottom: 15px;">
                        ${option.description || 'Servicio de transporte profesional'}
                    </div>
                </div>
            </div>

            <!-- Cost Breakdown -->
            ${costBreakdown ? `
            <div class="cost-breakdown">
                <div class="cost-header">💰 Desglose de Costos</div>
                <div class="cost-details">
                    <div class="cost-item">
                        <span>Transporte Base:</span>
                        <span>${formatCurrency(costBreakdown.distanceRate || 0)}</span>
                    </div>
                    <div class="cost-item">
                        <span>Combustible:</span>
                        <span>${formatCurrency(costBreakdown.fuelCost || 0)}</span>
                    </div>
                    <div class="cost-item">
                        <span>Peajes:</span>
                        <span>${formatCurrency(costBreakdown.tollCost || 0)}</span>
                    </div>
                    ${costBreakdown.tollBreakdown ? costBreakdown.tollBreakdown.map(toll => `
                    <div class="toll-breakdown">
                        <div class="cost-item">
                            <span>• ${toll.country}:</span>
                            <span>${formatCurrency(toll.cost)}</span>
                        </div>
                    </div>
                    `).join('') : ''}
                    <div class="cost-item">
                        <span>Conductor:</span>
                        <span>${formatCurrency(costBreakdown.driverCost || 0)}</span>
                    </div>
                    <div class="cost-item">
                        <span>Vehículo:</span>
                        <span>${formatCurrency(costBreakdown.vehicleCost || 0)}</span>
                    </div>
                    <div class="cost-item">
                        <span><strong>TOTAL:</strong></span>
                        <span><strong>${formatCurrency(option.price)}</strong></span>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Features -->
            ${option.features && option.features.length > 0 ? `
            <div class="features">
                <div class="features-header">✅ Servicios Incluidos</div>
                <div class="features-list">
                    ${option.features.map(feature => `
                    <div class="feature-item">
                        <span class="feature-check">✓</span>
                        <span>${feature}</span>
                    </div>
                    `).join('')}
                </div>
            </div>
            ` : `
            <div class="features">
                <div class="features-header">✅ Servicios Incluidos</div>
                <div class="features-list">
                    <div class="feature-item">
                        <span class="feature-check">✓</span>
                        <span>Seguro de transporte incluido</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-check">✓</span>
                        <span>Seguimiento GPS en tiempo real</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-check">✓</span>
                        <span>Soporte 24/7</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-check">✓</span>
                        <span>Gestión de documentación</span>
                    </div>
                </div>
            </div>
            `}

            <!-- Footer -->
            <div class="footer">
                <p><strong>Stock Logistic</strong> - Sistema de Cotizaciones Inteligente</p>
                <p>Generado el ${formatDate(new Date())} | Cotización válida por 7 días</p>
                <p>Para consultas: info@stocklogistic.com | +34 900 000 000</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = PDFService;