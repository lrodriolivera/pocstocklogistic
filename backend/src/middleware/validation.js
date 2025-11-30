const { body, query, param } = require('express-validator');

const validateQuoteGeneration = [
  body('route.origin')
    .notEmpty()
    .withMessage('Origen es requerido')
    .isLength({ min: 2 })
    .withMessage('Origen debe tener al menos 2 caracteres'),

  body('route.destination')
    .notEmpty()
    .withMessage('Destino es requerido')
    .isLength({ min: 2 })
    .withMessage('Destino debe tener al menos 2 caracteres'),

  body('cargo.type')
    .notEmpty()
    .withMessage('Tipo de carga es requerido')
    .isIn(['general', 'forestales', 'adr', 'refrigerado', 'especial'])
    .withMessage('Tipo de carga no válido'),

  body('cargo.weight')
    .isFloat({ min: 0.1 })
    .withMessage('Peso debe ser mayor a 0.1 toneladas'),

  body('cargo.volume')
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage('Volumen debe ser mayor a 0.1 m³'),

  body('preferences.serviceType')
    .optional()
    .isIn(['economico', 'estandar', 'express'])
    .withMessage('Tipo de servicio no válido'),

  body('preferences.profitMargin')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Margen de utilidad debe estar entre 0% y 100%'),

  body('pickup.date')
    .isISO8601()
    .withMessage('Fecha de recogida debe ser válida (ISO 8601)')
    .custom((value) => {
      const pickupDate = new Date(value);
      const today = new Date();
      if (pickupDate < today) {
        throw new Error('Fecha de recogida no puede ser en el pasado');
      }
      return true;
    }),

  body('client.company')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Nombre de empresa debe tener al menos 2 caracteres'),

  body('client.email')
    .optional()
    .isEmail()
    .withMessage('Email debe ser válido')
];

const validateRouteQuery = [
  query('origin')
    .notEmpty()
    .withMessage('Origen es requerido en query params')
    .isLength({ min: 2 })
    .withMessage('Origen debe tener al menos 2 caracteres'),

  query('destination')
    .notEmpty()
    .withMessage('Destino es requerido en query params')
    .isLength({ min: 2 })
    .withMessage('Destino debe tener al menos 2 caracteres')
];

const validateQuickAdvice = [
  body('question')
    .notEmpty()
    .withMessage('Pregunta es requerida')
    .isLength({ min: 10, max: 500 })
    .withMessage('Pregunta debe tener entre 10 y 500 caracteres')
];

const validateRestrictionAnalysis = [
  body('route.origin')
    .notEmpty()
    .withMessage('Origen de ruta es requerido'),

  body('route.destination')
    .notEmpty()
    .withMessage('Destino de ruta es requerido'),

  body('pickupDate')
    .optional()
    .isISO8601()
    .withMessage('Fecha debe ser válida (ISO 8601)'),

  body('cargoType')
    .optional()
    .isIn(['general', 'forestales', 'adr', 'refrigerado', 'especial'])
    .withMessage('Tipo de carga no válido')
];

const validateQuoteId = [
  param('id')
    .notEmpty()
    .withMessage('ID de cotización es requerido')
    .isLength({ min: 10 })
    .withMessage('ID de cotización no válido')
];

const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana por IP
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.'
  }
};

const aiRateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 requests de IA por ventana
  message: {
    success: false,
    error: 'Demasiadas consultas a IA. Intente nuevamente en 5 minutos.'
  }
};

module.exports = {
  validateQuoteGeneration,
  validateRouteQuery,
  validateQuickAdvice,
  validateRestrictionAnalysis,
  validateQuoteId,
  rateLimitConfig,
  aiRateLimitConfig
};