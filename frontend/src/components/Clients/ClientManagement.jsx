import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, MapPin, Building2, TrendingUp, Plus, Search, Edit2, Trash2 } from 'lucide-react';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulated data - Replace with API call when backend is ready
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockClients = [
        {
          id: 'C001',
          name: 'Industrias Acme S.A.',
          type: 'Empresa',
          email: 'contacto@acme.es',
          phone: '+34 91 234 5678',
          address: 'Calle Mayor 123, Madrid',
          country: 'España',
          registrationDate: '2023-01-15',
          totalQuotes: 45,
          totalRevenue: 125000,
          lastQuote: '2024-09-23',
          status: 'active'
        },
        {
          id: 'C002',
          name: 'Global Trade Co.',
          type: 'Multinacional',
          email: 'info@globaltrade.com',
          phone: '+34 93 456 7890',
          address: 'Av. Diagonal 456, Barcelona',
          country: 'España',
          registrationDate: '2023-02-20',
          totalQuotes: 32,
          totalRevenue: 98000,
          lastQuote: '2024-09-22',
          status: 'active'
        },
        {
          id: 'C003',
          name: 'Tech Solutions Ltd.',
          type: 'PYME',
          email: 'tech@solutions.es',
          phone: '+34 96 789 0123',
          address: 'Plaza España 789, Valencia',
          country: 'España',
          registrationDate: '2023-03-10',
          totalQuotes: 28,
          totalRevenue: 75000,
          lastQuote: '2024-09-21',
          status: 'active'
        },
        {
          id: 'C004',
          name: 'Logistics Pro',
          type: 'Empresa',
          email: 'admin@logisticspro.es',
          phone: '+34 95 432 1098',
          address: 'Calle Sierpes 321, Sevilla',
          country: 'España',
          registrationDate: '2023-04-05',
          totalQuotes: 18,
          totalRevenue: 52000,
          lastQuote: '2024-09-20',
          status: 'inactive'
        },
        {
          id: 'C005',
          name: 'Import Export SA',
          type: 'Multinacional',
          email: 'operations@importexport.com',
          phone: '+34 94 567 8901',
          address: 'Gran Vía 654, Bilbao',
          country: 'España',
          registrationDate: '2023-05-12',
          totalQuotes: 52,
          totalRevenue: 145000,
          lastQuote: '2024-09-19',
          status: 'active'
        },
        {
          id: 'C006',
          name: 'European Cargo',
          type: 'Empresa',
          email: 'europe@cargo.eu',
          phone: '+34 97 890 1234',
          address: 'Paseo Independencia 987, Zaragoza',
          country: 'España',
          registrationDate: '2023-06-18',
          totalQuotes: 22,
          totalRevenue: 68000,
          lastQuote: '2024-09-18',
          status: 'active'
        },
        {
          id: 'C007',
          name: 'Fast Delivery Inc.',
          type: 'PYME',
          email: 'fast@delivery.es',
          phone: '+34 95 234 5678',
          address: 'Calle Larios 147, Málaga',
          country: 'España',
          registrationDate: '2023-07-22',
          totalQuotes: 15,
          totalRevenue: 42000,
          lastQuote: '2024-09-17',
          status: 'active'
        },
        {
          id: 'C008',
          name: 'Cargo Masters',
          type: 'Empresa',
          email: 'masters@cargo.com',
          phone: '+34 96 345 6789',
          address: 'Rambla Méndez Núñez 258, Alicante',
          country: 'España',
          registrationDate: '2023-08-30',
          totalQuotes: 38,
          totalRevenue: 112000,
          lastQuote: '2024-09-16',
          status: 'premium'
        }
      ];

      setClients(mockClients);
      setLoading(false);
    };

    fetchClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    premiumClients: clients.filter(c => c.status === 'premium').length,
    totalRevenue: clients.reduce((sum, c) => sum + c.totalRevenue, 0)
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      premium: 'bg-purple-100 text-purple-800'
    };

    const labels = {
      active: 'Activo',
      inactive: 'Inactivo',
      premium: 'Premium'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const ClientModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {selectedClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Empresa
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Nombre de la empresa"
              defaultValue={selectedClient?.name}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Cliente
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option>PYME</option>
              <option>Empresa</option>
              <option>Multinacional</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="email@empresa.com"
              defaultValue={selectedClient?.email}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="+34 900 000 000"
              defaultValue={selectedClient?.phone}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="Calle, número, ciudad"
              defaultValue={selectedClient?.address}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="España"
              defaultValue={selectedClient?.country}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option>Activo</option>
              <option>Inactivo</option>
              <option>Premium</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setShowAddModal(false);
              setSelectedClient(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            {selectedClient ? 'Actualizar' : 'Crear'} Cliente
          </button>
        </div>
      </div>
    </div>
  );

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clientes Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeClients}</p>
            </div>
            <Building2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clientes Premium</p>
              <p className="text-2xl font-bold text-purple-600">{stats.premiumClients}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email o ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-500">{client.id} · {client.type}</p>
                </div>
                {getStatusBadge(client.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {client.address}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Cotizaciones</p>
                    <p className="font-semibold">{client.totalQuotes}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ingresos</p>
                    <p className="font-semibold">€{(client.totalRevenue / 1000).toFixed(0)}k</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Última</p>
                    <p className="font-semibold">{new Date(client.lastQuote).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedClient(client);
                    setShowAddModal(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && <ClientModal />}
    </div>
  );
};

export default ClientManagement;