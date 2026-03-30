/**
 * Email Service - Amazon SES
 * Transactional email service for AXEL logistics platform
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

class EmailService {
  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'eu-west-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    this.fromEmail = process.env.SES_FROM_EMAIL || 'noreply@strixai.es';
    this.appName = 'AXEL';
    this.appUrl = process.env.FRONTEND_URL || 'https://axel.strixai.es';
  }

  /**
   * Send a raw email via SES
   */
  async sendEmail({ to, subject, html, text }) {
    const params = {
      Source: `${this.appName} <${this.fromEmail}>`,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to]
      },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {}
      }
    };

    if (html) params.Message.Body.Html = { Data: html, Charset: 'UTF-8' };
    if (text) params.Message.Body.Text = { Data: text, Charset: 'UTF-8' };

    try {
      const result = await this.client.send(new SendEmailCommand(params));
      console.log('Email sent:', { to, subject, messageId: result.MessageId });
      return { success: true, messageId: result.MessageId };
    } catch (error) {
      console.error('SES send error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // --------------- HTML Layout ---------------

  _wrapHtml(content) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background-color:#1e3a5f;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;letter-spacing:1px;">AXEL</h1>
            <p style="margin:4px 0 0;color:#94b8d4;font-size:12px;">Logistica Inteligente</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f8f9fa;padding:16px 32px;text-align:center;border-top:1px solid #e9ecef;">
            <p style="margin:0;color:#6c757d;font-size:12px;">AXEL - Sistema de Cotizaciones Inteligente</p>
            <p style="margin:4px 0 0;color:#adb5bd;font-size:11px;">STRIX AI SL &bull; Este email fue enviado automaticamente</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // --------------- Template Methods ---------------

  /**
   * Notify the commercial agent that a new quote was generated
   */
  async sendQuoteNotification(agentEmail, quoteData) {
    const { quoteId, route, costBreakdown, client } = quoteData;
    const subject = `Nueva cotizacion generada: ${quoteId}`;

    const html = this._wrapHtml(`
      <h2 style="color:#1e3a5f;margin-top:0;">Nueva Cotizacion Generada</h2>
      <p style="color:#495057;">Se ha generado una nueva cotizacion con los siguientes datos:</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #dee2e6;border-radius:4px;margin:16px 0;">
        <tr style="background-color:#f8f9fa;">
          <td style="font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">ID Cotizacion</td>
          <td style="color:#212529;border-bottom:1px solid #dee2e6;">${quoteId}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">Ruta</td>
          <td style="color:#212529;border-bottom:1px solid #dee2e6;">${route?.origin || 'N/A'} &rarr; ${route?.destination || 'N/A'}</td>
        </tr>
        <tr style="background-color:#f8f9fa;">
          <td style="font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">Cliente</td>
          <td style="color:#212529;border-bottom:1px solid #dee2e6;">${client?.company || client?.name || 'Sin asignar'}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;color:#495057;">Total</td>
          <td style="color:#1e3a5f;font-weight:bold;font-size:18px;">${costBreakdown?.total ? costBreakdown.total.toFixed(2) + ' EUR' : 'N/A'}</td>
        </tr>
      </table>
      <p style="color:#6c757d;font-size:13px;">Accede a la plataforma para ver los detalles completos.</p>
    `);

    const text = `Nueva cotizacion ${quoteId}: ${route?.origin} -> ${route?.destination}. Total: ${costBreakdown?.total?.toFixed(2)} EUR.`;

    return this.sendEmail({ to: agentEmail, subject, html, text });
  }

  /**
   * Notify the agent when a client accepts a quote via the portal
   */
  async sendQuoteAccepted(agentEmail, quoteData) {
    const { quoteId, client, costBreakdown } = quoteData;
    const subject = `Cotizacion aceptada: ${quoteId}`;

    const html = this._wrapHtml(`
      <h2 style="color:#28a745;margin-top:0;">Cotizacion Aceptada</h2>
      <p style="color:#495057;">El cliente ha aceptado la siguiente cotizacion desde el portal:</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #dee2e6;border-radius:4px;margin:16px 0;">
        <tr style="background-color:#f8f9fa;">
          <td style="font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">ID Cotizacion</td>
          <td style="color:#212529;border-bottom:1px solid #dee2e6;">${quoteId}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">Cliente</td>
          <td style="color:#212529;border-bottom:1px solid #dee2e6;">${client?.company || client?.name || 'N/A'}</td>
        </tr>
        <tr style="background-color:#f8f9fa;">
          <td style="font-weight:bold;color:#495057;">Total Aceptado</td>
          <td style="color:#28a745;font-weight:bold;font-size:18px;">${costBreakdown?.total ? costBreakdown.total.toFixed(2) + ' EUR' : 'N/A'}</td>
        </tr>
      </table>
      <p style="color:#495057;"><strong>Accion requerida:</strong> Procede a confirmar la reserva del transporte.</p>
    `);

    const text = `Cotizacion ${quoteId} aceptada por ${client?.company || 'el cliente'}. Total: ${costBreakdown?.total?.toFixed(2)} EUR.`;

    return this.sendEmail({ to: agentEmail, subject, html, text });
  }

  /**
   * Notify the agent when a client rejects a quote via the portal
   */
  async sendQuoteRejected(agentEmail, quoteData) {
    const { quoteId, client, reason } = quoteData;
    const subject = `Cotizacion rechazada: ${quoteId}`;

    const html = this._wrapHtml(`
      <h2 style="color:#dc3545;margin-top:0;">Cotizacion Rechazada</h2>
      <p style="color:#495057;">El cliente ha rechazado la siguiente cotizacion desde el portal:</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="border:1px solid #dee2e6;border-radius:4px;margin:16px 0;">
        <tr style="background-color:#f8f9fa;">
          <td style="font-weight:bold;color:#495057;border-bottom:1px solid #dee2e6;">ID Cotizacion</td>
          <td style="color:#212529;border-bottom:1px solid #dee2e6;">${quoteId}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;color:#495057;${reason ? 'border-bottom:1px solid #dee2e6;' : ''}">Cliente</td>
          <td style="color:#212529;${reason ? 'border-bottom:1px solid #dee2e6;' : ''}">${client?.company || client?.name || 'N/A'}</td>
        </tr>
        ${reason ? `<tr style="background-color:#f8f9fa;">
          <td style="font-weight:bold;color:#495057;">Motivo</td>
          <td style="color:#212529;">${reason}</td>
        </tr>` : ''}
      </table>
      <p style="color:#6c757d;font-size:13px;">Considera hacer seguimiento con el cliente para entender sus necesidades.</p>
    `);

    const text = `Cotizacion ${quoteId} rechazada por ${client?.company || 'el cliente'}.${reason ? ' Motivo: ' + reason : ''}`;

    return this.sendEmail({ to: agentEmail, subject, html, text });
  }

  /**
   * Send welcome email to a new user
   */
  async sendWelcomeEmail(userEmail, userName) {
    const subject = `Bienvenido a ${this.appName}`;

    const html = this._wrapHtml(`
      <h2 style="color:#1e3a5f;margin-top:0;">Bienvenido a AXEL</h2>
      <p style="color:#495057;">Hola <strong>${userName}</strong>,</p>
      <p style="color:#495057;">Tu cuenta en AXEL ha sido creada correctamente. Ya puedes acceder a la plataforma de cotizaciones inteligentes.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${this.appUrl}" style="background-color:#1e3a5f;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">Acceder a AXEL</a>
      </div>
      <p style="color:#6c757d;font-size:13px;">Si tienes alguna pregunta, contacta con tu administrador.</p>
    `);

    const text = `Bienvenido a AXEL, ${userName}. Accede a la plataforma en ${this.appUrl}`;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordReset(email, resetToken) {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;
    const subject = `Restablecer contrasena - ${this.appName}`;

    const html = this._wrapHtml(`
      <h2 style="color:#1e3a5f;margin-top:0;">Restablecer Contrasena</h2>
      <p style="color:#495057;">Hemos recibido una solicitud para restablecer tu contrasena en AXEL.</p>
      <p style="color:#495057;">Haz clic en el siguiente boton para crear una nueva contrasena:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="background-color:#1e3a5f;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;">Restablecer Contrasena</a>
      </div>
      <p style="color:#6c757d;font-size:13px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.</p>
      <p style="color:#adb5bd;font-size:11px;">URL directa: ${resetUrl}</p>
    `);

    const text = `Restablecer contrasena AXEL: ${resetUrl} (expira en 1 hora)`;

    return this.sendEmail({ to: email, subject, html, text });
  }
}

// Singleton instance
let instance = null;

function getEmailService() {
  if (!instance) {
    instance = new EmailService();
  }
  return instance;
}

module.exports = { EmailService, getEmailService };
