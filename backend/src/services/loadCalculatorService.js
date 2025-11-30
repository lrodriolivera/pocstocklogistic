/**
 * Load Calculator Service
 * Calcula metros lineales y determina tipo de transporte (LTL/FTL)
 */

class LoadCalculatorService {
  constructor() {
    // Dimensiones estándar de camión (Europa)
    this.truckDimensions = {
      standard: {
        length: 13.6,  // metros
        width: 2.45,   // metros
        height: 2.7,   // metros
        maxWeight: 24000, // kg
        linearMeters: 13.6
      },
      mega: {
        length: 13.6,
        width: 2.45,
        height: 3.0,
        maxWeight: 24000,
        linearMeters: 13.6
      },
      jumbo: {
        length: 13.6,
        width: 2.45,
        height: 3.0,
        maxWeight: 24000,
        linearMeters: 13.6,
        volumeCapacity: 100 // m³
      }
    };

    // Tipos de equipamiento estándar y personalizados
    this.equipmentTypes = {
      // Pallets estándar
      europallet: {
        name: 'Europallet (EUR/EPAL)',
        type: 'pallet',
        length: 1.2,    // metros
        width: 0.8,     // metros
        height: 0.144,  // metros (pallet base)
        maxHeight: 2.2, // metros (con carga)
        maxWeight: 1500, // kg
        stackable: true,
        linearMeter: 0.4 // Un europallet = 0.4 metros lineales
      },
      industrialPallet: {
        name: 'Industrial Pallet',
        length: 1.2,
        width: 1.0,
        height: 0.15,
        maxHeight: 2.2,
        maxWeight: 2000,
        stackable: true,
        linearMeter: 0.4
      },
      ukPallet: {
        name: 'UK Pallet',
        length: 1.2,
        width: 1.0,
        height: 0.163,
        maxHeight: 2.2,
        maxWeight: 1500,
        stackable: true,
        linearMeter: 0.4
      },
      halfPallet: {
        name: 'Half Pallet',
        length: 0.8,
        width: 0.6,
        height: 0.144,
        maxHeight: 2.2,
        maxWeight: 500,
        stackable: true,
        linearMeter: 0.27
      },
      quarterPallet: {
        name: 'Quarter Pallet',
        length: 0.6,
        width: 0.4,
        height: 0.144,
        maxHeight: 2.2,
        maxWeight: 250,
        stackable: true,
        linearMeter: 0.2
      },
      rollCage: {
        name: 'Roll Cage',
        length: 0.8,
        width: 0.6,
        height: 1.8,
        maxHeight: 1.8,
        maxWeight: 500,
        stackable: false,
        linearMeter: 0.27
      },
      ibc: {
        name: 'IBC Container',
        length: 1.2,
        width: 1.0,
        height: 1.15,
        maxHeight: 1.15,
        maxWeight: 1500,
        stackable: true,
        linearMeter: 0.4
      },
      // Tipos personalizados como Pier2Pier
      customBox: {
        name: 'Caja Personalizada',
        type: 'box',
        customDimensions: true,
        stackable: true,
        allowRotation: true
      },
      customCylinder: {
        name: 'Cilindro Personalizado',
        type: 'cylinder',
        customDimensions: true,
        stackable: true,
        allowRotation: true
      }
    };

    // Factores de precio por tipo de servicio
    this.pricingFactors = {
      ltl: {
        basePrice: 35,    // €/metro lineal
        minCharge: 150,   // € mínimo
        weightFactor: 0.05, // €/kg adicional
        volumeFactor: 45,   // €/m³
        distanceFactor: 0.12 // €/km
      },
      ftl: {
        basePrice: 1200,   // € base por camión completo
        distanceFactor: 1.2, // €/km
        urgencyMultiplier: {
          standard: 1.0,
          express: 1.3,
          urgent: 1.5
        }
      }
    };
  }

  /**
   * Calcula metros lineales de una carga con variables avanzadas estilo Pier2Pier
   */
  calculateLinearMeters(items) {
    let totalLinearMeters = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    const loadDetails = [];

    for (const item of items) {
      // Saltar items excluidos
      if (item.includeInLoad === false) {
        continue;
      }

      const equipment = this.equipmentTypes[item.type];
      if (!equipment) {
        throw new Error(`Tipo de equipamiento no válido: ${item.type}`);
      }

      let itemLinearMeters = 0;
      let itemVolume = 0;
      let dimensions = {};

      if (equipment.customDimensions && item.dimensions) {
        // Cajas y cilindros personalizados
        if (equipment.type === 'box') {
          dimensions = this.calculateBoxDimensions(item);
        } else if (equipment.type === 'cylinder') {
          dimensions = this.calculateCylinderDimensions(item);
        }

        itemLinearMeters = this.calculateCustomLinearMeters(
          dimensions,
          item.quantity || 1,
          item.allowRotation !== false,
          item.stackingOptions
        );

        itemVolume = dimensions.volume * (item.quantity || 1);
      } else {
        // Para equipamiento estándar (pallets, IBC, etc.)
        itemLinearMeters = this.calculateStandardLinearMeters(equipment, item);
        const height = item.height || equipment.maxHeight;
        itemVolume = equipment.length * equipment.width * height * (item.quantity || 1);
        dimensions = {
          length: equipment.length,
          width: equipment.width,
          height: height,
          volume: equipment.length * equipment.width * height
        };
      }

      totalLinearMeters += itemLinearMeters;
      totalWeight += (item.weightPerPiece || 0) * (item.quantity || 1);
      totalVolume += itemVolume;

      loadDetails.push({
        type: item.type,
        name: item.name || equipment.name || 'Custom',
        description: equipment.name || 'Custom',
        quantity: item.quantity || 1,
        dimensions: dimensions,
        linearMeters: itemLinearMeters,
        weight: (item.weightPerPiece || 0) * (item.quantity || 1),
        weightPerPiece: item.weightPerPiece || 0,
        volume: itemVolume,
        color: item.color || '#0000FF',
        allowRotation: item.allowRotation !== false,
        stackingOptions: item.stackingOptions || {
          allowStackingOn: true,
          allowStackingUnder: true
        },
        includeInLoad: item.includeInLoad !== false
      });
    }

    return {
      totalLinearMeters: Math.round(totalLinearMeters * 100) / 100,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalVolume: Math.round(totalVolume * 1000) / 1000,
      loadDetails,
      totalItems: items.filter(item => item.includeInLoad !== false).length
    };
  }

  /**
   * Calcula dimensiones para cajas personalizadas
   */
  calculateBoxDimensions(item) {
    const dims = item.dimensions;
    return {
      length: dims.length / 100, // Convertir cm a metros
      width: dims.width / 100,
      height: dims.height / 100,
      volume: (dims.length * dims.width * dims.height) / 1000000 // cm³ a m³
    };
  }

  /**
   * Calcula dimensiones para cilindros personalizados
   */
  calculateCylinderDimensions(item) {
    const dims = item.dimensions;
    const radius = dims.diameter / 200; // cm a metros, dividido por 2 para radio
    const height = dims.height / 100; // cm a metros

    return {
      length: dims.diameter / 100,
      width: dims.diameter / 100,
      height: height,
      diameter: dims.diameter / 100,
      volume: Math.PI * Math.pow(radius, 2) * height // π * r² * h
    };
  }

  /**
   * Calcula metros lineales para equipamiento estándar
   */
  calculateStandardLinearMeters(equipment, item) {
    const quantity = item.quantity || 1;

    // Si no son apilables o no permite apilado, cada uno cuenta completo
    if (!equipment.stackable || item.stackingOptions?.allowStackingOn === false) {
      return equipment.linearMeter * quantity;
    }

    // Optimización para items apilables
    const itemsPerRow = Math.floor(2.45 / equipment.width); // Ancho del camión
    const rows = Math.ceil(quantity / itemsPerRow);
    return equipment.linearMeter * rows;
  }

  /**
   * Calcula metros lineales para dimensiones personalizadas con rotación y apilado
   */
  calculateCustomLinearMeters(dimensions, quantity, allowRotation = true, stackingOptions = {}) {
    const truckWidth = 2.45; // metros
    let effectiveLength = dimensions.length;
    let effectiveWidth = dimensions.width;

    // Considerar rotación si está permitida
    if (allowRotation) {
      // Optimizar orientación para usar menos metros lineales
      if (dimensions.width > dimensions.length) {
        effectiveLength = dimensions.width;
        effectiveWidth = dimensions.length;
      }
    }

    // Calcular cuántas unidades caben a lo ancho
    const unitsPerRow = Math.floor(truckWidth / effectiveWidth);

    // Calcular filas necesarias considerando apilado
    let rowsNeeded;
    if (stackingOptions.allowStackingOn !== false && stackingOptions.allowStackingUnder !== false) {
      // Puede apilarse, optimizar distribución
      rowsNeeded = Math.ceil(quantity / unitsPerRow);
    } else {
      // No puede apilarse, cada unidad necesita su espacio
      rowsNeeded = Math.ceil(quantity / unitsPerRow);
    }

    return effectiveLength * rowsNeeded;
  }

  /**
   * Determina si usar LTL o FTL basado en la carga
   */
  determineTransportType(loadMetrics) {
    const { totalLinearMeters, totalWeight, totalVolume } = loadMetrics;
    const truck = this.truckDimensions.standard;

    // Porcentaje de utilización del camión
    const linearUtilization = (totalLinearMeters / truck.linearMeters) * 100;
    const weightUtilization = (totalWeight / truck.maxWeight) * 100;
    const volumeUtilization = (totalVolume / (truck.length * truck.width * truck.height)) * 100;

    // Criterios para FTL
    const isFTL =
      linearUtilization >= 65 || // Más del 65% de metros lineales
      weightUtilization >= 70 || // Más del 70% del peso máximo
      volumeUtilization >= 60 || // Más del 60% del volumen
      totalLinearMeters >= 8.5;  // Más de 8.5 metros lineales

    return {
      type: isFTL ? 'FTL' : 'LTL',
      utilization: {
        linear: Math.round(linearUtilization * 10) / 10,
        weight: Math.round(weightUtilization * 10) / 10,
        volume: Math.round(volumeUtilization * 10) / 10
      },
      recommendation: isFTL
        ? 'Se recomienda FTL (Camión Completo) por mejor eficiencia de costos'
        : 'Se recomienda LTL (Grupaje) para optimizar costos en cargas parciales',
      details: {
        linearMeters: totalLinearMeters,
        maxLinearMeters: truck.linearMeters,
        weight: totalWeight,
        maxWeight: truck.maxWeight,
        volume: totalVolume,
        maxVolume: truck.length * truck.width * truck.height
      }
    };
  }

  /**
   * Calcula el precio estimado según tipo de transporte
   */
  calculatePrice(loadMetrics, transportType, distance, options = {}) {
    const { totalLinearMeters, totalWeight, totalVolume } = loadMetrics;
    const { urgency = 'standard', additionalServices = [] } = options;

    let basePrice = 0;
    let breakdown = {};

    if (transportType === 'LTL') {
      // Cálculo para Grupaje (LTL)
      const pricing = this.pricingFactors.ltl;

      // Precio base por metro lineal
      const linearMeterPrice = totalLinearMeters * pricing.basePrice;

      // Precio por peso (si excede cierto umbral)
      const weightPrice = totalWeight > 1000
        ? (totalWeight - 1000) * pricing.weightFactor
        : 0;

      // Precio por volumen
      const volumePrice = totalVolume * pricing.volumeFactor;

      // Precio por distancia
      const distancePrice = distance * pricing.distanceFactor * totalLinearMeters;

      basePrice = Math.max(
        linearMeterPrice + weightPrice + volumePrice + distancePrice,
        pricing.minCharge
      );

      breakdown = {
        linearMeter: linearMeterPrice,
        weight: weightPrice,
        volume: volumePrice,
        distance: distancePrice,
        minimum: pricing.minCharge
      };
    } else {
      // Cálculo para Camión Completo (FTL)
      const pricing = this.pricingFactors.ftl;

      const distancePrice = distance * pricing.distanceFactor;
      const urgencyMultiplier = pricing.urgencyMultiplier[urgency] || 1;

      basePrice = (pricing.basePrice + distancePrice) * urgencyMultiplier;

      breakdown = {
        base: pricing.basePrice,
        distance: distancePrice,
        urgency: urgency !== 'standard' ? basePrice * (urgencyMultiplier - 1) : 0
      };
    }

    // Servicios adicionales
    let additionalCosts = 0;
    additionalServices.forEach(service => {
      switch (service) {
        case 'tailgate':
          additionalCosts += 50;
          break;
        case 'insideDelivery':
          additionalCosts += 75;
          break;
        case 'appointmentDelivery':
          additionalCosts += 30;
          break;
        case 'hazmat':
          additionalCosts += basePrice * 0.25; // 25% adicional
          break;
        case 'tempControlled':
          additionalCosts += basePrice * 0.30; // 30% adicional
          break;
      }
    });

    const totalPrice = basePrice + additionalCosts;

    return {
      transportType,
      basePrice: Math.round(basePrice * 100) / 100,
      additionalCosts: Math.round(additionalCosts * 100) / 100,
      totalPrice: Math.round(totalPrice * 100) / 100,
      breakdown,
      pricePerLinearMeter: transportType === 'LTL'
        ? Math.round((totalPrice / totalLinearMeters) * 100) / 100
        : null
    };
  }

  /**
   * Optimiza la disposición de la carga
   */
  optimizeLoad(items) {
    // Ordenar por tamaño y peso para optimización
    const sortedItems = [...items].sort((a, b) => {
      const equipA = this.equipmentTypes[a.type];
      const equipB = this.equipmentTypes[b.type];

      // Priorizar items no apilables
      if (!equipA.stackable && equipB.stackable) return -1;
      if (equipA.stackable && !equipB.stackable) return 1;

      // Luego por peso
      return (b.weight || 0) - (a.weight || 0);
    });

    const optimization = {
      originalOrder: items,
      optimizedOrder: sortedItems,
      instructions: [],
      spaceUtilization: 0
    };

    // Generar instrucciones de carga
    let currentLinearPosition = 0;
    sortedItems.forEach((item, index) => {
      const equipment = this.equipmentTypes[item.type];
      optimization.instructions.push({
        step: index + 1,
        item: equipment.name || 'Custom',
        quantity: item.quantity || 1,
        position: `Desde ${currentLinearPosition.toFixed(2)}m`,
        notes: !equipment.stackable ? 'No apilable' : 'Puede apilarse'
      });
      currentLinearPosition += equipment.linearMeter * (item.quantity || 1);
    });

    return optimization;
  }

  /**
   * Valida si la carga cabe en el camión
   */
  validateLoad(loadMetrics, truckType = 'standard') {
    const truck = this.truckDimensions[truckType];
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Validar metros lineales
    if (loadMetrics.totalLinearMeters > truck.linearMeters) {
      validation.valid = false;
      validation.errors.push(
        `Excede metros lineales: ${loadMetrics.totalLinearMeters}m de ${truck.linearMeters}m máximo`
      );
    }

    // Validar peso
    if (loadMetrics.totalWeight > truck.maxWeight) {
      validation.valid = false;
      validation.errors.push(
        `Excede peso máximo: ${loadMetrics.totalWeight}kg de ${truck.maxWeight}kg máximo`
      );
    }

    // Validar volumen
    const maxVolume = truck.length * truck.width * truck.height;
    if (loadMetrics.totalVolume > maxVolume) {
      validation.valid = false;
      validation.errors.push(
        `Excede volumen máximo: ${loadMetrics.totalVolume}m³ de ${maxVolume}m³ máximo`
      );
    }

    // Warnings
    if (loadMetrics.totalLinearMeters > truck.linearMeters * 0.9) {
      validation.warnings.push('Carga cerca del límite de metros lineales (>90%)');
    }

    if (loadMetrics.totalWeight > truck.maxWeight * 0.9) {
      validation.warnings.push('Carga cerca del límite de peso (>90%)');
    }

    return validation;
  }

  /**
   * Calcula carga avanzada con tipos personalizados (cajas y cilindros)
   */
  calculateAdvancedLoad(items) {
    const filteredItems = items.filter(item => item.includeInLoad);

    if (filteredItems.length === 0) {
      throw new Error('No hay items incluidos en la carga');
    }

    let totalLinearMeters = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    const loadDetails = [];

    for (const item of filteredItems) {
      const itemWeight = item.weightPerPiece * item.quantity;
      let itemVolume = 0;
      let itemLinearMeters = 0;

      // Calcular volumen según tipo
      if (item.type === 'customBox') {
        const dims = item.dimensions;
        itemVolume = (dims.length * dims.width * dims.height) / 1000000; // cm³ a m³

        // Para cajas, metros lineales = longitud en metros
        let effectiveLength = dims.length / 100; // cm a metros

        // Si permite rotación, usar la dimensión más pequeña como longitud
        if (item.allowRotation) {
          const dimensions = [dims.length, dims.width].sort((a, b) => a - b);
          effectiveLength = dimensions[0] / 100;
        }

        itemLinearMeters = effectiveLength * item.quantity;

      } else if (item.type === 'customCylinder') {
        const dims = item.dimensions;
        const radiusMeters = (dims.diameter / 2) / 100; // cm a metros
        const heightMeters = dims.height / 100; // cm a metros

        itemVolume = Math.PI * Math.pow(radiusMeters, 2) * heightMeters;

        // Para cilindros, usar diámetro como longitud efectiva
        itemLinearMeters = (dims.diameter / 100) * item.quantity;
      }

      totalWeight += itemWeight;
      totalVolume += itemVolume * item.quantity;
      totalLinearMeters += itemLinearMeters;

      loadDetails.push({
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        weight: itemWeight,
        volume: itemVolume * item.quantity,
        linearMeters: itemLinearMeters,
        dimensions: item.dimensions,
        color: item.color,
        allowRotation: item.allowRotation,
        stackingOptions: item.stackingOptions
      });
    }

    const loadMetrics = {
      totalLinearMeters: Math.round(totalLinearMeters * 100) / 100,
      totalWeight: Math.round(totalWeight * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalItems: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
      loadDetails
    };

    // Determinar tipo de transporte
    const transportRecommendation = this.determineTransportType(loadMetrics);

    // Validar carga
    const validation = this.validateLoad(loadMetrics);

    return {
      success: true,
      loadMetrics,
      transportRecommendation,
      validation,
      summary: {
        totalLinearMeters: `${loadMetrics.totalLinearMeters}m`,
        totalWeight: `${loadMetrics.totalWeight}kg`,
        totalVolume: `${loadMetrics.totalVolume}m³`,
        recommendedTransport: transportRecommendation.type,
        utilization: `${transportRecommendation.utilization.linear}%`,
        itemsIncluded: loadMetrics.totalItems
      }
    };
  }
}

module.exports = new LoadCalculatorService();