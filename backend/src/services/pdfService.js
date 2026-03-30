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
    const alternatives = quoteData.alternatives || [];

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

    const quoteRef = quoteData.quoteId || 'SL-' + Date.now();
    const today = formatDate(new Date());

    // Build pricing options columns if multiple alternatives exist
    const hasMulitpleOptions = alternatives.length > 1;
    const pricingOptionsHTML = hasMulitpleOptions ? `
      <div style="margin-bottom: 28px;">
        <div style="background-color: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Opciones de Precio</div>
        <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f0f4ff;">
                <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Concepto</th>
                ${alternatives.map(alt => `
                  <th style="padding: 10px 14px; text-align: center; font-size: 12px; color: #1e40af; font-weight: 700; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb;">${(alt.type || 'Estandar').toUpperCase()}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Precio</td>
                ${alternatives.map(alt => `
                  <td style="padding: 8px 14px; text-align: center; font-size: 14px; font-weight: 700; color: #1e40af; border-bottom: 1px solid #f3f4f6; border-left: 1px solid #e5e7eb;">${formatCurrency(alt.price)}</td>
                `).join('')}
              </tr>
              <tr style="background-color: #fafbfc;">
                <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Transito</td>
                ${alternatives.map(alt => `
                  <td style="padding: 8px 14px; text-align: center; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6; border-left: 1px solid #e5e7eb;">${alt.transitTime || 'N/A'} dias</td>
                `).join('')}
              </tr>
              <tr>
                <td style="padding: 8px 14px; font-size: 12px; color: #374151;">Descripcion</td>
                ${alternatives.map(alt => `
                  <td style="padding: 8px 14px; text-align: center; font-size: 11px; color: #6b7280; border-left: 1px solid #e5e7eb;">${alt.description || '-'}</td>
                `).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    ` : '';

    // Build toll breakdown rows
    const tollRows = costBreakdown && costBreakdown.tollBreakdown
      ? costBreakdown.tollBreakdown.map(toll => `
        <tr style="background-color: #fafbfc;">
          <td style="padding: 6px 14px 6px 30px; font-size: 11px; color: #9ca3af; border-bottom: 1px solid #f3f4f6;">- ${toll.country}</td>
          <td style="padding: 6px 14px; text-align: right; font-size: 11px; color: #9ca3af; border-bottom: 1px solid #f3f4f6;">${formatCurrency(toll.cost)}</td>
        </tr>
      `).join('')
      : '';

    // Calculate subtotal, margin, vat
    const subtotal = costBreakdown
      ? (costBreakdown.distanceRate || 0) + (costBreakdown.fuelCost || 0) + (costBreakdown.tollCost || 0) + (costBreakdown.driverCost || 0) + (costBreakdown.vehicleCost || 0)
      : 0;
    const margin = costBreakdown?.margin || 0;
    const vat = costBreakdown?.vat || 0;

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cotizacion ${quoteRef} - AXEL</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; background-color: #ffffff; font-size: 13px; line-height: 1.5;">
      <div style="max-width: 780px; margin: 0 auto; padding: 24px 32px;">

        <!-- ========== HEADER ========== -->
        <table style="width: 100%; margin-bottom: 24px;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <div style="font-size: 32px; font-weight: 800; color: #1e40af; letter-spacing: 2px; margin-bottom: 2px;">AXEL</div>
              <div style="font-size: 11px; color: #6b7280; letter-spacing: 0.5px;">Sistema de Cotizaciones Inteligente</div>
            </td>
            <td style="vertical-align: top; text-align: right; width: 50%;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">COTIZACION</div>
              <div style="font-size: 16px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">${quoteRef}</div>
              <div style="font-size: 12px; color: #374151;">${today}</div>
              <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">Validez: 7 dias</div>
            </td>
          </tr>
        </table>
        <div style="height: 3px; background: linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #93c5fd 100%); border-radius: 2px; margin-bottom: 28px;"></div>

        <!-- ========== CLIENT SECTION ========== -->
        <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px;">
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 8px;">Datos del Cliente</div>
          <table style="width: 100%;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 16px;">
                <div style="font-size: 12px; color: #6b7280;">Empresa</div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">${quoteData.client?.company || 'No especificado'}</div>
                <div style="font-size: 12px; color: #6b7280;">Contacto</div>
                <div style="font-size: 13px; color: #1f2937;">${quoteData.client?.contactName || '-'}</div>
              </td>
              <td style="width: 50%; vertical-align: top;">
                <div style="font-size: 12px; color: #6b7280;">Email</div>
                <div style="font-size: 13px; color: #1f2937; margin-bottom: 6px;">${quoteData.client?.email || '-'}</div>
                <div style="font-size: 12px; color: #6b7280;">Telefono</div>
                <div style="font-size: 13px; color: #1f2937;">${quoteData.client?.phone || '-'}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- ========== ROUTE SECTION ========== -->
        <div style="margin-bottom: 28px;">
          <div style="background-color: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Ruta de Transporte</div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; padding: 20px;">
            <table style="width: 100%; margin-bottom: 14px;">
              <tr>
                <td style="width: 40%; text-align: center; vertical-align: top;">
                  <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Origen</div>
                  <div style="font-size: 15px; font-weight: 700; color: #1f2937;">${route.origin}</div>
                </td>
                <td style="width: 20%; text-align: center; vertical-align: middle;">
                  <div style="font-size: 24px; color: #3b82f6; font-weight: 300;">&#8594;</div>
                  <div style="font-size: 11px; color: #3b82f6; font-weight: 600;">${route.distance} km</div>
                </td>
                <td style="width: 40%; text-align: center; vertical-align: top;">
                  <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px;">Destino</div>
                  <div style="font-size: 15px; font-weight: 700; color: #1f2937;">${route.destination}</div>
                </td>
              </tr>
            </table>
            <table style="width: 100%; border-top: 1px solid #e5e7eb; padding-top: 12px;">
              <tr>
                <td style="width: 33%; text-align: center;">
                  <div style="font-size: 11px; color: #6b7280;">Transito estimado</div>
                  <div style="font-size: 14px; font-weight: 700; color: #1e40af;">${option.transitTime || route.duration || 'N/A'} dias</div>
                </td>
                <td style="width: 33%; text-align: center;">
                  <div style="font-size: 11px; color: #6b7280;">Distancia</div>
                  <div style="font-size: 14px; font-weight: 700; color: #1e40af;">${route.distance} km</div>
                </td>
                <td style="width: 33%; text-align: center;">
                  <div style="font-size: 11px; color: #6b7280;">Paises</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1e40af;">${route.countries ? route.countries.join(' > ') : '-'}</div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- ========== CARGO SECTION ========== -->
        <div style="margin-bottom: 28px;">
          <div style="background-color: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Informacion de Carga</div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; padding: 16px 20px;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 25%; text-align: center; padding: 8px;">
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Tipo</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1f2937;">${quoteData.cargo?.type || 'General'}</div>
                </td>
                <td style="width: 25%; text-align: center; padding: 8px;">
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Peso</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1f2937;">${quoteData.weight || quoteData.cargo?.weight || 'N/A'} kg</div>
                </td>
                <td style="width: 25%; text-align: center; padding: 8px;">
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Volumen</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1f2937;">${quoteData.cargo?.volume || 'N/A'} m3</div>
                </td>
                <td style="width: 25%; text-align: center; padding: 8px;">
                  <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Metros lineales</div>
                  <div style="font-size: 13px; font-weight: 600; color: #1f2937;">${quoteData.cargo?.linearMeters || 'N/A'} m</div>
                </td>
              </tr>
            </table>
            ${quoteData.cargo?.description ? `
            <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 10px;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">Descripcion</div>
              <div style="font-size: 12px; color: #374151;">${quoteData.cargo.description}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- ========== COST BREAKDOWN TABLE ========== -->
        ${costBreakdown ? `
        <div style="margin-bottom: 28px;">
          <div style="background-color: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Desglose de Costos</div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f0f4ff;">
                  <th style="padding: 10px 14px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Concepto</th>
                  <th style="padding: 10px 14px; text-align: right; font-size: 12px; color: #6b7280; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Tarifa por distancia</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(costBreakdown.distanceRate || 0)}</td>
                </tr>
                <tr style="background-color: #fafbfc;">
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Combustible</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(costBreakdown.fuelCost || 0)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Peajes</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(costBreakdown.tollCost || 0)}</td>
                </tr>
                ${tollRows}
                <tr style="background-color: #fafbfc;">
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Costo del conductor</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(costBreakdown.driverCost || 0)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Vehiculo</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(costBreakdown.vehicleCost || 0)}</td>
                </tr>
                <tr style="background-color: #f0f4ff;">
                  <td style="padding: 10px 14px; font-size: 12px; font-weight: 700; color: #1e40af; border-top: 2px solid #c7d7fe;">Subtotal</td>
                  <td style="padding: 10px 14px; text-align: right; font-size: 12px; font-weight: 700; color: #1e40af; border-top: 2px solid #c7d7fe;">${formatCurrency(costBreakdown.subtotal || subtotal)}</td>
                </tr>
                ${margin ? `
                <tr>
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">Margen comercial</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(margin)}</td>
                </tr>
                ` : ''}
                ${vat ? `
                <tr style="background-color: #fafbfc;">
                  <td style="padding: 8px 14px; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">IVA (21%)</td>
                  <td style="padding: 8px 14px; text-align: right; font-size: 12px; color: #374151; border-bottom: 1px solid #f3f4f6;">${formatCurrency(vat)}</td>
                </tr>
                ` : ''}
                <tr style="background-color: #1e40af;">
                  <td style="padding: 12px 14px; font-size: 14px; font-weight: 800; color: #ffffff;">TOTAL</td>
                  <td style="padding: 12px 14px; text-align: right; font-size: 16px; font-weight: 800; color: #ffffff;">${formatCurrency(option.price)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- ========== PRICING OPTIONS (if multiple) ========== -->
        ${pricingOptionsHTML}

        <!-- ========== SERVICES INCLUDED ========== -->
        <div style="margin-bottom: 28px;">
          <div style="background-color: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Servicios Incluidos</div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; padding: 16px 20px;">
            ${(option.features && option.features.length > 0 ? option.features : [
              'Seguro de transporte incluido',
              'Seguimiento GPS en tiempo real',
              'Soporte 24/7',
              'Gestion de documentacion'
            ]).map(feature => `
              <div style="display: flex; align-items: center; margin-bottom: 6px;">
                <span style="display: inline-block; width: 18px; height: 18px; background-color: #dbeafe; color: #1e40af; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; font-weight: 700; margin-right: 10px;">&#10003;</span>
                <span style="font-size: 12px; color: #374151;">${feature}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ========== TERMS & CONDITIONS ========== -->
        <div style="margin-bottom: 28px;">
          <div style="background-color: #6b7280; color: #ffffff; padding: 10px 16px; border-radius: 6px 6px 0 0; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Terminos y Condiciones</div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px; padding: 16px 20px; font-size: 11px; color: #6b7280; line-height: 1.6;">
            <ol style="margin: 0; padding-left: 16px;">
              <li style="margin-bottom: 4px;">Esta cotizacion es valida por 7 dias naturales a partir de la fecha de emision.</li>
              <li style="margin-bottom: 4px;">Los precios incluyen seguro basico de transporte. Coberturas adicionales bajo solicitud.</li>
              <li style="margin-bottom: 4px;">Los tiempos de transito son estimados y pueden variar por condiciones climaticas, de trafico o aduaneras.</li>
              <li style="margin-bottom: 4px;">Condiciones de pago: 50% al confirmar reserva, 50% contra entrega satisfactoria.</li>
              <li style="margin-bottom: 4px;">Tiempo de carga y descarga incluido: 2 horas. Demoras adicionales se facturaran a 45 EUR/hora.</li>
              <li style="margin-bottom: 4px;">Cancelaciones con menos de 24h de antelacion podran generar un cargo del 30% del valor total.</li>
              <li style="margin-bottom: 4px;">Los peajes y tasas reflejados son estimaciones basadas en tarifas vigentes.</li>
            </ol>
          </div>
        </div>

        <!-- ========== FOOTER ========== -->
        <div style="border-top: 3px solid #1e40af; padding-top: 16px; margin-top: 32px;">
          <table style="width: 100%;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <div style="font-size: 18px; font-weight: 800; color: #1e40af; letter-spacing: 1px; margin-bottom: 4px;">AXEL</div>
                <div style="font-size: 11px; color: #6b7280;">Sistema de Cotizaciones Inteligente</div>
                <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">info@axel.es | +34 900 000 000</div>
              </td>
              <td style="vertical-align: top; text-align: right; width: 50%;">
                <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Documento: ${quoteRef}</div>
                <div style="font-size: 10px; color: #9ca3af; margin-bottom: 2px;">Generado el ${today}</div>
                <div style="font-size: 10px; color: #9ca3af; font-style: italic;">Generado automaticamente por AXEL</div>
              </td>
            </tr>
          </table>
        </div>

      </div>
    </body>
    </html>
    `;
  }
}

module.exports = PDFService;