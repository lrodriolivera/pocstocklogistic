const express = require('express');
const router = express.Router();
const PDFService = require('../services/pdfService');

// POST /api/pdf/quote - Generate and download quote PDF
router.post('/quote', async (req, res) => {
  try {
    const { quoteData, selectedOptionIndex = 0 } = req.body;

    if (!quoteData) {
      return res.status(400).json({
        success: false,
        error: 'Quote data is required'
      });
    }

    // Validate quote data structure
    if (!quoteData.route || !quoteData.alternatives || !Array.isArray(quoteData.alternatives)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quote data structure'
      });
    }

    const selectedOption = quoteData.alternatives[selectedOptionIndex];
    if (!selectedOption) {
      return res.status(400).json({
        success: false,
        error: 'Selected option not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await PDFService.generateQuotePDF(quoteData, selectedOption);

    // Generate filename
    const quoteId = quoteData.quoteId || `SL-${Date.now()}`;
    const filename = `cotizacion-${quoteId}.pdf`;

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      details: error.message
    });
  }
});

// GET /api/pdf/test - Test endpoint for PDF generation
router.get('/test', async (req, res) => {
  try {
    // Test data
    const testQuoteData = {
      quoteId: 'TEST-001',
      weight: 1500,
      route: {
        origin: 'Madrid, España',
        destination: 'París, Francia',
        distance: 1276,
        duration: 13
      },
      alternatives: [{
        type: 'standard',
        price: 3450.00,
        transitTime: '2-3',
        description: 'Servicio estándar con entrega programada',
        features: [
          'Seguro incluido hasta €10,000',
          'Seguimiento GPS',
          'Soporte 24/7',
          'Documentación completa'
        ]
      }],
      costBreakdown: {
        distanceRate: 2500.00,
        fuelCost: 450.00,
        tollCost: 280.00,
        driverCost: 150.00,
        vehicleCost: 70.00,
        tollBreakdown: [
          { country: 'España', cost: 120.00 },
          { country: 'Francia', cost: 160.00 }
        ]
      }
    };

    const pdfBuffer = await PDFService.generateQuotePDF(testQuoteData, testQuoteData.alternatives[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test-cotizacion.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error in PDF test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate test PDF',
      details: error.message
    });
  }
});

module.exports = router;