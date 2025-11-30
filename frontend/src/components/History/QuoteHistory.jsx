import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Package, TrendingUp, Filter, Download, Eye, X, Activity, Mail, XCircle, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const QuoteHistory = () => {
  const { authFetch } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [emailTemplate, setEmailTemplate] = useState('');
  const [portalUrl, setPortalUrl] = useState('');

  // Fetch real quotes from MongoDB
  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const response = await authFetch('/api/quotes/history/all');

        if (response.ok) {
          const result = await response.json();
          const transformedQuotes = result.data.quotes.map(quote => ({
            id: quote.quoteId,
            date: new Date(quote.createdAt).toISOString().split('T')[0],
            client: quote.client?.company || 'Cliente sin nombre',
            origin: quote.route?.origin || 'N/A',
            destination: quote.route?.destination || 'N/A',
            service: quote.preferences?.serviceType || 'estandar',
            weight: Math.round((quote.cargo?.weight || 0) * 1000), // Convert tons to kg
            status: quote.status || 'pending',
            total: quote.costBreakdown?.total || 0,
            transportist: quote.intelligence?.recommendedTransportist || 'N/A',
            confidence: quote.confidence || 0,
            transitDays: quote.schedule?.transitDays || 0
          }));

          setQuotes(transformedQuotes);
        } else {
          console.error('Error fetching quotes:', response.statusText);
          // Keep empty array on error
          setQuotes([]);
        }
      } catch (error) {
        console.error('Error fetching quotes:', error);
        // Keep empty array on error
        setQuotes([]);
      }

      setLoading(false);
    };

    fetchQuotes();
  }, []);

  const handleViewQuote = async (quoteId) => {
    try {
      const response = await authFetch(`/api/quotes/${quoteId}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedQuote(result.data);
        setShowModal(true);
      } else {
        console.error('Error fetching quote details:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching quote details:', error);
    }
  };

  const handleViewTracking = async (quoteId) => {
    try {
      const response = await authFetch(`/api/quotes/${quoteId}/timeline`);
      if (response.ok) {
        const result = await response.json();
        setTimeline(result.data.timeline);
        setShowTrackingModal(true);
      } else {
        alert('Error obteniendo seguimiento');
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
      alert('Error obteniendo seguimiento');
    }
  };

  const handleGenerateEmail = async (quoteId) => {
    try {
      const response = await authFetch(`/api/quotes/${quoteId}/email-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commercialName: 'Agente Comercial',
          customMessage: 'Esta cotización ha sido preparada especialmente para sus necesidades de transporte.'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEmailTemplate(result.data.emailTemplate);
        setPortalUrl(result.data.portalUrl);
        setShowEmailModal(true);
      } else {
        alert('Error generando plantilla de email');
      }
    } catch (error) {
      console.error('Error generating email:', error);
      alert('Error generando plantilla de email');
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

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      viewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800',
      negotiating: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      in_transit: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      active: 'Activa',
      sent: 'Enviada',
      viewed: 'Visualizada',
      accepted: 'Aceptada',
      rejected: 'Rechazada',
      expired: 'Vencida',
      draft: 'Borrador',
      negotiating: 'Negociando',
      completed: 'Completada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
      in_transit: 'En Tránsito'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {labels[status] || labels.active}
      </span>
    );
  };

  const getServiceBadge = (service) => {
    const styles = {
      express: 'bg-purple-100 text-purple-800',
      estandar: 'bg-blue-100 text-blue-800',
      economico: 'bg-gray-100 text-gray-800',
      standard: 'bg-blue-100 text-blue-800',
      economy: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      express: 'Express',
      estandar: 'Estándar',
      economico: 'Económico',
      standard: 'Estándar',
      economy: 'Económico'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[service] || styles.estandar}`}>
        {labels[service] || service}
      </span>
    );
  };

  const filteredQuotes = quotes.filter(quote => {
    // Filter by status
    if (filter !== 'all' && quote.status !== filter) {
      return false;
    }

    // Filter by date range
    if (dateRange.start && quote.date < dateRange.start) {
      return false;
    }
    if (dateRange.end && quote.date > dateRange.end) {
      return false;
    }

    return true;
  });

  const stats = {
    total: quotes.length,
    active: quotes.filter(q => q.status === 'active').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    negotiating: quotes.filter(q => q.status === 'negotiating').length,
    totalRevenue: quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total, 0)
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Cliente', 'Origen', 'Destino', 'Servicio', 'Peso (kg)', 'Estado', 'Total (€)', 'Transportista'];
    const rows = filteredQuotes.map(q => [
      q.id,
      q.date,
      q.client,
      q.origin,
      q.destination,
      q.service,
      q.weight,
      q.status,
      q.total,
      q.transportist
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizaciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cotizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aceptadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <Package className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rechazadas</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Negociación</p>
              <p className="text-2xl font-bold text-orange-600">{stats.negotiating}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">Todas</option>
              <option value="active">Activas</option>
              <option value="accepted">Aceptadas</option>
              <option value="rejected">Rechazadas</option>
              <option value="negotiating">En Negociación</option>
              <option value="expired">Vencidas</option>
              <option value="draft">Borradores</option>
            </select>

            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="Fecha inicio"
            />

            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="border border-gray-300 rounded-md px-3 py-2"
              placeholder="Fecha fin"
            />
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID / Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{quote.id}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(quote.date).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quote.client}</div>
                    <div className="text-xs text-gray-500">{quote.transportist}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-green-600" />
                      {quote.origin}
                    </div>
                    <div className="text-sm text-gray-900 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-600" />
                      {quote.destination}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getServiceBadge(quote.service)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {quote.weight.toLocaleString()} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(quote.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    €{quote.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewQuote(quote.id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleViewTracking(quote.id)}
                        className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                        title="Ver seguimiento"
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateEmail(quote.id)}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1"
                        title="Generar email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para ver detalles de cotización */}
      {showModal && selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Detalles de Cotización: {selectedQuote.quoteId}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información de Ruta */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">📍 Ruta</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Origen:</span> {selectedQuote.route?.origin}</p>
                  <p><span className="font-medium">Destino:</span> {selectedQuote.route?.destination}</p>
                  <p><span className="font-medium">Distancia:</span> {selectedQuote.route?.distance} km</p>
                  <p><span className="font-medium">Países:</span> {selectedQuote.route?.countries?.join(' → ')}</p>
                </div>
              </div>

              {/* Información de Carga */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">📦 Carga</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Tipo:</span> {selectedQuote.cargo?.type}</p>
                  <p><span className="font-medium">Peso:</span> {selectedQuote.cargo?.weight} tons</p>
                  <p><span className="font-medium">Volumen:</span> {selectedQuote.cargo?.volume} m³</p>
                  <p><span className="font-medium">Valor:</span> €{selectedQuote.cargo?.value?.toLocaleString()}</p>
                </div>
              </div>

              {/* Información del Cliente */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">🏢 Cliente</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Empresa:</span> {selectedQuote.client?.company || 'N/A'}</p>
                  <p><span className="font-medium">Email:</span> {selectedQuote.client?.email || 'N/A'}</p>
                  <p><span className="font-medium">Estado:</span> {getStatusBadge(selectedQuote.status)}</p>
                  <p><span className="font-medium">Confianza:</span> {selectedQuote.confidence}%</p>
                </div>
              </div>

              {/* Programación */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">📅 Programación</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Días de tránsito:</span> {selectedQuote.schedule?.transitDays} días</p>
                  <p><span className="font-medium">Tipo de servicio:</span> {getServiceBadge(selectedQuote.preferences?.serviceType)}</p>
                  <p><span className="font-medium">Transportista:</span> {selectedQuote.intelligence?.recommendedTransportist}</p>
                </div>
              </div>
            </div>

            {/* Desglose de Costos */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">💰 Desglose de Costos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Subtotal</p>
                  <p className="font-bold">€{selectedQuote.costBreakdown?.subtotal?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Margen</p>
                  <p className="font-bold">€{selectedQuote.costBreakdown?.margin?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">IVA (21%)</p>
                  <p className="font-bold">€{selectedQuote.costBreakdown?.vat?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total</p>
                  <p className="font-bold text-green-600 text-lg">€{selectedQuote.costBreakdown?.total?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Información de Inteligencia */}
            {selectedQuote.intelligence && (
              <div className="mt-6 bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">🧠 Análisis de IA</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Fuentes consultadas</p>
                    <p className="font-bold">{selectedQuote.intelligence.sourcesConsulted}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tiempo de procesamiento</p>
                    <p className="font-bold">{selectedQuote.intelligence.processingTime}ms</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Margen comercial</p>
                    <p className="font-bold">{selectedQuote.intelligence.commercialMargin}%</p>
                  </div>
                </div>
                {selectedQuote.intelligence.luc1Reasoning && (
                  <div className="mt-3">
                    <p className="text-gray-600 text-sm">Razonamiento LUC1:</p>
                    <p className="text-sm italic">{selectedQuote.intelligence.luc1Reasoning}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seguimiento */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Seguimiento de Cotización</h3>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Timeline de Eventos</h4>
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

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Plantilla de Email Generada</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email para copiar y enviar:
                </label>
                <div className="relative">
                  <textarea
                    value={emailTemplate}
                    readOnly
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(emailTemplate)}
                    className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Copiar Email
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
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Copiar URL
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

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md hover:bg-gray-600"
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

export default QuoteHistory;