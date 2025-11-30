import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Euro,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  User,
  Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_CONFIG } from '../../config/api';

const NegotiationPanel = () => {
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [counterOfferPrice, setCounterOfferPrice] = useState('');
  const [counterOfferMessage, setCounterOfferMessage] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchPendingNegotiations();
  }, []);

  const fetchPendingNegotiations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_CONFIG.endpoints.quotes}/negotiations/pending`);
      if (response.ok) {
        const data = await response.json();
        setNegotiations(data.data || []);
      } else {
        throw new Error('Error cargando negociaciones');
      }
    } catch (err) {
      setError('Error cargando negociaciones pendientes');
      console.error('Error fetching negotiations:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSendCounterOffer = async (quoteId) => {
    if (!counterOfferPrice) {
      setActionMessage({ type: 'error', text: 'Ingrese un precio para la contraoferta' });
      return;
    }

    setProcessingAction(true);
    try {
      const response = await authFetch(`${API_CONFIG.endpoints.quotes}/${quoteId}/counter-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposedPrice: parseFloat(counterOfferPrice),
          message: counterOfferMessage
        })
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: 'Contraoferta enviada exitosamente' });
        setCounterOfferPrice('');
        setCounterOfferMessage('');
        setSelectedQuote(null);
        fetchPendingNegotiations();
      } else {
        throw new Error('Error al enviar contraoferta');
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Error al enviar contraoferta' });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleAcceptProposal = async (quoteId) => {
    if (!window.confirm('¿Está seguro de aceptar esta propuesta del cliente?')) return;

    setProcessingAction(true);
    try {
      const response = await authFetch(`${API_CONFIG.endpoints.quotes}/${quoteId}/accept-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseNotes: 'Propuesta aceptada por el equipo comercial'
        })
      });

      if (response.ok) {
        setActionMessage({ type: 'success', text: 'Propuesta del cliente aceptada' });
        fetchPendingNegotiations();
      } else {
        throw new Error('Error al aceptar propuesta');
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Error al aceptar propuesta' });
    } finally {
      setProcessingAction(false);
    }
  };

  const getLatestClientProposal = (quote) => {
    if (!quote.negotiations) return null;
    const clientProposals = quote.negotiations.filter(
      n => n.proposedBy === 'client' && n.status === 'pending'
    );
    return clientProposals[clientProposals.length - 1];
  };

  const getNegotiationHistory = (quote) => {
    return quote.negotiations || [];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span>Cargando negociaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <MessageSquare className="w-6 h-6 text-orange-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">Negociaciones Pendientes</h2>
        </div>
        <button
          onClick={fetchPendingNegotiations}
          className="flex items-center px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Actualizar
        </button>
      </div>

      {actionMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          actionMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {actionMessage.text}
          <button
            onClick={() => setActionMessage(null)}
            className="ml-2 text-sm underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      {negotiations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No hay negociaciones pendientes</p>
          <p className="text-sm">Las solicitudes de los clientes aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-4">
          {negotiations.map((quote) => {
            const latestClientProposal = getLatestClientProposal(quote);
            const history = getNegotiationHistory(quote);

            return (
              <div
                key={quote._id}
                className="border border-orange-200 rounded-lg p-4 bg-orange-50"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Cotización #{quote.quoteId}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {quote.route.origin} → {quote.route.destination}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Precio actual</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(quote.currentPrice)}
                    </p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="flex items-center mb-3 text-sm text-gray-600">
                  <Building className="w-4 h-4 mr-1" />
                  <span>{quote.client?.company || 'Cliente'}</span>
                  <span className="mx-2">•</span>
                  <span>{quote.client?.email}</span>
                </div>

                {/* Latest Client Proposal */}
                {latestClientProposal && (
                  <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-orange-500">
                    <div className="flex items-center mb-2">
                      <User className="w-4 h-4 text-orange-600 mr-2" />
                      <span className="font-medium text-orange-800">Propuesta del Cliente</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {formatDate(latestClientProposal.timestamp)}
                      </span>
                    </div>
                    {latestClientProposal.proposedPrice && (
                      <p className="text-2xl font-bold text-orange-600 mb-2">
                        {formatCurrency(latestClientProposal.proposedPrice)}
                      </p>
                    )}
                    {latestClientProposal.notes && (
                      <p className="text-gray-700 italic">"{latestClientProposal.notes}"</p>
                    )}
                  </div>
                )}

                {/* Negotiation History */}
                {history.length > 1 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setSelectedQuote(selectedQuote === quote._id ? null : quote._id)}
                      className="text-sm text-blue-600 hover:underline flex items-center"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      Ver historial de negociación ({history.length} interacciones)
                    </button>

                    {selectedQuote === quote._id && (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {history.map((neg, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded text-sm ${
                              neg.proposedBy === 'client'
                                ? 'bg-orange-100 ml-4'
                                : 'bg-blue-100 mr-4'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {neg.proposedBy === 'client' ? 'Cliente' : 'Comercial'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                neg.status === 'pending'
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : neg.status === 'accepted'
                                  ? 'bg-green-200 text-green-800'
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {neg.status === 'pending' ? 'Pendiente' :
                                 neg.status === 'accepted' ? 'Aceptado' : 'Rechazado'}
                              </span>
                            </div>
                            {neg.proposedPrice && (
                              <p className="font-semibold">{formatCurrency(neg.proposedPrice)}</p>
                            )}
                            {neg.notes && (
                              <p className="text-gray-600 text-xs mt-1">{neg.notes}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(neg.timestamp)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {/* Accept Client Proposal */}
                  {latestClientProposal && (
                    <button
                      onClick={() => handleAcceptProposal(quote.quoteId)}
                      disabled={processingAction}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aceptar Propuesta
                    </button>
                  )}

                  {/* Send Counter-offer */}
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1">
                      <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        placeholder="Contraoferta"
                        value={selectedQuote === quote._id + '_counter' ? counterOfferPrice : ''}
                        onChange={(e) => {
                          setSelectedQuote(quote._id + '_counter');
                          setCounterOfferPrice(e.target.value);
                        }}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Mensaje (opcional)"
                      value={selectedQuote === quote._id + '_counter' ? counterOfferMessage : ''}
                      onChange={(e) => {
                        setSelectedQuote(quote._id + '_counter');
                        setCounterOfferMessage(e.target.value);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => handleSendCounterOffer(quote.quoteId)}
                      disabled={processingAction || !counterOfferPrice}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NegotiationPanel;
