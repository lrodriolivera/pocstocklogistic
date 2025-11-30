import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../UI/LoadingSpinner';
import NegotiationPanel from '../Negotiations/NegotiationPanel';

const Dashboard = () => {
  const { authFetch, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await authFetch('/api/users/dashboard/statistics');
      if (!response.ok) {
        throw new Error('Error al obtener datos del dashboard');
      }
      const data = await response.json();
      setDashboardData(data.data);
    } catch (error) {
      toast.error(error.message || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar dashboard</h2>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendiente': return 'text-yellow-600 bg-yellow-50';
      case 'en_progreso': return 'text-blue-600 bg-blue-50';
      case 'completado': return 'text-green-600 bg-green-50';
      case 'rechazado': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pendiente': return <Clock className="w-4 h-4" />;
      case 'en_progreso': return <Activity className="w-4 h-4" />;
      case 'completado': return <CheckCircle className="w-4 h-4" />;
      case 'rechazado': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue" }) => (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {trend.value}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`w-8 h-8 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Gestión</h1>
            <p className="text-gray-600">Vista general del sistema de cotizaciones</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Usuarios"
            value={dashboardData.overview.totalUsers}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Total Cotizaciones"
            value={dashboardData.overview.totalQuotes}
            icon={FileText}
            color="green"
          />
          <StatCard
            title="Valor Total"
            value={`€${dashboardData.quotes.byStatus.reduce((sum, quote) => sum + (quote.totalValue || 0), 0).toLocaleString()}`}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="Actividad Hoy"
            value={dashboardData.recentActivity.filter(activity =>
              new Date(activity.createdAt).toDateString() === new Date().toDateString()
            ).length}
            icon={Activity}
            color="orange"
          />
        </div>

        {/* Negotiation Panel */}
        <div className="mb-8">
          <NegotiationPanel />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Users by Role */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Usuarios por Rol</h2>
              <PieChart className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              {dashboardData.users.byRole.map(role => (
                <div key={role._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="font-medium capitalize">
                      {role._id === 'agente_comercial' ? 'Agentes Comerciales' :
                       role._id === 'supervisor' ? 'Supervisores' :
                       role._id === 'alta_gerencia' ? 'Alta Gerencia' : role._id}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{role.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quotes by Status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Cotizaciones por Estado</h2>
              <BarChart3 className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              {dashboardData.quotes.byStatus.map(status => (
                <div key={status._id} className="flex items-center justify-between p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg mr-3 ${getStatusColor(status._id)}`}>
                      {getStatusIcon(status._id)}
                    </div>
                    <div>
                      <span className="font-medium capitalize">
                        {status._id === 'pendiente' ? 'Pendientes' :
                         status._id === 'en_progreso' ? 'En Progreso' :
                         status._id === 'completado' ? 'Completadas' :
                         status._id === 'rechazado' ? 'Rechazadas' : status._id}
                      </span>
                      <p className="text-sm text-gray-500">
                        €{(status.totalValue || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
            <Calendar className="w-6 h-6 text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">ID Cotización</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Ruta</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Asignado a</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recentActivity.map((quote, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{quote.quoteId}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {getStatusIcon(quote.status)}
                        <span className="ml-1 capitalize">
                          {quote.status === 'pendiente' ? 'Pendiente' :
                           quote.status === 'en_progreso' ? 'En Progreso' :
                           quote.status === 'completado' ? 'Completada' :
                           quote.status === 'rechazado' ? 'Rechazada' : quote.status}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {quote.route.origin} → {quote.route.destination}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      €{quote['costBreakdown.total'] ? quote['costBreakdown.total'].toLocaleString() : '0'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {quote.tracking?.assignedTo ?
                        `${quote.tracking.assignedTo.firstName} ${quote.tracking.assignedTo.lastName}` :
                        'Sin asignar'
                      }
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(quote.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;