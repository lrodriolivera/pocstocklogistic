// Mock Data Service - Replace with real API calls when backend is ready

export const mockDataService = {
  // Get quote history
  getQuoteHistory: async (filters = {}) => {
    await simulateDelay();

    const quotes = generateMockQuotes(50);

    // Apply filters
    let filtered = quotes;
    if (filters.status) {
      filtered = filtered.filter(q => q.status === filters.status);
    }
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(q => {
        const date = new Date(q.date);
        return date >= new Date(filters.startDate) && date <= new Date(filters.endDate);
      });
    }

    return filtered;
  },

  // Get client list
  getClients: async (searchTerm = '') => {
    await simulateDelay();

    const clients = generateMockClients(25);

    if (searchTerm) {
      return clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return clients;
  },

  // Get report data
  getReportData: async (reportType, timeRange) => {
    await simulateDelay();

    return {
      monthlyRevenue: generateMonthlyRevenue(),
      routeDistribution: generateRouteDistribution(),
      serviceTypes: generateServiceTypes(),
      topClients: generateTopClients(),
      topRoutes: generateTopRoutes(),
      kpis: generateKPIs()
    };
  },

  // Create new quote
  createQuote: async (quoteData) => {
    await simulateDelay();

    return {
      id: `Q-${Date.now()}`,
      ...quoteData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
  },

  // Update client
  updateClient: async (clientId, clientData) => {
    await simulateDelay();

    return {
      id: clientId,
      ...clientData,
      updatedAt: new Date().toISOString()
    };
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    await simulateDelay();

    return {
      totalQuotes: 451,
      activeShipments: 23,
      totalClients: 87,
      monthlyRevenue: 125000,
      recentActivity: generateRecentActivity(),
      performanceMetrics: {
        onTimeDelivery: 94.3,
        customerSatisfaction: 4.7,
        avgResponseTime: 2.5
      }
    };
  }
};

// Helper functions
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

const generateMockQuotes = (count) => {
  const statuses = ['completed', 'pending', 'in_transit', 'cancelled'];
  const services = ['express', 'standard', 'economy'];
  const clients = ['Industrias Acme S.A.', 'Global Trade Co.', 'Tech Solutions Ltd.', 'Logistics Pro', 'Import Export SA'];
  const cities = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'París', 'Milán', 'Berlín', 'Londres', 'Amsterdam'];

  return Array.from({ length: count }, (_, i) => ({
    id: `Q-2024-${String(i + 1).padStart(3, '0')}`,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    client: clients[Math.floor(Math.random() * clients.length)],
    origin: `${cities[Math.floor(Math.random() * 5)]}, España`,
    destination: `${cities[5 + Math.floor(Math.random() * 5)]}, ${['Francia', 'Italia', 'Alemania', 'Reino Unido', 'Países Bajos'][Math.floor(Math.random() * 5)]}`,
    service: services[Math.floor(Math.random() * services.length)],
    weight: Math.floor(Math.random() * 5000) + 500,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    total: Math.floor(Math.random() * 8000) + 2000,
    transportist: ['Timocom', 'Trans.eu', 'Teleroute', 'CargoMarket'][Math.floor(Math.random() * 4)]
  }));
};

const generateMockClients = (count) => {
  const types = ['PYME', 'Empresa', 'Multinacional'];
  const statuses = ['active', 'inactive', 'premium'];

  return Array.from({ length: count }, (_, i) => ({
    id: `C${String(i + 1).padStart(3, '0')}`,
    name: `Cliente ${i + 1} S.A.`,
    type: types[Math.floor(Math.random() * types.length)],
    email: `cliente${i + 1}@example.com`,
    phone: `+34 9${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    address: `Calle ${['Mayor', 'Gran Vía', 'Diagonal', 'Sierpes'][Math.floor(Math.random() * 4)]} ${Math.floor(Math.random() * 500)}, ${['Madrid', 'Barcelona', 'Valencia', 'Sevilla'][Math.floor(Math.random() * 4)]}`,
    country: 'España',
    registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    totalQuotes: Math.floor(Math.random() * 100),
    totalRevenue: Math.floor(Math.random() * 200000) + 10000,
    lastQuote: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: statuses[Math.floor(Math.random() * statuses.length)]
  }));
};

const generateMonthlyRevenue = () => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
  return months.map(month => ({
    month,
    revenue: Math.floor(Math.random() * 50000) + 75000,
    quotes: Math.floor(Math.random() * 30) + 35
  }));
};

const generateRouteDistribution = () => {
  const countries = ['Francia', 'Alemania', 'Italia', 'Reino Unido', 'Países Bajos'];
  const values = [35, 28, 18, 12, 7];
  return countries.map((country, i) => ({
    country,
    value: values[i],
    percentage: values[i]
  }));
};

const generateServiceTypes = () => [
  { name: 'Express', value: 45, color: '#8b5cf6' },
  { name: 'Standard', value: 35, color: '#3b82f6' },
  { name: 'Economy', value: 20, color: '#6b7280' }
];

const generateTopClients = () => [
  { name: 'Import Export SA', quotes: 52, revenue: 145000 },
  { name: 'Industrias Acme S.A.', quotes: 45, revenue: 125000 },
  { name: 'Cargo Masters', quotes: 38, revenue: 112000 },
  { name: 'Global Trade Co.', quotes: 32, revenue: 98000 },
  { name: 'Tech Solutions Ltd.', quotes: 28, revenue: 75000 }
];

const generateTopRoutes = () => [
  { route: 'Madrid - París', count: 28, avgPrice: 3450 },
  { route: 'Barcelona - Milán', count: 22, avgPrice: 5200 },
  { route: 'Valencia - Berlín', count: 18, avgPrice: 4100 },
  { route: 'Bilbao - Amsterdam', count: 15, avgPrice: 3900 },
  { route: 'Sevilla - Londres', count: 12, avgPrice: 4800 }
];

const generateKPIs = () => ({
  totalRevenue: 898000,
  totalQuotes: 451,
  avgQuoteValue: 1991,
  growthRate: 15.2,
  customerRetention: 88.5,
  onTimeDelivery: 94.3,
  avgResponseTime: 2.5,
  quoteConversionRate: 68.2
});

const generateRecentActivity = () => [
  { type: 'quote', message: 'Nueva cotización Madrid - París', time: '5 min' },
  { type: 'client', message: 'Nuevo cliente registrado', time: '15 min' },
  { type: 'delivery', message: 'Entrega completada #Q-2024-045', time: '1 hora' },
  { type: 'quote', message: 'Cotización aprobada Barcelona - Milán', time: '2 horas' }
];

export default mockDataService;