import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Download, Calendar, Filter,
  DollarSign, Package, Users, MapPin
} from 'lucide-react';

const Reports = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Simulated data
  const [data, setData] = useState({
    monthlyRevenue: [],
    routeDistribution: [],
    serviceTypes: [],
    topClients: [],
    topRoutes: [],
    kpis: {}
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock data generation
      const mockData = {
        monthlyRevenue: [
          { month: 'Ene', revenue: 85000, quotes: 42 },
          { month: 'Feb', revenue: 92000, quotes: 48 },
          { month: 'Mar', revenue: 78000, quotes: 38 },
          { month: 'Abr', revenue: 105000, quotes: 52 },
          { month: 'May', revenue: 112000, quotes: 58 },
          { month: 'Jun', revenue: 95000, quotes: 45 },
          { month: 'Jul', revenue: 118000, quotes: 62 },
          { month: 'Ago', revenue: 88000, quotes: 40 },
          { month: 'Sep', revenue: 125000, quotes: 65 }
        ],
        routeDistribution: [
          { country: 'Francia', value: 35, percentage: 35 },
          { country: 'Alemania', value: 28, percentage: 28 },
          { country: 'Italia', value: 18, percentage: 18 },
          { country: 'Reino Unido', value: 12, percentage: 12 },
          { country: 'Países Bajos', value: 7, percentage: 7 }
        ],
        serviceTypes: [
          { name: 'Express', value: 45, color: '#8b5cf6' },
          { name: 'Standard', value: 35, color: '#3b82f6' },
          { name: 'Economy', value: 20, color: '#6b7280' }
        ],
        topClients: [
          { name: 'Import Export SA', quotes: 52, revenue: 145000 },
          { name: 'Industrias Acme S.A.', quotes: 45, revenue: 125000 },
          { name: 'Cargo Masters', quotes: 38, revenue: 112000 },
          { name: 'Global Trade Co.', quotes: 32, revenue: 98000 },
          { name: 'Tech Solutions Ltd.', quotes: 28, revenue: 75000 }
        ],
        topRoutes: [
          { route: 'Madrid - París', count: 28, avgPrice: 3450 },
          { route: 'Barcelona - Milán', count: 22, avgPrice: 5200 },
          { route: 'Valencia - Berlín', count: 18, avgPrice: 4100 },
          { route: 'Bilbao - Amsterdam', count: 15, avgPrice: 3900 },
          { route: 'Sevilla - Londres', count: 12, avgPrice: 4800 }
        ],
        kpis: {
          totalRevenue: 898000,
          totalQuotes: 451,
          avgQuoteValue: 1991,
          growthRate: 15.2,
          customerRetention: 88.5,
          onTimeDelivery: 94.3,
          avgResponseTime: 2.5,
          quoteConversionRate: 68.2
        }
      };

      setData(mockData);
      setLoading(false);
    };

    fetchReportData();
  }, [timeRange]);

  const exportReport = () => {
    const reportData = {
      timeRange,
      reportType,
      generatedAt: new Date().toISOString(),
      data
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${reportType}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderOverviewReport = () => (
    <>
      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">€{data.kpis.totalRevenue.toLocaleString()}</p>
              <p className="text-sm text-green-600 mt-1">+{data.kpis.growthRate}% vs mes anterior</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cotizaciones</p>
              <p className="text-2xl font-bold text-gray-900">{data.kpis.totalQuotes}</p>
              <p className="text-sm text-gray-500 mt-1">Valor promedio: €{data.kpis.avgQuoteValue}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa de Conversión</p>
              <p className="text-2xl font-bold text-gray-900">{data.kpis.quoteConversionRate}%</p>
              <p className="text-sm text-gray-500 mt-1">De cotización a pedido</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Entregas a Tiempo</p>
              <p className="text-2xl font-bold text-gray-900">{data.kpis.onTimeDelivery}%</p>
              <p className="text-sm text-gray-500 mt-1">Tiempo resp: {data.kpis.avgResponseTime}h</p>
            </div>
            <MapPin className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Evolución de Ingresos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Ingresos (€)"
              />
              <Line
                type="monotone"
                dataKey="quotes"
                stroke="#10b981"
                strokeWidth={2}
                name="Cotizaciones"
                yAxisId="right"
              />
              <YAxis yAxisId="right" orientation="right" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Service Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Distribución por Servicio</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.serviceTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.serviceTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Clientes</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cotizaciones</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.topClients.map((client, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{client.quotes}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        €{client.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Routes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Rutas Principales</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ruta</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Envíos</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio Prom.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.topRoutes.map((route, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{route.route}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{route.count}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        €{route.avgPrice.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Route Distribution */}
      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h3 className="text-lg font-semibold mb-4">Distribución por País de Destino</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.routeDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="country" />
            <YAxis />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Bar dataKey="percentage" fill="#3b82f6" name="Porcentaje de envíos" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );

  const renderFinancialReport = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Reporte Financiero Detallado</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data.monthlyRevenue}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `€${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" name="Ingresos (€)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderOperationalReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700 mb-2">Tiempo de Respuesta Promedio</h4>
          <p className="text-3xl font-bold text-blue-600">{data.kpis.avgResponseTime}h</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700 mb-2">Entregas a Tiempo</h4>
          <p className="text-3xl font-bold text-green-600">{data.kpis.onTimeDelivery}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h4 className="font-semibold text-gray-700 mb-2">Retención de Clientes</h4>
          <p className="text-3xl font-bold text-purple-600">{data.kpis.customerRetention}%</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Métricas Operacionales por Mes</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="quotes" stroke="#10b981" strokeWidth={2} name="Cotizaciones" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />

            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="overview">Vista General</option>
              <option value="financial">Reporte Financiero</option>
              <option value="operational">Reporte Operacional</option>
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="week">Última Semana</option>
              <option value="month">Último Mes</option>
              <option value="quarter">Último Trimestre</option>
              <option value="year">Último Año</option>
            </select>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Actualizado: {new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <button
            onClick={exportReport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Exportar Reporte
          </button>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'overview' && renderOverviewReport()}
      {reportType === 'financial' && renderFinancialReport()}
      {reportType === 'operational' && renderOperationalReport()}
    </div>
  );
};

export default Reports;