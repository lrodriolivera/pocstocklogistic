import React, { useState } from 'react';
import { Package, Calculator, ArrowRight, Info } from 'lucide-react';
import LoadCalculator from '../LoadCalculator/LoadCalculator';
import AdvancedLoadCalculator from '../LoadCalculator/AdvancedLoadCalculator';

const CargoInputSelector = ({ onCargoDataChange, errors, register }) => {
  const [inputMode, setInputMode] = useState('manual'); // 'manual', 'calculator', or 'advanced'
  const [calculationResult, setCalculationResult] = useState(null);

  const cargoTypes = [
    { value: 'general', label: 'Carga General' },
    { value: 'forestales', label: 'Productos Forestales' },
    { value: 'adr', label: 'Materiales Peligrosos (ADR)' },
    { value: 'refrigerado', label: 'Refrigerados' },
    { value: 'especial', label: 'Carga Especial' }
  ];

  const handleCalculationComplete = (calculation) => {
    setCalculationResult(calculation);

    // Convertir resultado del calculador a formato de carga
    const cargoData = {
      weight: calculation.loadMetrics.totalWeight,
      volume: calculation.loadMetrics.totalVolume,
      linearMeters: calculation.loadMetrics.totalLinearMeters,
      transportType: calculation.transportRecommendation.type,
      utilization: calculation.transportRecommendation.utilization,
      loadDetails: calculation.loadMetrics.loadDetails,
      pricing: calculation.pricing
    };

    // Notificar al componente padre
    if (onCargoDataChange) {
      onCargoDataChange(cargoData);
    }
  };

  const handleUseCalculation = () => {
    if (calculationResult) {
      // Cambiar a modo manual con datos pre-rellenados
      setInputMode('manual');
    }
  };

  const handleResetCalculation = () => {
    setCalculationResult(null);
    // Limpiar datos del calculador
    if (onCargoDataChange) {
      onCargoDataChange(null);
    }
  };

  return (
    <div className="border-t pt-6">
      <h3 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
        <Package className="w-5 h-5 mr-2" />
        Información de Carga
      </h3>

      {/* Selector de Modo */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">Método de Cálculo</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => {
              setInputMode('manual');
              if (inputMode !== 'manual') {
                handleResetCalculation();
              }
            }}
            className={`p-4 rounded-lg border-2 transition-all ${
              inputMode === 'manual'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Carga Manual</p>
              <p className="text-xs text-gray-600 mt-1">Peso y volumen directos</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMode('calculator');
              if (inputMode !== 'calculator') {
                handleResetCalculation();
              }
            }}
            className={`p-4 rounded-lg border-2 transition-all ${
              inputMode === 'calculator'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Calculador Metro Lineal</p>
              <p className="text-xs text-gray-600 mt-1">Por pallets y equipamiento</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setInputMode('advanced');
              if (inputMode !== 'advanced') {
                handleResetCalculation();
              }
            }}
            className={`p-4 rounded-lg border-2 transition-all ${
              inputMode === 'advanced'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-center mb-2">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="font-semibold">Calculador Avanzado</p>
              <p className="text-xs text-gray-600 mt-1">Cajas y cilindros personalizados</p>
            </div>
          </button>
        </div>
      </div>

      {/* Resultados del Calculador */}
      {calculationResult && (inputMode === 'calculator' || inputMode === 'advanced') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-green-800 mb-2">Cálculo Completado</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700">Metros Lineales:</span>
                  <span className="font-semibold ml-1">{calculationResult.loadMetrics.totalLinearMeters}m</span>
                </div>
                <div>
                  <span className="text-green-700">Peso Total:</span>
                  <span className="font-semibold ml-1">{calculationResult.loadMetrics.totalWeight}kg</span>
                </div>
                <div>
                  <span className="text-green-700">Volumen:</span>
                  <span className="font-semibold ml-1">{calculationResult.loadMetrics.totalVolume.toFixed(2)}m³</span>
                </div>
                <div>
                  <span className="text-green-700">Transporte:</span>
                  <span className="font-semibold ml-1">{calculationResult.transportRecommendation.type}</span>
                </div>
              </div>
              <p className="text-xs text-green-600 mt-2">
                {calculationResult.transportRecommendation.recommendation}
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseCalculation}
              className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
            >
              Usar Cálculo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido según modo seleccionado */}
      {inputMode === 'manual' ? (
        <div className="space-y-4">
          {/* Tipo de Carga */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Carga
            </label>
            <select
              {...register('cargoType', { required: 'Seleccione el tipo de carga' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar...</option>
              {cargoTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            {errors.cargoType && (
              <p className="mt-1 text-sm text-red-600">{errors.cargoType.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso Total (kg)
              </label>
              <input
                type="number"
                step="0.1"
                name="weight"
                {...register('weight', {
                  required: calculationResult ? false : 'El peso es requerido',
                  min: calculationResult ? 0 : 0.1
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  calculationResult
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
                placeholder="Ej: 1500"
                value={calculationResult?.loadMetrics?.totalWeight || ''}
                readOnly={!!calculationResult}
              />
              {calculationResult && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ Calculado desde equipamiento
                </p>
              )}
              {errors.weight && (
                <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volumen (m³)
              </label>
              <input
                type="number"
                step="0.01"
                name="volume"
                {...register('volume', {
                  required: calculationResult ? false : 'El volumen es requerido',
                  min: calculationResult ? 0 : 0.01
                })}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  calculationResult
                    ? 'border-green-300 bg-green-50 text-green-800'
                    : 'border-gray-300'
                }`}
                placeholder="Ej: 15.5"
                value={calculationResult?.loadMetrics?.totalVolume?.toFixed(2) || ''}
                readOnly={!!calculationResult}
              />
              {calculationResult && (
                <p className="mt-1 text-xs text-green-600">
                  ✓ Calculado desde equipamiento
                </p>
              )}
              {errors.volume && (
                <p className="mt-1 text-sm text-red-600">{errors.volume.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor de la Carga (€)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('cargoValue', { required: 'El valor es requerido', min: 1 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 25000"
              />
              {errors.cargoValue && (
                <p className="mt-1 text-sm text-red-600">{errors.cargoValue.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                {...register('cargoDescription')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Electrodomésticos embalados"
              />
            </div>
          </div>

          {/* Mostrar info adicional si viene del calculador */}
          {calculationResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Datos del Calculador</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Los valores han sido calculados basándose en {calculationResult.loadMetrics.loadDetails.length} tipos
                      de equipamiento. Transporte recomendado: <strong>{calculationResult.transportRecommendation.type}</strong>
                      ({calculationResult.transportRecommendation.utilization.linear}% utilización).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetCalculation}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>
      ) : inputMode === 'calculator' ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <LoadCalculator onCalculationComplete={handleCalculationComplete} />
        </div>
      ) : inputMode === 'advanced' ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <AdvancedLoadCalculator onCalculationComplete={handleCalculationComplete} />
        </div>
      ) : null}
    </div>
  );
};

export default CargoInputSelector;