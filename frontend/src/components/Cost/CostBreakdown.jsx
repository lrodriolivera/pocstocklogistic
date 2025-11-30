import React, { useState } from 'react';
import {
  Euro,
  ChevronDown,
  ChevronUp,
  Truck,
  Fuel,
  MapPin,
  User,
  Calculator,
  Info
} from 'lucide-react';

const CostBreakdown = ({ costData, serviceType }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const costItems = [
    {
      icon: MapPin,
      label: 'Transporte base',
      value: costData.distanceRate,
      color: 'text-blue-600',
      description: 'Costo por kilómetro recorrido'
    },
    {
      icon: Fuel,
      label: 'Combustible',
      value: costData.fuelCost,
      color: 'text-orange-600',
      description: 'Estimación basada en consumo y precio actual'
    },
    {
      icon: Euro,
      label: 'Peajes',
      value: costData.tollCost,
      color: 'text-yellow-600',
      description: 'Peajes por países y autopistas',
      hasDetails: true
    },
    {
      icon: User,
      label: 'Conductor',
      value: costData.driverCost,
      color: 'text-green-600',
      description: 'Salario y gastos del conductor'
    },
    {
      icon: Truck,
      label: 'Vehículo',
      value: costData.vehicleCost,
      color: 'text-purple-600',
      description: 'Mantenimiento y depreciación'
    }
  ];

  const getTollDetails = () => {
    if (!costData.tollBreakdown) return null;

    return costData.tollBreakdown.map(toll => ({
      country: toll.country,
      cost: toll.cost,
      plazas: toll.tollPlazas?.length || 0,
      segments: toll.segments || []
    }));
  };

  const tollDetails = getTollDetails();

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Desglose de Costos - {serviceType}
          </h4>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            {isExpanded ? 'Contraer' : 'Expandir'}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {costItems.map((item, index) => (
            <div key={index} className="text-center">
              <item.icon className={`w-6 h-6 mx-auto mb-1 ${item.color}`} />
              <div className="text-xs text-gray-600">{item.label}</div>
              <div className="font-semibold text-sm">{formatCurrency(item.value)}</div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-lg p-3 border-t-2 border-blue-500">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-blue-600">
              {formatCurrency(costData.total)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>Sin IVA: {formatCurrency(costData.totalWithoutVAT)}</span>
            <span>IVA: {formatCurrency(costData.vat)}</span>
          </div>
        </div>
      </div>

      {/* Desglose detallado */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          <div className="p-4 space-y-4">
            {/* Costos base */}
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Costos Operativos</h5>
              <div className="space-y-2">
                {costItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <item.icon className={`w-4 h-4 mr-2 ${item.color}`} />
                      <div>
                        <span className="text-sm font-medium">{item.label}</span>
                        <div className="text-xs text-gray-600">{item.description}</div>
                      </div>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Desglose de peajes detallado */}
            {tollDetails && (
              <div>
                <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Euro className="w-4 h-4 mr-2 text-yellow-600" />
                  Desglose de Peajes por País
                </h5>
                <div className="space-y-3">
                  {tollDetails.map((toll, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">{toll.country}</span>
                        <span className="font-bold text-yellow-700">
                          {formatCurrency(toll.cost)}
                        </span>
                      </div>

                      {toll.segments && toll.segments.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600 mb-1">
                            {toll.plazas} plaza(s) de peaje
                          </div>
                          {toll.segments.map((segment, segIndex) => (
                            <div key={segIndex} className="flex justify-between text-xs bg-yellow-50 p-2 rounded">
                              <span>{segment.name} ({segment.road})</span>
                              <span className="font-medium">{formatCurrency(segment.cost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cálculos finales */}
            <div>
              <h5 className="font-medium text-gray-900 mb-3">Cálculo Final</h5>
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal operativo:</span>
                  <span>{formatCurrency(costData.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Factor de ajuste ({((costData.adjustmentFactor - 1) * 100).toFixed(0)}%):</span>
                  <span>{formatCurrency(costData.subtotal * (costData.adjustmentFactor - 1))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Margen Stock Logistic:</span>
                  <span>{formatCurrency(costData.margin)}</span>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total sin IVA:</span>
                    <span>{formatCurrency(costData.totalWithoutVAT)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (21%):</span>
                    <span>{formatCurrency(costData.vat)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-blue-600 border-t border-blue-200 pt-2">
                    <span>Total final:</span>
                    <span>{formatCurrency(costData.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Notas importantes:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Los precios de combustible pueden variar</li>
                    <li>Los peajes son estimaciones para vehículos comerciales</li>
                    <li>El factor de ajuste incluye imprevistos y optimización de ruta</li>
                    <li>Precios válidos por 7 días desde la cotización</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostBreakdown;