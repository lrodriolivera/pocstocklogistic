import React, { useState, useEffect, useCallback } from 'react';
import { Users, Phone, Mail, MapPin, Building2, TrendingUp, Plus, Search, Edit2, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = {
  name: '',
  company: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'ES',
  taxId: '',
  notes: ''
};

const ClientManagement = () => {
  const { authFetch } = useAuth();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, totalRevenue: 0, topByRevenue: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);

      const response = await authFetch(`/api/clients?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setClients(data.data.clients);
      } else {
        showToast(data.error || 'Error cargando clientes', 'error');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      showToast('Error de conexion al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch, searchTerm]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await authFetch('/api/clients/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchClients();
    fetchStats();
  }, [fetchClients, fetchStats]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Open modal for new client
  const handleNewClient = () => {
    setEditingClient(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      country: client.country || 'ES',
      taxId: client.taxId || '',
      notes: client.notes || ''
    });
    setShowModal(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingClient;
      const url = isEdit ? `/api/clients/${editingClient._id}` : '/api/clients';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showToast(isEdit ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
        setShowModal(false);
        setEditingClient(null);
        setFormData(EMPTY_FORM);
        fetchClients();
        fetchStats();
      } else {
        showToast(data.error || 'Error guardando cliente', 'error');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Error de conexion al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete (soft delete)
  const handleDelete = async (client) => {
    try {
      const response = await authFetch(`/api/clients/${client._id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        showToast('Cliente eliminado correctamente');
        setDeleteConfirm(null);
        fetchClients();
        fetchStats();
      } else {
        showToast(data.error || 'Error eliminando cliente', 'error');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('Error de conexion al eliminar', 'error');
    }
  };

  // Form field change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Toast component
  const Toast = () => {
    if (!toast) return null;
    const isError = toast.type === 'error';
    return (
      <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${isError ? 'bg-red-600' : 'bg-green-600'}`}>
        {isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        {toast.message}
      </div>
    );
  };

  // Delete confirmation dialog
  const DeleteConfirmDialog = () => {
    if (!deleteConfirm) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar eliminacion</h3>
          <p className="text-sm text-gray-600 mb-4">
            Se desactivara el cliente <strong>{deleteConfirm.name}</strong>. Esta accion se puede revertir.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(deleteConfirm)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal form
  const ClientModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={() => { setShowModal(false); setEditingClient(null); }} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del contacto"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre de la empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+34 900 000 000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIF/CIF</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="B12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Madrid"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pais</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ES"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Direccion</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Calle, numero, codigo postal"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notas internas sobre el cliente..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => { setShowModal(false); setEditingClient(null); }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {editingClient ? 'Actualizar' : 'Crear'} Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading && clients.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast />
      <DeleteConfirmDialog />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <p className="text-sm text-gray-600">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</p>
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
              placeholder="Buscar por nombre, empresa, email o NIF..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleNewClient}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cotizaciones</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron clientes con esa busqueda' : 'No hay clientes registrados. Crea el primero.'}
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      {client.taxId && <div className="text-xs text-gray-500">{client.taxId}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{client.company || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {client.email}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          {client.phone}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.city ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          {client.city}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                      {client.totalQuotes}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${client.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {client.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(client)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(client)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && <ClientModal />}
    </div>
  );
};

export default ClientManagement;
