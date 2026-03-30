/**
 * Email Routes
 * Endpoints for email operations (admin only)
 */

const express = require('express');
const { authenticateToken, requireMinimumRole } = require('../middleware/auth');
const { getEmailService } = require('../services/emailService');

const router = express.Router();

/**
 * POST /api/email/test
 * Send a test email to verify SES configuration (admin only)
 */
router.post('/test',
  authenticateToken,
  requireMinimumRole('supervisor'),
  async (req, res) => {
    try {
      const { to } = req.body;
      const recipientEmail = to || req.user.email;

      if (!recipientEmail) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un email de destino'
        });
      }

      const emailService = getEmailService();
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject: 'AXEL - Email de prueba',
        html: emailService._wrapHtml(`
          <h2 style="color:#1e3a5f;margin-top:0;">Email de Prueba</h2>
          <p style="color:#495057;">Este es un email de prueba del sistema AXEL.</p>
          <p style="color:#495057;">Si recibes este mensaje, la configuracion de Amazon SES funciona correctamente.</p>
          <p style="color:#6c757d;font-size:13px;">Enviado por: ${req.user.fullName || req.user.firstName || 'Admin'} (${req.user.email})</p>
          <p style="color:#adb5bd;font-size:11px;">Timestamp: ${new Date().toISOString()}</p>
        `),
        text: `AXEL - Email de prueba. Si recibes este mensaje, SES funciona correctamente. Enviado: ${new Date().toISOString()}`
      });

      if (result.success) {
        res.json({
          success: true,
          message: `Email de prueba enviado a ${recipientEmail}`,
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Error enviando email de prueba',
          details: result.error
        });
      }
    } catch (error) {
      console.error('Error en test email:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno enviando email',
        message: error.message
      });
    }
  }
);

module.exports = router;
