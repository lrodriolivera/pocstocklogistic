import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  Trophy,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import NegotiationPanel from '../Negotiations/NegotiationPanel';

const STATUS_COLORS = {
  active: '#3B82F6',
  accepted: '#10B981',
  rejected: '#EF4444',
  expired: '#9CA3AF',
  sent: '#8B5CF6',
  viewed: '#F59E0B',
  draft: '#6B7280',
  negotiating: '#F97316'
};

const STATUS_LABELS = {
  active: 'Activa',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  sent: 'Enviada',
  viewed: 'Vista',
  draft: 'Borrador',
  negotiating: 'Negociando'
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const Dashboard = ({ onNewQuoteClick }) => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overviewData, setOverviewData] = useState(null);
  const [chartsData, setChartsData] = useState(null);

  const fetchData = async () => {
    try {
      const [overviewRes, chartsRes] = await Promise.all([
        authFetch('/api/quotes/statistics/overview').catch(() => null),
        authFetch('/api/quotes/statistics/charts')
      ]);

      if (chartsRes && chartsRes.ok) {
        const chartsJson = await chartsRes.json();
        setChartsData(chartsJson.data);
      }

      if (overviewRes && overviewRes.ok) {
        const overviewJson = await overviewRes.json();
        setOverviewData(overviewJson.data);
      }
    } catch (error) {
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Compute stats from charts data
  const totalQuotes = chartsData?.byStatus?.reduce((sum, s) => sum + s.count, 0) || 0;
  const acceptedCount = chartsData?.byStatus?.find(s => s.status === 'accepted')?.count || 0;
  const totalRevenue = chartsData?.recentQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;
  const conversionRate = totalQuotes > 0 ? ((acceptedCount / totalQuotes) * 100).toFixed(1) : '0.0';

  // Use overview data if available for more accurate stats
  const overviewTotal = overviewData ? overviewData.reduce((sum, s) => sum + s.count, 0) : totalQuotes;
  const overviewAccepted = overviewData ? (overviewData.find(s => s._id === 'accepted')?.count || 0) : acceptedCount;
  const overviewRevenue = overviewData ? (overviewData.find(s => s._id === 'accepted')?.totalValue || 0) : totalRevenue;
  const overviewConversion = overviewTotal > 0 ? ((overviewAccepted / overviewTotal) * 100).toFixed(1) : '0.0';

  // Format monthly chart data
  const monthlyChartData = (chartsData?.monthlyQuotes || []).map(item => {
    const [year, month] = item.month.split('-');
    return {
      name: `${MONTH_NAMES[parseInt(month) - 1]} ${year.slice(2)}`,
      cotizaciones: item.count,
      revenue: item.revenue
    };
  });

  // Format pie chart data
  const pieChartData = (chartsData?.byStatus || [])
    .filter(s => s.count > 0)
    .map(s => ({
      name: STATUS_LABELS[s.status] || s.status,
      value: s.count,
      color: STATUS_COLORS[s.status] || '#6B7280'
    }));

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
      sent: 'bg-purple-100 text-purple-700',
      viewed: 'bg-yellow-100 text-yellow-700',
      draft: 'bg-gray-100 text-gray-600',
      negotiating: 'bg-orange-100 text-orange-700'
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Bienvenido al sistema de cotizaciones inteligente
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-3 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                LUC1-COMEX Activo
              </div>
            </div>
            <button
              onClick={onNewQuoteClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nueva Cotizacion
            </button>
          </div>
        </div>
      </div>

      {/* Negotiation Panel */}
      <NegotiationPanel />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Cotizaciones</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewTotal.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cotizaciones Aceptadas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewAccepted.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{'\u20AC'}{overviewRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-500">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasa de Conversion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewConversion}%</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Monthly Quotes */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cotizaciones por Mes</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'cotizaciones') return [value, 'Cotizaciones'];
                    return [`${'\u20AC'}${value.toLocaleString()}`, 'Revenue'];
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="cotizaciones" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Sin datos de cotizaciones</p>
              </div>
            </div>
          )}
        </div>

        {/* Pie Chart - Quotes by Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Cotizaciones por Estado</h3>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#d1d5db' }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, 'Cotizaciones']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <PieChartIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Sin datos de estado</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          {chartsData?.recentQuotes?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {chartsData.recentQuotes.map((quote, index) => (
                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-2 text-sm font-mono text-gray-700">
                        {quote.quoteId?.slice(0, 12) || '-'}
                      </td>
                      <td className="py-3 px-2">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-700 truncate max-w-[150px]">
                        {quote.company || '-'}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium text-gray-900">
                        {'\u20AC'}{(quote.total || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-500">
                        {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-ES') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Sin cotizaciones recientes</p>
            </div>
          )}
        </div>

        {/* Top Agents Leaderboard */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Agentes</h3>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          {chartsData?.topAgents?.length > 0 ? (
            <div className="space-y-4">
              {chartsData.topAgents.map((agent, index) => {
                const initials = agent.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                const bgColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 text-sm font-bold text-gray-400">
                      {index + 1}
                    </div>
                    <div className={`w-10 h-10 rounded-full ${bgColors[index % bgColors.length]} flex items-center justify-center text-white text-sm font-bold`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.count} cotizaciones aceptadas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{'\u20AC'}{agent.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Sin datos de agentes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
