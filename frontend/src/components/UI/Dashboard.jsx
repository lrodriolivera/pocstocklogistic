import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import AnimatedMetrics from './AnimatedMetrics';

const Dashboard = ({ onNewQuoteClick }) => {
  const [stats, setStats] = useState({
    totalQuotes: 1247,
    acceptedQuotes: 891,
    revenue: 245780,
    activeRoutes: 23,
    avgResponseTime: 12,
    clientSatisfaction: 94.2
  });

  const [previousStats] = useState({
    totalQuotes: 1105,
    revenue: 226500,
    activeRoutes: 27,
    avgResponseTime: 14,
    clientSatisfaction: 92.1
  });

  const [chartData] = useState([
    { month: 'Ene', quotes: 89, revenue: 18450 },
    { month: 'Feb', quotes: 97, revenue: 19200 },
    { month: 'Mar', quotes: 112, revenue: 23100 },
    { month: 'Abr', quotes: 128, revenue: 26800 },
    { month: 'May', quotes: 142, revenue: 31200 },
    { month: 'Jun', quotes: 156, revenue: 34500 }
  ]);

  const [pieData] = useState([
    { name: 'Económico', value: 45, color: '#10B981' },
    { name: 'Estándar', value: 35, color: '#3B82F6' },
    { name: 'Express', value: 20, color: '#8B5CF6' }
  ]);

  const [recentActivity] = useState([
    {
      id: 1,
      type: 'quote_generated',
      description: 'Nueva cotización: Madrid → Berlín',
      time: '2 min ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'quote_accepted',
      description: 'Cotización aceptada por Timber Corp',
      time: '15 min ago',
      status: 'success'
    },
    {
      id: 3,
      type: 'alert',
      description: 'Restricción detectada en ruta A7',
      time: '1 hora ago',
      status: 'warning'
    },
    {
      id: 4,
      type: 'delivery',
      description: 'Entrega completada: París → Milano',
      time: '2 horas ago',
      status: 'success'
    }
  ]);

  const StatCard = ({ title, value, change, icon: Icon, color, format }) => {
    const isPositive = change >= 0;
    const formattedValue = format === 'currency'
      ? `€${value.toLocaleString()}`
      : format === 'percentage'
      ? `${value}%`
      : value.toLocaleString();

    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex items-center mt-4">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-gray-500 ml-1">vs. mes anterior</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header del Dashboard */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Bienvenido al sistema de cotizaciones inteligente
            </p>
          </div>
          <div className="flex items-center space-x-3">
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
              Nueva Cotización
            </button>
          </div>
        </div>
      </div>

      {/* Métricas Animadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="xl:col-span-2">
          <AnimatedMetrics
            title="Cotizaciones Totales"
            value={stats.totalQuotes}
            previousValue={previousStats.totalQuotes}
            icon={BarChart3}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
        </div>
        <div className="xl:col-span-2">
          <AnimatedMetrics
            title="Ingresos del Mes"
            value={stats.revenue}
            previousValue={previousStats.revenue}
            icon={DollarSign}
            color="bg-gradient-to-r from-green-500 to-green-600"
            format="currency"
          />
        </div>
        <div className="xl:col-span-2">
          <AnimatedMetrics
            title="Rutas Activas"
            value={stats.activeRoutes}
            previousValue={previousStats.activeRoutes}
            icon={Truck}
            color="bg-gradient-to-r from-purple-500 to-purple-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatedMetrics
          title="Tiempo Respuesta Avg"
          value={stats.avgResponseTime}
          previousValue={previousStats.avgResponseTime}
          icon={Clock}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          format="time"
          suffix="s"
        />
        <AnimatedMetrics
          title="Satisfacción Cliente"
          value={stats.clientSatisfaction}
          previousValue={previousStats.clientSatisfaction}
          icon={Users}
          color="bg-gradient-to-r from-indigo-500 to-indigo-600"
          format="percentage"
        />
        <AnimatedMetrics
          title="Tasa Aceptación"
          value={(stats.acceptedQuotes / stats.totalQuotes) * 100}
          previousValue={85.2}
          icon={CheckCircle}
          color="bg-gradient-to-r from-emerald-500 to-emerald-600"
          format="percentage"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Líneas - Tendencia */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tendencia de Cotizaciones
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="quotes"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Pastel - Distribución de Servicios */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución de Servicios
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actividad Reciente y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-100' :
                  activity.status === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {activity.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : activity.status === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
            Ver todas las actividades
          </button>
        </div>

        {/* Panel de Estado del Sistema */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Estado del Sistema
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">API Backend</span>
              </div>
              <span className="text-sm text-green-600 font-medium">Operacional</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">LUC1-COMEX AI</span>
              </div>
              <span className="text-sm text-green-600 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">Base de Datos</span>
              </div>
              <span className="text-sm text-green-600 font-medium">Conectada</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-900">APIs Externas</span>
              </div>
              <span className="text-sm text-yellow-600 font-medium">Limitado</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Uptime:</strong> 99.97% • <strong>Respuesta Avg:</strong> 245ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;