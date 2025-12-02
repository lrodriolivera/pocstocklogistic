/**
 * Load Calculator Routes
 */

const express = require('express');
const router = express.Router();
const loadCalculatorController = require('../controllers/loadCalculatorController');

// Rutas principales
router.post('/calculate', loadCalculatorController.calculateLoad);
router.post('/calculate-manual', loadCalculatorController.calculateManualLoad);
router.post('/calculate-advanced', loadCalculatorController.calculateAdvanced);
router.get('/equipment-types', loadCalculatorController.getEquipmentTypes);
router.post('/calculate-price', loadCalculatorController.calculateDetailedPrice);
router.post('/simulate-scenarios', loadCalculatorController.simulateScenarios);

module.exports = router;