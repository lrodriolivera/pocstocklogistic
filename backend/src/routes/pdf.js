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
      error: 'Failed to generate PDF'
    });
  }
});

module.exports = router;