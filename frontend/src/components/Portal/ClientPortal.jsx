import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Truck,
  Clock,
  MapPin,
  Package,
  Euro,
  Calendar,
  CheckCircle,
  AlertCircle,
  Star,
  Navigation,
  Eye,
  Check,
  X as XIcon,
  Edit,
  MessageSquare
} from 'lucide-react';
import { API_CONFIG } from '../../config/api';

const ClientPortal = () => {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [showCounterOfferResponse, setShowCounterOfferResponse] = useState(false);
  const [modificationRequest, setModificationRequest] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [counterProposalPrice, setCounterProposalPrice] = useState('');
  const [counterProposalNotes, setCounterProposalNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!token) {
        setError('Token no válido');
        setLoading(false);
        return;
      }

      try {
        // Registrar la visualización
        await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}/view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        // Obtener los datos de la cotización
        const response = await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}`);

        if (response.ok) {
          const result = await response.json();
          setQuote(result.data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Cotización no encontrada');
        }
      } catch (err) {
        setError('Error conectando con el servidor');
        console.error('Error fetching quote:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [token]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleAcceptQuote = async () => {
    setProcessingAction(true);
    try {
      const response = await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: '✅ Cotización aceptada exitosamente. Nos pondremos en contacto pronto.' });
        // Update quote status locally
        setQuote(prev => ({
          ...prev,
          quote: { ...prev.quote, status: 'accepted' }
        }));
      } else {
        setActionMessage({ type: 'error', text: 'Error al aceptar la cotización' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Error de conexión' });
    }
    setProcessingAction(false);
  };

  const handleRejectQuote = async () => {
    if (!window.confirm('¿Está seguro de rechazar esta cotización?')) return;

    setProcessingAction(true);
    try {
      const response = await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setActionMessage({ type: 'error', text: 'Cotización rechazada. Gracias por su tiempo.' });
        setQuote(prev => ({
          ...prev,
          quote: { ...prev.quote, status: 'rejected' }
        }));
      } else {
        setActionMessage({ type: 'error', text: 'Error al rechazar la cotización' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Error de conexión' });
    }
    setProcessingAction(false);
  };

  const handleRequestModification = async () => {
    if (!modificationRequest.trim()) {
      alert('Por favor describa las modificaciones requeridas');
      return;
    }

    setProcessingAction(true);
    try {
      const response = await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
          notes: modificationRequest,
          proposedBy: 'client'
        })
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: '📨 Solicitud de modificación enviada. Le responderemos pronto.' });
        setShowModificationModal(false);
        setModificationRequest('');
        setProposedPrice('');
        setQuote(prev => ({
          ...prev,
          quote: { ...prev.quote, status: 'negotiating' }
        }));
      } else {
        alert('Error al enviar la solicitud');
      }
    } catch (error) {
      alert('Error de conexión');
    }
    setProcessingAction(false);
  };

  // Check if there's a pending counter-offer from commercial
  const getPendingCounterOffer = () => {
    if (!quote?.negotiations) return null;
    const negotiations = quote.negotiations || [];
    return negotiations.find(n => n.status === 'pending' && n.proposedBy === 'commercial');
  };

  // Handle accepting commercial's counter-offer
  const handleAcceptCounterOffer = async () => {
    setProcessingAction(true);
    try {
      const response = await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}/respond-counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'accept',
          notes: 'Cliente acepta la contraoferta'
        })
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: '✅ Contraoferta aceptada exitosamente. Nos pondremos en contacto pronto.' });
        setQuote(prev => ({
          ...prev,
          quote: { ...prev.quote, status: 'accepted' }
        }));
      } else {
        setActionMessage({ type: 'error', text: 'Error al aceptar la contraoferta' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Error de conexión' });
    }
    setProcessingAction(false);
  };

  // Handle rejecting commercial's counter-offer (with option to counter-propose)
  const handleRejectCounterOffer = async () => {
    setProcessingAction(true);
    try {
      const response = await fetch(`${API_CONFIG.endpoints.quotes}/portal/${token}/respond-counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: 'reject',
          proposedPrice: counterProposalPrice ? parseFloat(counterProposalPrice) : null,
          notes: counterProposalNotes || 'Cliente rechaza la contraoferta'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (counterProposalPrice) {
          setActionMessage({ type: 'success', text: '📨 Nueva propuesta enviada. Le responderemos pronto.' });
        } else {
          setActionMessage({ type: 'error', text: 'Contraoferta rechazada.' });
        }
        setShowCounterOfferResponse(false);
        setCounterProposalPrice('');
        setCounterProposalNotes('');
        // Refresh quote data
        window.location.reload();
      } else {
        setActionMessage({ type: 'error', text: 'Error al procesar la respuesta' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Error de conexión' });
    }
    setProcessingAction(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      viewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      negotiating: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      active: 'Activa',
      sent: 'Enviada',
      viewed: 'Visualizada',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Vencida',
      negotiating: 'En negociación'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || labels.active}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Cotización no encontrada</h2>
          <p className="mt-2 text-gray-600">El enlace puede haber expirado o ser inválido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Stock Logistic Solutions</h1>
                <p className="text-gray-600">Portal del Cliente</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">Visualizado {quote.viewCount || 0} veces</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quote Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cotización #{quote.quote.quoteId}</h2>
              <p className="text-gray-600">Para: {quote.quote.client.company}</p>
            </div>
            <div className="text-right">
              {getStatusBadge(quote.quote.status)}
              <p className="text-sm text-gray-600 mt-1">
                Válida hasta: {formatDate(quote.quote.validUntil)}
              </p>
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">📍 Información de Ruta</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Origen</p>
                  <p className="font-semibold">{quote.quote.route.origin}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Navigation className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Distancia</p>
                  <p className="font-semibold">{quote.quote.route.distance} km</p>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-red-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Destino</p>
                  <p className="font-semibold">{quote.quote.route.destination}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cargo Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Información de Carga</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Peso</p>
              <p className="font-semibold">{(quote.quote.cargo.weight * 1000).toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Volumen</p>
              <p className="font-semibold">{quote.quote.cargo.volume} m³</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="font-semibold">{quote.quote.cargo.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor</p>
              <p className="font-semibold">{formatCurrency(quote.quote.cargo.value || 0)}</p>
            </div>
          </div>
          {quote.quote.cargo.description && (
            <div className="mt-4">
              <p className="text-sm text-gray-600">Descripción</p>
              <p className="font-semibold">{quote.quote.cargo.description}</p>
            </div>
          )}
        </div>

        {/* Schedule */}
        {quote.quote.schedule && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">⏰ Cronograma</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Fecha de Carga</p>
                  <p className="font-semibold">{formatDate(quote.quote.schedule.pickup?.date)}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Tiempo de Tránsito</p>
                  <p className="font-semibold">{quote.quote.schedule.transitDays} días</p>
                </div>
              </div>
            </div>
            {quote.quote.schedule.delivery && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Entrega estimada:</strong> {formatDate(quote.quote.schedule.delivery.estimated)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Precio</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 font-semibold">Precio Total</p>
                <p className="text-sm text-blue-600">Incluye todos los costos y IVA</p>
              </div>
              <p className="text-3xl font-bold text-blue-900">
                {formatCurrency(quote.quote.costBreakdown.total)}
              </p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(quote.quote.costBreakdown.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA (21%):</span>
              <span className="font-medium">{formatCurrency(quote.quote.costBreakdown.vat)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(quote.quote.costBreakdown.total)}</span>
            </div>
          </div>
        </div>

        {/* Service Alternatives */}
        {quote.quote.alternatives && quote.quote.alternatives.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🚛 Alternativas de Servicio</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quote.quote.alternatives.map((alt, index) => (
                <div key={index} className={`border rounded-lg p-4 ${alt.recommended ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  {alt.recommended && (
                    <div className="flex items-center mb-2">
                      <Star className="w-4 h-4 text-orange-500 mr-1" />
                      <span className="text-xs font-medium text-orange-600">Recomendado</span>
                    </div>
                  )}
                  <h4 className="font-semibold text-gray-900">{alt.type}</h4>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(alt.price)}</p>
                  <p className="text-sm text-gray-600 mt-1">{alt.transitTime} días</p>
                  <p className="text-xs text-gray-500 mt-2">{alt.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements */}
        {quote.quote.requirements && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Servicios Incluidos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <CheckCircle className={`w-5 h-5 mr-2 ${quote.quote.requirements.insurance ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={quote.quote.requirements.insurance ? 'text-gray-900' : 'text-gray-500'}>
                  Seguro de carga
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircle className={`w-5 h-5 mr-2 ${quote.quote.requirements.tracking ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={quote.quote.requirements.tracking ? 'text-gray-900' : 'text-gray-500'}>
                  Seguimiento en tiempo real
                </span>
              </div>
              <div className="flex items-center">
                <CheckCircle className={`w-5 h-5 mr-2 ${quote.quote.requirements.signature ? 'text-green-500' : 'text-gray-300'}`} />
                <span className={quote.quote.requirements.signature ? 'text-gray-900' : 'text-gray-500'}>
                  Firma de entrega
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Negotiation History */}
        {quote.negotiations && quote.negotiations.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📜 Historial de Negociación</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quote.negotiations.slice().reverse().map((negotiation, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    negotiation.proposedBy === 'client'
                      ? 'bg-orange-50 border-orange-400'
                      : 'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <span className={`text-sm font-semibold ${
                        negotiation.proposedBy === 'client' ? 'text-orange-700' : 'text-blue-700'
                      }`}>
                        {negotiation.proposedBy === 'client' ? '👤 Su propuesta' : '💼 Stock Logistic'}
                      </span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        negotiation.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : negotiation.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {negotiation.status === 'pending' ? 'Pendiente' :
                         negotiation.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(negotiation.timestamp).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {negotiation.proposedPrice && (
                    <p className={`text-xl font-bold ${
                      negotiation.proposedBy === 'client' ? 'text-orange-600' : 'text-blue-600'
                    }`}>
                      {formatCurrency(negotiation.proposedPrice)}
                    </p>
                  )}
                  {negotiation.notes && (
                    <p className="text-sm text-gray-700 mt-1 italic">"{negotiation.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Counter-Offer from Commercial */}
        {quote.quote.status === 'negotiating' && quote.negotiations && (() => {
          const pendingCounterOffer = quote.negotiations.find(n => n.status === 'pending' && n.proposedBy === 'commercial');
          if (!pendingCounterOffer) return null;

          return (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-blue-900">💼 Contraoferta del Equipo Comercial</h3>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Nuevo precio propuesto:</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(pendingCounterOffer.proposedPrice)}
                </p>
                {pendingCounterOffer.notes && (
                  <p className="mt-3 text-gray-700 italic">"{pendingCounterOffer.notes}"</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Enviada el {new Date(pendingCounterOffer.timestamp).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {actionMessage && (
                <div className={`mb-4 p-4 rounded-lg ${
                  actionMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {actionMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleAcceptCounterOffer}
                  disabled={processingAction}
                  className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Aceptar Contraoferta
                </button>

                <button
                  onClick={() => setShowCounterOfferResponse(true)}
                  disabled={processingAction}
                  className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Edit className="w-5 h-5 mr-2" />
                  Hacer Nueva Propuesta
                </button>
              </div>
            </div>
          );
        })()}

        {/* Action Buttons - Only show if quote is not already accepted/rejected and no pending counter-offer */}
        {quote.quote.status !== 'accepted' && quote.quote.status !== 'rejected' &&
         !(quote.negotiations?.find(n => n.status === 'pending' && n.proposedBy === 'commercial')) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Acciones de la Cotización</h3>

            {actionMessage && (
              <div className={`mb-4 p-4 rounded-lg ${
                actionMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {actionMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleAcceptQuote}
                disabled={processingAction || quote.quote.status === 'accepted'}
                className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Check className="w-5 h-5 mr-2" />
                Aceptar Cotización
              </button>

              <button
                onClick={() => setShowModificationModal(true)}
                disabled={processingAction}
                className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Edit className="w-5 h-5 mr-2" />
                Solicitar Modificación
              </button>

              <button
                onClick={handleRejectQuote}
                disabled={processingAction || quote.quote.status === 'rejected'}
                className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <XIcon className="w-5 h-5 mr-2" />
                Rechazar Cotización
              </button>
            </div>
          </div>
        )}

        {/* Status message for accepted/rejected quotes */}
        {(quote.quote.status === 'accepted' || quote.quote.status === 'rejected') && (
          <div className={`mb-6 p-6 rounded-xl shadow-lg ${
            quote.quote.status === 'accepted' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="flex items-center">
              {quote.quote.status === 'accepted' ? (
                <>
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Cotización Aceptada</h3>
                    <p className="text-green-700">Gracias por aceptar nuestra cotización. Nos pondremos en contacto pronto para coordinar los detalles.</p>
                  </div>
                </>
              ) : (
                <>
                  <XIcon className="w-8 h-8 text-red-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Cotización Rechazada</h3>
                    <p className="text-red-700">Esta cotización ha sido rechazada. Si desea una nueva cotización, por favor contáctenos.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📞 Información de Contacto</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Para consultas sobre esta cotización, contacte con:</p>
            <p className="font-semibold text-gray-900">Stock Logistic Solutions</p>
            <p className="text-gray-600">Email: info@stocklogistic.com</p>
            <p className="text-gray-600">Teléfono: +34 900 000 000</p>
            <p className="text-xs text-gray-500 mt-3">
              Referencia de cotización: {quote.quote.quoteId}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-300">© 2025 Stock Logistic Solutions. Todos los derechos reservados.</p>
          <p className="text-sm text-gray-400 mt-2">Portal seguro del cliente - Cotización válida hasta {formatDate(quote.quote.validUntil)}</p>
        </div>
      </div>

      {/* Modification Request Modal */}
      {showModificationModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Solicitar Modificación
                </h3>
                <button
                  onClick={() => setShowModificationModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio propuesto (opcional)
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={proposedPrice}
                      onChange={(e) => setProposedPrice(e.target.value)}
                      placeholder="Ingrese su precio propuesto"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describir las modificaciones requeridas *
                  </label>
                  <textarea
                    value={modificationRequest}
                    onChange={(e) => setModificationRequest(e.target.value)}
                    placeholder="Describa qué cambios necesita en la cotización..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Nota importante:</p>
                      <p>Su solicitud será enviada al equipo comercial. Le responderemos con una nueva propuesta en las próximas horas.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModificationModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestModification}
                  disabled={processingAction || !modificationRequest.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {processingAction && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Enviar Solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Counter-Offer Response Modal */}
      {showCounterOfferResponse && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Responder a Contraoferta
                </h3>
                <button
                  onClick={() => setShowCounterOfferResponse(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Puede rechazar la contraoferta y proponer un nuevo precio, o simplemente rechazarla sin hacer una nueva propuesta.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Su precio propuesto (opcional)
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={counterProposalPrice}
                      onChange={(e) => setCounterProposalPrice(e.target.value)}
                      placeholder="Ingrese su nuevo precio"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios (opcional)
                  </label>
                  <textarea
                    value={counterProposalNotes}
                    onChange={(e) => setCounterProposalNotes(e.target.value)}
                    placeholder="Explique su propuesta o motivos..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCounterOfferResponse(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectCounterOffer}
                  disabled={processingAction}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {processingAction && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {counterProposalPrice ? 'Enviar Nueva Propuesta' : 'Rechazar Contraoferta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPortal;