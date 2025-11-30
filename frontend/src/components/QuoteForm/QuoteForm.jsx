import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Truck, MapPin, Calendar, AlertCircle, Calculator } from 'lucide-react';
import LoadingSpinner from '../UI/LoadingSpinner';
import CargoInputSelector from './CargoInputSelector';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../config/api';

const QuoteForm = ({ onQuoteGenerated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [cargoData, setCargoData] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();
  const { authFetch } = useAuth();

  const profitMargin = watch('profitMargin', 15);

  const cargoTypes = [
    { value: 'general', label: 'Carga General' },
    { value: 'forestales', label: 'Productos Forestales' },
    { value: 'adr', label: 'Materiales Peligrosos (ADR)' },
    { value: 'refrigerado', label: 'Refrigerados' },
    { value: 'especial', label: 'Carga Especial' }
  ];

  const serviceTypes = [
    { value: 'economico', label: 'Económico', description: 'Entrega estándar, menor costo' },
    { value: 'estandar', label: 'Estándar', description: 'Balance precio-tiempo' },
    { value: 'express', label: 'Express', description: 'Entrega rápida, premium' }
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Preparar datos de carga (manual o del calculador)
      const cargoInfo = cargoData ? {
        type: data.cargoType,
        weight: Math.max(cargoData.weight / 1000, 0.1), // Convertir kg a toneladas, mínimo 0.1t
        volume: cargoData.volume,
        linearMeters: cargoData.linearMeters,
        transportType: cargoData.transportType,
        value: parseFloat(data.cargoValue),
        description: data.cargoDescription,
        loadDetails: cargoData.loadDetails,
        utilization: cargoData.utilization,
        calculatedPricing: cargoData.pricing
      } : {
        type: data.cargoType,
        weight: Math.max(parseFloat(data.weight) / 1000, 0.1), // Convertir kg a toneladas, mínimo 0.1t
        volume: parseFloat(data.volume),
        value: parseFloat(data.cargoValue),
        description: data.cargoDescription
      };

      const payload = {
        route: {
          origin: data.origin,
          destination: data.destination
        },
        cargo: cargoInfo,
        preferences: {
          serviceType: data.serviceType || 'estandar',
          profitMargin: parseFloat(data.profitMargin) || 15
        },
        pickup: {
          date: new Date(data.pickupDate).toISOString()
        },
        requirements: {
          insurance: data.requiresInsurance || false,
          tracking: data.requiresTracking || false,
          signature: data.requiresSignature || false
        },
        client: {
          company: data.companyName,
          email: data.companyEmail,
          contactName: data.contactName,
          phone: data.contactPhone
        }
      };


      const response = await authFetch(`${API_CONFIG.endpoints.quotes}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error al generar cotización');
      }

      const result = await response.json();
      onQuoteGenerated(result);
      toast.success('Cotización generada exitosamente');
      reset();
    } catch (error) {
      toast.error(error.message || 'Error al generar cotización');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Truck className="w-8 h-8 text-blue-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Cotización</h2>
          <p className="text-gray-600">Complete los datos para generar una cotización inteligente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Origen y Destino */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              Ciudad de Origen
            </label>
            <input
              type="text"
              {...register('origin', { required: 'El origen es requerido' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Madrid, España"
            />
            {errors.origin && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.origin.message}
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              Ciudad de Destino
            </label>
            <input
              type="text"
              {...register('destination', { required: 'El destino es requerido' })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Berlín, Alemania"
            />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.destination.message}
              </p>
            )}
          </div>
        </div>

        {/* Información de Carga - Componente Integrado */}
        <CargoInputSelector
          onCargoDataChange={setCargoData}
          errors={errors}
          register={register}
        />

        {/* Fecha de Carga */}
        <div className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                Fecha de Carga Aproximada
              </label>
              <input
                type="date"
                {...register('pickupDate', { required: 'La fecha de carga es requerida' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.pickupDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.pickupDate.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                El sistema calculará automáticamente la fecha de entrega según la ruta, restricciones y tipo de servicio
              </p>
            </div>
          </div>
        </div>

        {/* Tipo de Servicio */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Servicio</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serviceTypes.map(service => (
              <label key={service.value} className="relative flex cursor-pointer rounded-lg border border-gray-300 p-4 focus:outline-none hover:bg-gray-50">
                <input
                  {...register('serviceType', { required: 'Seleccione un tipo de servicio' })}
                  type="radio"
                  value={service.value}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">{service.label}</span>
                    <span className="mt-1 flex items-center text-sm text-gray-500">{service.description}</span>
                  </span>
                </span>
                <span className="border-transparent border-2 rounded-full w-4 h-4 mt-0.5 ml-2"></span>
              </label>
            ))}
          </div>
          {errors.serviceType && (
            <p className="mt-2 text-sm text-red-600">{errors.serviceType.message}</p>
          )}
        </div>

        {/* Configuración Comercial */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración Comercial</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Margen de Utilidad (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('profitMargin', {
                  required: 'El margen de utilidad es requerido',
                  min: { value: 0, message: 'El margen no puede ser negativo' },
                  max: { value: 100, message: 'El margen no puede exceder 100%' }
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 15.0"
                defaultValue="15"
              />
              {errors.profitMargin && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.profitMargin.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Margen aplicado sobre el costo base del transporte
              </p>
              {profitMargin && (
                <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                  <div className="flex items-center text-sm text-blue-800">
                    <Calculator className="w-4 h-4 mr-2" />
                    <span>
                      Con {profitMargin}% de margen: Si el costo base es €1000, el precio final será €{(1000 * (1 + parseFloat(profitMargin || 0) / 100)).toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información de la Empresa */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de la Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                {...register('companyName', { required: 'El nombre de la empresa es requerido' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Transportes García S.L."
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de Contacto *
              </label>
              <input
                type="email"
                {...register('companyEmail', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido'
                  }
                })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contacto@empresa.com"
              />
              {errors.companyEmail && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.companyEmail.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de Contacto
              </label>
              <input
                type="text"
                {...register('contactName')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan García"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de Contacto
              </label>
              <input
                type="tel"
                {...register('contactPhone')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+34 123 456 789"
              />
            </div>
          </div>
        </div>

        {/* Requerimientos Adicionales */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requerimientos Adicionales</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('requiresInsurance')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Seguro de carga</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('requiresTracking')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Seguimiento en tiempo real</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('requiresSignature')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Firma de entrega requerida</span>
            </label>
          </div>
        </div>

        {/* Botón de Envío */}
        <div className="border-t pt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Generando Cotización...</span>
              </>
            ) : (
              'Generar Cotización Inteligente'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuoteForm;