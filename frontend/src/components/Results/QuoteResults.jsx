import React, { useState } from 'react';
import {
  Truck,
  Clock,
  Euro,
  Navigation,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Calendar,
  FileText,
  Download,
  Share2,
  Star,
  Mail,
  Eye,
  Activity,
  Copy
} from 'lucide-react';
import RouteMap from '../Map/RouteMap';
import CostBreakdown from '../Cost/CostBreakdown';
import { useAuth } from '../../context/AuthContext';

const QuoteResults = ({ results }) => {
  const { authFetch } = useAuth();
  const [selectedOption, setSelectedOption] = useState(0);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [portalUrl, setPortalUrl] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  if (!results || !results.data) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-8">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay resultados de cotización disponibles</p>
        </div>
      </div>
    );
  }

  // Extraer datos del formato del backend
  const data = results.data;
  const options = data.alternatives || [];
  const route = data.route;
  const alerts = data.alerts || [];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDuration = (hours) => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${remainingHours}h`;
  };

  const getServiceBadge = (type) => {
    const badges = {
      económica: { color: 'bg-green-100 text-green-800', label: 'Económico' },
      estándar: { color: 'bg-blue-100 text-blue-800', label: 'Estándar' },
      express: { color: 'bg-purple-100 text-purple-800', label: 'Express' },
      economy: { color: 'bg-green-100 text-green-800', label: 'Económico' },
      standard: { color: 'bg-blue-100 text-blue-800', label: 'Estándar' }
    };
    return badges[type] || badges.standard;
  };

  const downloadPDF = async (option) => {
    if (!option || !options.length) {
      console.error('No option available for PDF download');
      return;
    }

    try {
      console.log('Downloading PDF for option:', option);

      // Prepare request data
      const requestData = {
        quoteData: {
          quoteId: data.quoteId || `SL-${Date.now()}`,
          weight: data.weight || 1000,
          route: route,
          alternatives: options,
          costBreakdown: data.costBreakdown
        },
        selectedOptionIndex: selectedOption
      };

      const response = await fetch('/api/pdf/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cotizacion-${requestData.quoteData.quoteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('PDF downloaded successfully');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Error al generar el PDF: ${error.message}`);
    }
  };

  const generateEmailTemplate = async () => {
    if (!data.quoteId) {
      alert('No hay ID de cotización disponible');
      return;
    }

    setIsGeneratingEmail(true);
    try {
      const response = await authFetch(`/api/quotes/${data.quoteId}/email-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commercialName: 'Agente Comercial', // En producción vendría del usuario logueado
          customMessage: 'Esta cotización ha sido preparada especialmente para sus necesidades de transporte.'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEmailTemplate(result.data.emailTemplate);
        setPortalUrl(result.data.portalUrl);
        setShowEmailModal(true);
      } else {
        const error = await response.json();
        alert(`Error generando plantilla: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generando email:', error);
      alert(`Error generando plantilla de email: ${error.message}`);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const getTimeline = async () => {
    if (!data.quoteId) {
      alert('No hay ID de cotización disponible');
      return;
    }

    setIsLoadingTracking(true);
    try {
      const response = await fetch(`/api/quotes/${data.quoteId}/timeline`);

      if (response.ok) {
        const result = await response.json();
        setTimeline(result.data.timeline);
        setShowTrackingModal(true);
      } else {
        const error = await response.json();
        alert(`Error obteniendo seguimiento: ${error.error}`);
      }
    } catch (error) {
      console.error('Error obteniendo timeline:', error);
      alert(`Error obteniendo seguimiento: ${error.message}`);
    } finally {
      setIsLoadingTracking(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copiado al portapapeles');
    }).catch(() => {
      alert('Error al copiar al portapapeles');
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header de Resultados */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Resultados de Cotización</h2>
            <p className="text-gray-600">ID: {data.quoteId}</p>
          </div>
          <div className="flex space-x-3">
            {options.length > 0 && (
              <button
                onClick={() => downloadPDF(options[selectedOption])}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </button>
            )}
            <button
              onClick={generateEmailTemplate}
              disabled={isGeneratingEmail}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isGeneratingEmail ? 'Generando...' : 'Enviar por Email'}
            </button>
            <button
              onClick={getTimeline}
              disabled={isLoadingTracking}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Activity className="w-4 h-4 mr-2" />
              {isLoadingTracking ? 'Cargando...' : 'Ver Seguimiento'}
            </button>
          </div>
        </div>

        {/* Información de Ruta */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Origen</p>
                <p className="font-semibold">{route.origin}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Navigation className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Distancia</p>
                <p className="font-semibold">{route.distance} km</p>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Destino</p>
                <p className="font-semibold">{route.destination}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Información de Carga */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Carga</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Peso</p>
              <p className="font-semibold">{data.cargo?.weight || 'N/A'} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Volumen</p>
              <p className="font-semibold">{data.cargo?.volume || 'N/A'} m³</p>
            </div>
            {data.cargo?.linearMeters && (
              <div>
                <p className="text-sm text-gray-600">Metros Lineales</p>
                <p className="font-semibold">{data.cargo.linearMeters} m</p>
              </div>
            )}
            {data.cargo?.transportType && (
              <div>
                <p className="text-sm text-gray-600">Tipo Recomendado</p>
                <p className={`font-semibold ${
                  data.cargo.transportType === 'FTL' ? 'text-purple-600' : 'text-green-600'
                }`}>
                  {data.cargo.transportType}
                </p>
              </div>
            )}
          </div>

          {/* Detalles del Calculador si están disponibles */}
          {data.cargo?.calculatedFromPallets && (
            <div className="mt-4 bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Calculado desde Pallets/Equipamiento</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {data.cargo.loadDetails && (
                  <div>
                    <p>• {data.cargo.loadDetails.length} tipos de equipamiento</p>
                    <p>• Utilización del camión: {data.cargo.utilization?.linear || 'N/A'}%</p>
                    <p>• Recomendación: {data.cargo.transportType === 'FTL'
                      ? 'Camión Completo (mejor eficiencia)'
                      : 'Grupaje (optimización de costos)'
                    }</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alertas y Restricciones */}
        {alerts && alerts.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Alertas y Restricciones
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {alerts.map((alert, index) => (
                      <li key={index}>{alert.message || alert}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opciones de Servicio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {options.map((option, index) => {
          const badge = getServiceBadge(option.type?.toLowerCase() || 'standard');
          const isSelected = selectedOption === index;
          const isRecommended = option.recommended;

          return (
            <div
              key={index}
              className={`relative bg-white rounded-xl shadow-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedOption(index)}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-4">
                  <span className="flex items-center bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    <Star className="w-3 h-3 mr-1" />
                    Recomendado
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Header del Servicio */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(option.price)}
                    </p>
                    <p className="text-sm text-gray-600">Precio total</p>
                  </div>
                </div>

                {/* Información Principal */}
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      Tiempo estimado: {option.transitTime} días
                    </span>
                  </div>

                  <div className="flex items-center">
                    <Truck className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      Descripción: {option.description}
                    </span>
                  </div>
                </div>

                {/* Desglose de Costos */}
                {data.costBreakdown && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Desglose de costos</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Transporte base:</span>
                        <span>{formatCurrency(data.costBreakdown.distanceRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Combustible:</span>
                        <span>{formatCurrency(data.costBreakdown.fuelCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Peajes:</span>
                        <span>{formatCurrency(data.costBreakdown.tollCost)}</span>
                      </div>
                      {/* Desglose de peajes por país */}
                      {data.costBreakdown.tollBreakdown && data.costBreakdown.tollBreakdown.length > 0 && (
                        <div className="ml-2 space-y-1">
                          {data.costBreakdown.tollBreakdown.map((toll, tollIndex) => (
                            <div key={tollIndex} className="flex justify-between text-xs text-gray-500">
                              <span>• {toll.country}:</span>
                              <span>{formatCurrency(toll.cost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Conductor:</span>
                        <span>{formatCurrency(data.costBreakdown.driverCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vehículo:</span>
                        <span>{formatCurrency(data.costBreakdown.vehicleCost)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-gray-900 pt-1 border-t">
                        <span>Total:</span>
                        <span>{formatCurrency(option.price)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Características del Servicio */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Incluye</h4>
                  <div className="space-y-1">
                    {option.features && option.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-xs text-gray-600">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mapa y Desglose de Costos para la Opción Seleccionada */}
      {options[selectedOption] && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mapa de la Ruta */}
          <div>
            <RouteMap
              route={route}
              tollData={data.costBreakdown}
              serviceType={getServiceBadge(options[selectedOption].type?.toLowerCase() || 'standard').label}
            />
          </div>

          {/* Desglose de Costos */}
          <div>
            <CostBreakdown
              costData={data.costBreakdown}
              serviceType={getServiceBadge(options[selectedOption].type?.toLowerCase() || 'standard').label}
            />
          </div>
        </div>
      )}

      {/* Detalles de la Opción Seleccionada */}
      {options[selectedOption] && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detalles de la Opción Seleccionada
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Transportista */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Información del Transportista</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Empresa:</span> {options[selectedOption].carrier?.name || 'Stock Logistic Network'}</p>
                <p><span className="font-medium">Rating:</span>
                  <span className="flex items-center ml-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="ml-1 text-gray-600">(4.2/5)</span>
                  </span>
                </p>
                <p><span className="font-medium">Experiencia:</span> 8+ años en transporte europeo</p>
              </div>
            </div>

            {/* Términos y Condiciones */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Términos y Condiciones</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Cotización válida por 7 días</p>
                <p>• Seguro incluido hasta €{options[selectedOption].insurance || 10000}</p>
                <p>• Pago: 50% anticipo, 50% contra entrega</p>
                <p>• Tiempo de carga/descarga: 2 horas incluidas</p>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Aceptar Cotización
            </button>
            <button className="flex items-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4 mr-2" />
              Solicitar Modificación
            </button>
            <button
              onClick={generateEmailTemplate}
              disabled={isGeneratingEmail}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              {isGeneratingEmail ? 'Generando...' : 'Enviar por Email'}
            </button>
          </div>
        </div>
      )}

      {/* IA Insights */}
      {data.intelligence && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h3 className="flex items-center text-lg font-semibold text-blue-900 mb-4">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Insights de LUC1-COMEX
          </h3>
          <div className="space-y-3 text-sm text-blue-800">
            {data.intelligence.luc1Reasoning && (
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <p>Análisis IA: Transportista recomendado: {data.intelligence.recommendedTransportist}</p>
              </div>
            )}
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Confianza de la decisión: {data.confidence}%</p>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <p>Tiempo de procesamiento: {data.intelligence.processingTime}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Email Template */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Plantilla de Email Generada</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email para copiar y enviar:
                  </label>
                  <div className="relative">
                    <textarea
                      value={emailTemplate}
                      readOnly
                      className="w-full h-96 p-4 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(emailTemplate)}
                      className="absolute top-2 right-2 flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </button>
                  </div>
                </div>

                {portalUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enlace del Portal del Cliente:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        value={portalUrl}
                        readOnly
                        className="flex-1 p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(portalUrl)}
                        className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Instrucciones:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Copie el texto del email y péguelo en su cliente de correo</li>
                    <li>• Envíe el email al cliente desde su cuenta corporativa</li>
                    <li>• El enlace del portal permite al cliente ver la cotización sin registrarse</li>
                    <li>• El sistema registrará automáticamente las visualizaciones del cliente</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seguimiento */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Seguimiento de Cotización</h3>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Cotización: {data.quoteId}</h4>
                  <p className="text-sm text-gray-600">Estado actual: <span className="font-medium text-blue-600">{timeline[timeline.length - 1]?.status || 'active'}</span></p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Timeline de Eventos</h4>
                  <div className="space-y-4">
                    {timeline.map((event, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full mt-1 ${
                            event.status === 'generated' ? 'bg-blue-500' :
                            event.status === 'sent' ? 'bg-green-500' :
                            event.status === 'viewed' ? 'bg-purple-500' :
                            event.status === 'accepted' ? 'bg-emerald-500' :
                            event.status === 'rejected' ? 'bg-red-500' :
                            event.status === 'negotiating' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {event.status === 'generated' ? 'Cotización Generada' :
                               event.status === 'sent' ? 'Enviada al Cliente' :
                               event.status === 'viewed' ? 'Visualizada por Cliente' :
                               event.status === 'accepted' ? 'Aceptada' :
                               event.status === 'rejected' ? 'Rechazada' :
                               event.status === 'negotiating' ? 'En Negociación' :
                               event.status}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-xs text-gray-400 mt-1">Por: {event.performedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteResults;