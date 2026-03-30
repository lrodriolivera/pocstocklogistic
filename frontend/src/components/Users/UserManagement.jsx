import React, { useState, useEffect, useCallback } from 'react';
import { Users, Mail, Phone, Plus, Search, Edit2, Trash2, X, AlertCircle, CheckCircle, Shield, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'agente_comercial',
  department: 'Comercial',
  phone: ''
};

const ROLE_LABELS = {
  agente_comercial: 'Agente Comercial',
  supervisor: 'Supervisor',
  alta_gerencia: 'Alta Gerencia'
};

const ROLE_COLORS = {
  agente_comercial: 'bg-blue-100 text-blue-800',
  supervisor: 'bg-yellow-100 text-yellow-800',
  alta_gerencia: 'bg-red-100 text-red-800'
};

const UserManagement = () => {
  const { authFetch, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch('/api/users');
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
      } else {
        showToast(data.error || 'Error cargando usuarios', 'error');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Error de conexion al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter users by search
  const filteredUsers = users.filter(u => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term) ||
      (ROLE_LABELS[u.role] || u.role).toLowerCase().includes(term)
    );
  });

  // Open modal for new user
  const handleNewUser = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };

  // Open modal for editing
  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '', // Don't show password for edits
      role: user.role || 'agente_comercial',
      department: user.department || 'Comercial',
      phone: user.phone || ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'Nombre es requerido';
    if (!formData.lastName.trim()) errors.lastName = 'Apellido es requerido';
    if (!formData.email.trim()) errors.email = 'Email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email no valido';
    if (!editingUser && !formData.password) errors.password = 'Contrasena es requerida para nuevos usuarios';
    if (!editingUser && formData.password && formData.password.length < 8) errors.password = 'Minimo 8 caracteres';
    return errors;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingUser;

      if (isEdit) {
        // Update user
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          department: formData.department,
          role: formData.role
        };

        const response = await authFetch(`/api/users/${editingUser._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
          showToast('Usuario actualizado correctamente');
          setShowModal(false);
          setEditingUser(null);
          fetchUsers();
        } else {
          showToast(data.error || 'Error actualizando usuario', 'error');
        }
      } else {
        // Create user via authenticated register endpoint
        const createData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          department: formData.department,
          phone: formData.phone || undefined
        };

        const response = await authFetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData)
        });

        const data = await response.json();

        if (data.success) {
          showToast('Usuario creado correctamente');
          setShowModal(false);
          setFormData(EMPTY_FORM);
          fetchUsers();
        } else {
          showToast(data.error || 'Error creando usuario', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      showToast('Error de conexion al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Deactivate user (soft delete)
  const handleDeactivate = async (user) => {
    try {
      const response = await authFetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Usuario desactivado correctamente');
        setDeleteConfirm(null);
        fetchUsers();
      } else {
        showToast(data.error || 'Error desactivando usuario', 'error');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      showToast('Error de conexion al desactivar', 'error');
    }
  };

  // Reactivate user
  const handleReactivate = async (user) => {
    try {
      const response = await authFetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      });

      const data = await response.json();

      if (data.success) {
        showToast('Usuario reactivado correctamente');
        fetchUsers();
      } else {
        showToast(data.error || 'Error reactivando usuario', 'error');
      }
    } catch (error) {
      console.error('Error reactivating user:', error);
      showToast('Error de conexion', 'error');
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const byRole = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

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

  // Delete confirmation
  const DeleteConfirmDialog = () => {
    if (!deleteConfirm) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar desactivacion</h3>
          <p className="text-sm text-gray-600 mb-4">
            Se desactivara el usuario <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong> ({deleteConfirm.email}). El usuario no podra iniciar sesion pero se conservaran sus datos.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDeactivate(deleteConfirm)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              Desactivar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // User modal form
  const UserModal = () => {
    const isGerencia = currentUser?.role === 'alta_gerencia';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <button onClick={() => { setShowModal(false); setEditingUser(null); }} className="text-gray-400 hover:text-gray-600">
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
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={`w-full border ${formErrors.firstName ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Nombre"
                  required
                />
                {formErrors.firstName && <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={`w-full border ${formErrors.lastName ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Apellido"
                  required
                />
                {formErrors.lastName && <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={!!editingUser}
                  className={`w-full border ${formErrors.email ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingUser ? 'bg-gray-100' : ''}`}
                  placeholder="email@empresa.com"
                  required
                />
                {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contrasena <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className={`w-full border ${formErrors.password ? 'border-red-300' : 'border-gray-300'} rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Minimo 8 caracteres"
                    required
                  />
                  {formErrors.password && <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  disabled={!isGerencia}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!isGerencia ? 'bg-gray-100' : ''}`}
                >
                  <option value="agente_comercial">Agente Comercial</option>
                  <option value="supervisor">Supervisor</option>
                  {isGerencia && <option value="alta_gerencia">Alta Gerencia</option>}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Comercial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingUser(null); }}
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
                {editingUser ? 'Actualizar' : 'Crear'} Usuario
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading && users.length === 0) {
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Agentes</p>
              <p className="text-2xl font-bold text-blue-600">{byRole.agente_comercial || 0}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Supervisores</p>
              <p className="text-2xl font-bold text-yellow-600">{(byRole.supervisor || 0) + (byRole.alta_gerencia || 0)}</p>
            </div>
            <Shield className="h-8 w-8 text-yellow-500" />
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
              placeholder="Buscar por nombre, email, rol o departamento..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleNewUser}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimo Acceso</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron usuarios con esa busqueda' : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
                      {u.employeeId && <div className="text-xs text-gray-500">{u.employeeId}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {u.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {u._id !== currentUser?.id && (
                          u.isActive ? (
                            <button
                              onClick={() => setDeleteConfirm(u)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Desactivar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(u)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title="Reactivar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )
                        )}
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
      {showModal && <UserModal />}
    </div>
  );
};

export default UserManagement;
